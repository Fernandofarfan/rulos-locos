import { Request, Response } from 'express';
import cryptoYaService from '../services/cryptoYaService';
import cache from '../utils/cache';
import logger from '../utils/logger';

class RateController {
    async getRate(_req: Request, res: Response): Promise<void> {
        try {
            const cachedData = cache.get<Record<string, unknown>>('rate_data');
            if (cachedData) {
                res.json({ ...cachedData, cached: true });
                return;
            }

            const data = await cryptoYaService.getBinanceP2P();
            const ask = parseFloat(String(data.ask)) || 1205.50;
            const bid = parseFloat(String(data.bid)) || 1195.20;

            const rateData = {
                ask,
                bid,
                source: (data.ask && data.bid) ? 'Binance P2P' : 'Fallback',
                timestamp: new Date().toISOString(),
            };

            cache.set('rate_data', rateData);
            res.json({ ...rateData, cached: false });
        } catch (error) {
            logger.error('Error en RateController.getRate: %s', (error as Error).message);
            res.json({
                ask: 1205.50, bid: 1195.20,
                source: 'Offline (fallback)',
                timestamp: new Date().toISOString(),
                cached: false,
            });
        }
    }
}

export default new RateController();
