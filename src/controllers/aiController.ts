import { Request, Response } from 'express';
import { aiService } from '../services/aiService';
import cache from '../utils/cache';
import logger from '../utils/logger';
import api from '../services/dolarApiService'; // Fetch from actual services
import cryptoYaService from '../services/cryptoYaService';

export class AIController {
    async getInsight(req: Request, res: Response): Promise<void> {
        try {
            const cacheKey = 'daily_ai_insight';
            const cachedInsight = cache.get<string>(cacheKey);

            if (cachedInsight) {
                res.json({ insight: cachedInsight, cached: true });
                return;
            }

            // Recopilar datos de mercado completos para el prompt
            const [dolaresArray, cryptoAsk] = await Promise.all([
                api.getAllDollars(),
                cryptoYaService.getBinanceP2P()
            ]);

            let blue: any, mep: any;
            dolaresArray.forEach((d: any) => {
                if (d.casa === 'blue') blue = d;
                if (d.casa === 'bolsa') mep = d;
            });

            // Simplificar y estructurar datos para la IA
            const promptData = {
                dolarBlueVenta: blue?.venta || 0,
                dolarMepVenta: mep?.venta || 0,
                dolarCriptoAsk: cryptoAsk?.ask || 0,
                brechaMepBlue: mep?.venta && blue?.venta ?
                    (((blue.venta - mep.venta) / mep.venta) * 100).toFixed(1) + "%" : "N/A"
            };

            const insight = await aiService.generateMarketInsight(promptData);

            // Cachear el insight por 30 minutos para no exceder cuotas de la API gratis
            if (!insight.includes("modo offline")) {
                cache.set(cacheKey, insight, 1000 * 60 * 30);
            }

            res.json({ insight, cached: false });
        } catch (error) {
            logger.error('Error in AIController.getInsight:', error);
            res.status(500).json({ error: 'Failed to generate insight' });
        }
    }

    async getChartInsight(req: Request, res: Response): Promise<void> {
        try {
            const { labels, values, assetName } = req.body;
            if (!labels || !values || !assetName) {
                res.status(400).json({ error: 'Faltan parámetros de gráfico' });
                return;
            }

            // Para no pasar 365 días a Gemini, tomamos los últimos 30 días
            const recentLabels = labels.slice(-30);
            const recentValues = values.slice(-30);

            const promptData = {
                activo: assetName,
                historial_reciente: recentLabels.map((l: string, idx: number) => `${l}: ${recentValues[idx]}`).join(', '),
                precio_actual: recentValues[recentValues.length - 1],
                precio_hace_30_dias: recentValues[0]
            };

            const insight = await aiService.generateMarketInsight(promptData);
            res.json({ insight });
        } catch (error) {
            logger.error('Error in AIController.getChartInsight:', error);
            res.status(500).json({ error: 'Error analizando gráfico' });
        }
    }

    async getRuloDelDia(_req: Request, res: Response): Promise<void> {
        try {
            const CACHE_KEY = 'rulo_del_dia';
            const cached = cache.get<string>(CACHE_KEY);
            if (cached) { res.json({ rulo: cached, cached: true }); return; }

            const [dolaresArray, cryptoAsk] = await Promise.all([
                api.getAllDollars(),
                cryptoYaService.getBinanceP2P(),
            ]);

            let blue: any, mep: any, ccl: any, oficial: any;
            dolaresArray.forEach((d: any) => {
                if (d.casa === 'blue') blue = d;
                if (d.casa === 'bolsa') mep = d;
                if (d.casa === 'contadoconliqui') ccl = d;
                if (d.casa === 'oficial') oficial = d;
            });

            const brecha = blue && oficial ? (((blue.venta - oficial.venta) / oficial.venta) * 100).toFixed(1) : 'N/A';
            const spreadMepBlue = blue && mep ? (((blue.compra - mep.venta) / mep.venta) * 100).toFixed(1) : 'N/A';

            const marketData = {
                fecha: new Date().toLocaleDateString('es-AR'),
                dolarBlueVenta: blue?.venta,
                dolarMepVenta: mep?.venta,
                dolarCclVenta: ccl?.venta,
                dolarOficialVenta: oficial?.venta,
                dolarCriptoAsk: cryptoAsk?.ask,
                brechaOficialBlue: `${brecha}%`,
                spreadMepBlue: `${spreadMepBlue}%`,
            };

            const prompt = `Sos Rulo Bot, un analista de mercado cambiario argentino experto. En base a los datos del día, escribí UN SOLO párrafo (máximo 3 oraciones) que responda: ¿cuál es la mejor oportunidad de hoy entre los distintos tipos de cambio? Sé directo, útil y usá emojis para enfatizar. Hablale al usuario en segunda persona. Incluí los números más relevantes. No uses markdown.

Datos: ${JSON.stringify(marketData, null, 2)}`;

            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await model.generateContent(prompt);
            const rulo = result.response.text().trim();

            cache.set(CACHE_KEY, rulo, 60 * 60 * 1000); // 1 hora
            res.json({ rulo, cached: false });
        } catch (err) {
            logger.error('getRuloDelDia error:', err);
            res.json({ rulo: '💡 El análisis del día no está disponible en este momento. Verificá tu API key de Gemini.', cached: false });
        }
    }
}

export const aiController = new AIController();
