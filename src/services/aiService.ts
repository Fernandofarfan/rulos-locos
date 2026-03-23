import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger';

export class AIService {
    private genAI: GoogleGenerativeAI | null = null;
    private fallbackMessage = "💡 Actualmente la IA de Rulos Locos está en modo offline. Ingresá tu clave de API de Gemini en la configuración del servidor para activar el Analista de Mercado en tiempo real.";

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            logger.info('🤖 IA Gemini inicializada correctamente.');
        } else {
            logger.warn('⚠️ No se encontró GEMINI_API_KEY. El analista IA funcionará en modo fallback.');
        }
    }

    async generateMarketInsight(marketData: any): Promise<string> {
        if (!this.genAI) {
            return this.fallbackMessage;
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const prompt = `
Sos un Analista Financiero Senior argentino experto en macroeconomía y arbitraje financiero.
Específicamente trabajás para una app llamada "Rulos Locos".
Tu trabajo es escribir un reporte diario ultra-breve, directo e inteligente sobre el mercado cambiario, pensado para un pequeño inversor.

REGLAS:
1. Sé extremadamente breve (máximo 4 oraciones).
2. Tono: Profesional, inteligente, pero cercano y coloquial argentino. Usa algún emoji.
3. Analiza los datos que te proveo. Destaca la oportunidad más obvia o el riesgo principal.
4. Si la "BrechaBlueVsConvergencia" es muy grande, mencionalo de forma entendible.
5. NO le hables a una máquina, háblale directo al usuario de la app.

DATOS DE MERCADO ACTUALES:
${JSON.stringify(marketData, null, 2)}
            `;

            const result = await model.generateContent(prompt);
            const response = result.response;
            return response.text();
        } catch (error) {
            logger.error('Error al generar insight con Gemini:', error);
            return "💥 Hubo un fallo en los servidores de IA de Rulos Locos en este momento. Volvé a intentar más tarde.";
        }
    }
}

export const aiService = new AIService();
