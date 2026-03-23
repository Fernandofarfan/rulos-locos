import { Request, Response } from 'express';
import arbitrageService from '../services/arbitrageService';
import logger from '../utils/logger';
import cache from '../utils/cache';
import * as spreadHistory from '../utils/spreadHistory';
import type { ArbitrageResult } from '../services/arbitrageService';

// Cargar historial persistido al arrancar
spreadHistory.load();

class ArbitrageController {
    async getArbitrage(_req: Request, res: Response): Promise<void> {
        try {
            let result: ArbitrageResult;
            const cachedData = cache.get<ArbitrageResult>('arbitrage_data');
            if (cachedData) {
                result = cachedData;
            } else {
                result = await arbitrageService.calculateArbitrage();
                cache.set('arbitrage_data', result, 60000);
            }

            // Calcular spread Blue vs MEP para historial
            if (result.dolares?.blue && result.dolares?.mep) {
                const blueBid = parseFloat(String(result.dolares.blue.compra));
                const mepAsk = parseFloat(String(result.dolares.mep.venta));
                if (blueBid > 0 && mepAsk > 0) {
                    const spread = ((blueBid / mepAsk) - 1) * 100;
                    const now = new Date();
                    spreadHistory.append({
                        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        value: parseFloat(spread.toFixed(2)),
                        timestamp: now.getTime(),
                    });
                }
            }

            res.json({ ...result, history: spreadHistory.getAll(), cached: !!cachedData });
        } catch (error) {
            logger.error('Error en ArbitrageController.getArbitrage: %s', (error as Error).stack);
            res.json({
                dolares: {
                    blue: { compra: 1150, venta: 1180, casa: 'blue', nombre: 'Blue' },
                    oficial: { compra: 1040, venta: 1090, casa: 'oficial', nombre: 'Oficial' },
                    mep: { compra: 1110, venta: 1135, casa: 'bolsa', nombre: 'MEP' },
                    ccl: { compra: 1190, venta: 1210, casa: 'contadoconliqui', nombre: 'CCL' },
                },
                cryptos: {},
                opportunities: [],
                history: spreadHistory.getAll(),
                timestamp: new Date().toISOString(),
                error: true,
            });
        }
    }

    async getBestRulo(_req: import('express').Request, res: import('express').Response): Promise<void> {
        try {
            const CACHE_KEY = 'best_rulo';
            const cached = cache.get<object>(CACHE_KEY);
            if (cached) { res.json(cached); return; }

            const result = await arbitrageService.calculateArbitrage();
            const d = result.dolares;
            const blue = d.blue, mep = d.mep, ccl = d.ccl, oficial = d.oficial;

            interface Candidate {
                score: number;
                tipo: string;
                descripcion: string;
                pasos: string[];
                rentabilidadNeta: number;
                capital: number;
                gananciaEstimada: number;
                riesgo: 'BAJO' | 'MEDIO' | 'ALTO';
                tiempo: string;
            }

            const candidates: Candidate[] = [];
            const COMISION = 0.02; // 2% comisiones estimadas totales

            // Blue → MEP
            if (blue?.compra && mep?.venta && blue.compra > mep.venta) {
                const rentBruta = ((blue.compra - mep.venta) / mep.venta) * 100;
                const rentNeta = rentBruta - COMISION * 100;
                if (rentNeta > 0) candidates.push({
                    score: Math.min(100, Math.round(rentNeta * 8)),
                    tipo: 'MEP → Blue',
                    descripcion: 'Comprar USD MEP y vender en Blue (mayor precio por billete físico)',
                    pasos: ['Comprar USD MEP', 'Retirar billetes', 'Vender en cueva Blue'],
                    rentabilidadNeta: parseFloat(rentNeta.toFixed(2)),
                    capital: 100000,
                    gananciaEstimada: parseFloat((100000 * rentNeta / 100).toFixed(0)),
                    riesgo: 'MEDIO',
                    tiempo: '1-2 días hábiles',
                });
            }

            // Oficial → Blue (brecha)
            if (oficial?.venta && blue?.venta) {
                const brecha = ((blue.venta - oficial.venta) / oficial.venta) * 100;
                const rentNeta = brecha - COMISION * 100;
                if (rentNeta > 5) candidates.push({
                    score: Math.min(100, Math.round(rentNeta * 2.5)),
                    tipo: 'Comprar Oficial → Vender Blue',
                    descripcion: `Brecha cambiaria: comprar oficial ($${oficial.venta}) y vender en blue ($${blue.venta})`,
                    pasos: ['Comprar USD Oficial', 'Vender USD Blue'],
                    rentabilidadNeta: parseFloat(rentNeta.toFixed(2)),
                    capital: 200000,
                    gananciaEstimada: parseFloat((200000 * rentNeta / 100).toFixed(0)),
                    riesgo: 'ALTO',
                    tiempo: 'Inmediato (riesgo regulatorio)',
                });
            }

            // MEP → CCL (arbitraje bursátil)
            if (mep?.venta && ccl?.venta && ccl.venta > mep.venta) {
                const rentBruta = ((ccl.venta - mep.venta) / mep.venta) * 100;
                const rentNeta = rentBruta - COMISION * 100 * 1.5;
                if (rentNeta > 0) candidates.push({
                    score: Math.min(100, Math.round(rentNeta * 10)),
                    tipo: 'MEP → CCL (parking)',
                    descripcion: 'Comprar AL30 con ARS, en 24h vender AL30 en USD Cable',
                    pasos: ['Comprar AL30 en ARS (MEP)', 'Esperar 24h', 'Vender AL30 en USD (CCL)'],
                    rentabilidadNeta: parseFloat(rentNeta.toFixed(2)),
                    capital: 500000,
                    gananciaEstimada: parseFloat((500000 * rentNeta / 100).toFixed(0)),
                    riesgo: 'BAJO',
                    tiempo: '24-48h (parking bursátil)',
                });
            }

            // Best = highest score
            candidates.sort((a, b) => b.score - a.score);
            const best = candidates[0] ?? {
                score: 0, tipo: 'Sin oportunidades', descripcion: 'Los spreads actuales no generan arbitraje rentable.',
                pasos: ['Esperá mejor momento'], rentabilidadNeta: 0, capital: 0, gananciaEstimada: 0,
                riesgo: 'MEDIO' as const, tiempo: 'N/A',
            };

            cache.set(CACHE_KEY, best, 60_000);
            res.json(best);
        } catch (err) {
            logger.error('getBestRulo error:', err);
            res.status(500).json({ error: 'Error calculando mejor rulo' });
        }
    }
}

export default new ArbitrageController();
