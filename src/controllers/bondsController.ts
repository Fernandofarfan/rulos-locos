import { Request, Response } from 'express';
import bondsService from '../services/bondsService';
import logger from '../utils/logger';

export const getBondsLive = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = await bondsService.getBondsLive();
        res.json(data);
    } catch (error) {
        logger.error('Error in getBondsLive:', (error as Error).message);
        res.status(500).json({ error: 'Error fetching bonds live data' });
    }
};
