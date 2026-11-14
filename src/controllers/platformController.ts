import { Request, Response } from 'express';
import config from '../config';
import cache from '../utils/cache';
import logger from '../utils/logger';

interface PlatformResult {
    id: string;
    name: string;
    icon: string;
    ask: number | null;
    bid: number | null;
    available: boolean;
    error?: string;
    source?: string;
    isEstimated?: boolean;
    updatedAt?: string;
}

class PlatformController {
    async getPlatforms(_req: Request, res: Response): Promise<void> {
        try {
            const cachedData = await cache.get<{ available: PlatformResult[]; unavailable: PlatformResult[]; count: number; timestamp?: string }>('platforms_data');
            if (cachedData) {
                res.json({ platforms: cachedData, cached: true, timestamp: cachedData.timestamp, updatedAt: cachedData.timestamp });
                return;
            }

            const exchanges = [
                { id: 'binancep2p',   name: 'Binance P2P',  icon: '🟡' },
                { id: 'ripio',        name: 'Ripio',        icon: '🔵' },
                { id: 'buenbit',      name: 'Buenbit',      icon: '🟢' },
                { id: 'letsbit',      name: "Let'sBit",     icon: '🟠' },
                { id: 'lemoncash',    name: 'Lemon',        icon: '🟡' },
                { id: 'satoshitango', name: 'SatoshiTango', icon: '🟣' },
            ];

            const promises = exchanges.map(async (exchange): Promise<PlatformResult> => {
                try {
                    const response = await fetch(`${config.API_URLS.CRIPTOYA}/${exchange.id}/USDT/ARS/1`, {
                        headers: config.DEFAULT_HEADERS,
                        signal: AbortSignal.timeout(5000),
                    } as Parameters<typeof fetch>[1]);
                    if (!response.ok) throw new Error(`Error en ${exchange.name}`);
                    const data = await response.json() as { ask?: string | number; bid?: string | number; time?: number };
                    return {
                        id: exchange.id, name: exchange.name, icon: exchange.icon,
                        ask: parseFloat(String(data.ask)) || null,
                        bid: parseFloat(String(data.bid)) || null,
                        available: !!(data.ask && data.bid),
                        source: 'CriptoYa', isEstimated: false, updatedAt: data.time ? new Date(data.time * 1000).toISOString() : undefined,
                    };
                } catch (error) {
                    return { id: exchange.id, name: exchange.name, icon: exchange.icon, ask: null, bid: null, available: false, error: (error as Error).message };
                }
            });

            const results = await Promise.all(promises);
            const available = results.filter(p => p.available).sort((a, b) => (a.ask ?? 0) - (b.ask ?? 0));
            const unavailable = results.filter(p => !p.available);
            const timestamp = new Date().toISOString();
            const responseData = { available, unavailable, count: available.length, timestamp };

            cache.set('platforms_data', responseData);
            res.json({ platforms: responseData, cached: false, timestamp, updatedAt: timestamp });
        } catch (error) {
            logger.error('Error en PlatformController.getPlatforms: %s', (error as Error).message);
            res.status(500).json({ error: 'No se pudo obtener las cotizaciones' });
        }
    }
}

export default new PlatformController();
