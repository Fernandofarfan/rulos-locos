import { Request, Response } from 'express';
import rofexService from '../services/rofexService';
import logger from '../utils/logger';

export const getRofexContracts = async (_req: Request, res: Response): Promise<void> => {
    try {
        const data = await rofexService.getContracts();
        res.json(data);
    } catch (error) {
        logger.error('Error in getRofexContracts:', (error as Error).message);
        res.status(500).json({ error: 'Error fetching ROFEX contracts' });
    }
};
