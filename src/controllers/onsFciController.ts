import { Request, Response } from 'express';
import onsFciService from '../services/onsFciService';
import logger from '../utils/logger';

class OnsFciController {
    async getONs(_req: Request, res: Response): Promise<void> {
        try {
            res.json(await onsFciService.getONs());
        } catch (e: any) {
            logger.error('Error fetching ONs: %s', e.message);
            res.status(500).json({ error: 'No se pudieron obtener las ONs' });
        }
    }

    async getFCIRanking(_req: Request, res: Response): Promise<void> {
        try {
            res.json(await onsFciService.getFCIRanking());
        } catch (e: any) {
            logger.error('Error fetching FCI ranking: %s', e.message);
            res.status(500).json({ error: 'No se pudo obtener el ranking de FCI' });
        }
    }

    async getRentaFija(_req: Request, res: Response): Promise<void> {
        try {
            res.json(await onsFciService.getRentaFijaDashboard());
        } catch (e: any) {
            logger.error('Error fetching renta fija: %s', e.message);
            res.status(500).json({ error: 'No se pudo obtener el dashboard de renta fija' });
        }
    }
}

export default new OnsFciController();
