import { Request, Response } from 'express';
import fetch from 'node-fetch';
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
}

class PlatformController {
    async getPlatforms(_req: Request, res: Response): Promise<void> {
        try {
            const cachedData = cache.get<{ available: PlatformResult[]; unavailable: PlatformResult[]; count: number }>('platforms_data');
            if (cachedData) {
                res.json({ platforms: cachedData, cached: true, timestamp: new Date().toISOString() });
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
                    const controller = new AbortController();
                    const tid = setTimeout(() => controller.abort(), 5000);
                    const response = await fetch(`${config.API_URLS.CRIPTOYA}/${exchange.id}/USDT/ARS/1`, {
                        headers: config.DEFAULT_HEADERS,
                        signal: controller.signal as unknown as AbortSignal,
                    } as Parameters<typeof fetch>[1]);
                    clearTimeout(tid);
                    if (!response.ok) throw new Error(`Error en ${exchange.name}`);
                    const data = await response.json() as { ask?: string | number; bid?: string | number };
                    return {
                        id: exchange.id, name: exchange.name, icon: exchange.icon,
                        ask: parseFloat(String(data.ask)) || null,
                        bid: parseFloat(String(data.bid)) || null,
                        available: !!(data.ask && data.bid),
                    };
                } catch (error) {
                    return { id: exchange.id, name: exchange.name, icon: exchange.icon, ask: null, bid: null, available: false, error: (error as Error).message };
                }
            });

            const results = await Promise.all(promises);
            const available = results.filter(p => p.available).sort((a, b) => (a.ask ?? 0) - (b.ask ?? 0));
            const unavailable = results.filter(p => !p.available);
            const responseData = { available, unavailable, count: available.length };

            cache.set('platforms_data', responseData);
            res.json({ platforms: responseData, cached: false, timestamp: new Date().toISOString() });
        } catch (error) {
            logger.error('Error en PlatformController.getPlatforms: %s', (error as Error).message);
            res.status(500).json({ error: 'No se pudo obtener las cotizaciones', message: (error as Error).message });
        }
    }
}

export default new PlatformController();
