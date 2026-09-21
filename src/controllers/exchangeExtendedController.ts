import { Request, Response } from 'express';
import realExchangeService from '../services/exchangeService';
import PortfolioSyncService from '../utils/ccxtSync';
import prisma from '../utils/db';
import logger from '../utils/logger';

interface AuthRequest extends Request {
    user?: { id: string; email: string };
}

class ExchangeControllerExtended {
    async syncPortfolio(req: AuthRequest, res: Response): Promise<void> {
        try {
            await PortfolioSyncService.syncUserPortfolio(req.user!.id);
            res.json({ success: true, message: 'Portfolio synchronizado' });
        } catch (error: any) {
            logger.error('Error syncing portfolio: %s', error.message);
            res.status(500).json({ error: 'No se pudo sincronizar el portfolio' });
        }
    }

    async getBalance(req: AuthRequest, res: Response): Promise<void> {
        try {
            const balance = await realExchangeService.getBalance(req.user!.id, req.params.name as string);
            if (!balance) { res.status(404).json({ error: 'Exchange no configurado' }); return; }
            res.json(balance);
        } catch (e: any) {
            logger.error('Error fetching balance: %s', e.message);
            res.status(500).json({ error: 'No se pudo obtener el balance' });
        }
    }

    async validateKeys(req: AuthRequest, res: Response): Promise<void> {
        try {
            const valid = await realExchangeService.validateKeys(req.user!.id, req.params.name as string);
            res.json({ exchange: (req.params.name as string).toUpperCase(), valid });
        } catch (e: any) {
            logger.error('Error validating keys: %s', e.message);
            res.status(500).json({ error: 'No se pudieron validar las credenciales' });
        }
    }

    async getPrices(req: Request, res: Response): Promise<void> {
        try {
            const prices = await realExchangeService.getMultiExchangePrices(decodeURIComponent(req.params.symbol as string));
            res.json(prices);
        } catch (e: any) {
            logger.error('Error fetching prices: %s', e.message);
            res.status(500).json({ error: 'No se pudieron obtener los precios' });
        }
    }

    async getUsage(req: AuthRequest, res: Response): Promise<void> {
        if (!prisma) { res.status(503).json({ error: 'DB no disponible' }); return; }
        const userId = req.user!.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const count = await prisma.virtualTransaction.count({
            where: { userId, createdAt: { gte: today } }
        });
        const MAX_TRADES_FREE = 20;
        res.json({ used: count, limit: MAX_TRADES_FREE, remaining: Math.max(0, MAX_TRADES_FREE - count), tier: 'free' });
    }

    async subscribeNewsletter(req: Request, res: Response): Promise<void> {
        const { email } = req.body;
        if (!email) { res.status(400).json({ error: 'Email requerido' }); return; }
        try {
            if (prisma) {
                const user = await prisma.user.findUnique({ where: { email } });
                if (user) {
                    res.json({ success: true, message: 'Usuario registrado. Recibirás el resumen diario.' });
                    return;
                }
            }
            res.json({ success: true, message: 'Email registrado para newsletter (modo guest).' });
        } catch (e: any) {
            logger.error('Error subscribing newsletter: %s', e.message);
            res.status(500).json({ error: 'No se pudo registrar el email' });
        }
    }
}

export default new ExchangeControllerExtended();
