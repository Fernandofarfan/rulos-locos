import { Request, Response } from 'express';
import prisma from '../utils/db';
import logger from '../utils/logger';
import portfolioImportExportService from '../services/portfolioImportExportService';

/** Extiende Request para incluir el usuario inyectado por authenticateToken */
interface AuthRequest extends Request {
    user?: { id: string; email: string } | any;
}

class PortfolioController {
    /** GET /api/portfolio — lista todas las posiciones del usuario */
    async list(req: AuthRequest, res: Response): Promise<void> {
        if (!prisma) { res.status(503).json({ error: 'Base de datos no disponible (ejecutá `npx prisma generate`)' }); return; }
        try {
            const userId = req.user?.id;
            if (!userId) { res.sendStatus(401); return; }

            const positions = await prisma.portfolioPosition.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });
            res.json({ positions });
        } catch (err) {
            logger.error('portfolioController.list: %s', (err as Error).message);
            res.status(500).json({ error: 'Error interno' });
        }
    }

    /** POST /api/portfolio — crea una nueva posición */
    async create(req: AuthRequest, res: Response): Promise<void> {
        if (!prisma) { res.status(503).json({ error: 'Base de datos no disponible (ejecutá `npx prisma generate`)' }); return; }
        try {
            const userId = req.user?.id;
            if (!userId) { res.sendStatus(401); return; }

            const { asset, buyPrice, amount, date, note } = req.body as {
                asset?: string; buyPrice?: number; amount?: number; date?: string; note?: string;
            };

            if (!asset || !buyPrice || !amount) {
                res.status(400).json({ error: 'Campos requeridos: asset, buyPrice, amount' });
                return;
            }

            const position = await prisma.portfolioPosition.create({
                data: {
                    asset,
                    buyPrice: Number(buyPrice),
                    amount: Number(amount),
                    date: date || new Date().toLocaleDateString('es-AR'),
                    note,
                    userId,
                },
            });
            res.status(201).json({ position });
        } catch (err) {
            logger.error('portfolioController.create: %s', (err as Error).message);
            res.status(500).json({ error: 'Error interno' });
        }
    }

    /** DELETE /api/portfolio/:id — elimina una posición del usuario */
    async remove(req: AuthRequest, res: Response): Promise<void> {
        if (!prisma) { res.status(503).json({ error: 'Base de datos no disponible (ejecutá `npx prisma generate`)' }); return; }
        try {
            const userId = req.user?.id;
            if (!userId) { res.sendStatus(401); return; }

            const id = req.params.id as string;
            const existing = await prisma.portfolioPosition.findFirst({ where: { id, userId } });
            if (!existing) { res.status(404).json({ error: 'Posición no encontrada' }); return; }

            await prisma.portfolioPosition.delete({ where: { id } });
            res.json({ ok: true });
        } catch (err) {
            logger.error('portfolioController.remove: %s', (err as Error).message);
            res.status(500).json({ error: 'Error interno' });
        }
    }

    /** GET /api/portfolio/export/json — exportar portfolio como JSON */
    async exportJSON(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) { res.sendStatus(401); return; }

            const data = await portfolioImportExportService.exportAsJSON(userId);
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="portfolio-${Date.now()}.json"`);
            res.json(data);
        } catch (err) {
            logger.error('portfolioController.exportJSON: %s', (err as Error).message);
            res.status(500).json({ error: 'Error al exportar' });
        }
    }

    /** GET /api/portfolio/export/csv — exportar portfolio como CSV */
    async exportCSV(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) { res.sendStatus(401); return; }

            const csv = await portfolioImportExportService.exportAsCSV(userId);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="portfolio-${Date.now()}.csv"`);
            res.send(csv);
        } catch (err) {
            logger.error('portfolioController.exportCSV: %s', (err as Error).message);
            res.status(500).json({ error: 'Error al exportar' });
        }
    }

    /** POST /api/portfolio/import/json — importar portfolio desde JSON */
    async importJSON(req: AuthRequest, res: Response): Promise<void> {
        if (!prisma) { res.status(503).json({ error: 'Base de datos no disponible' }); return; }
        try {
            const userId = req.user?.id;
            if (!userId) { res.sendStatus(401); return; }

            const { data, merge } = req.body as { data?: any; merge?: boolean };
            if (!data) {
                res.status(400).json({ error: 'Campo "data" requerido' });
                return;
            }

            const imported = await portfolioImportExportService.importFromJSON(userId, data, merge);
            res.json({ imported, message: `${imported} posiciones importadas` });
        } catch (err) {
            logger.error('portfolioController.importJSON: %s', (err as Error).message);
            res.status(500).json({ error: 'Error al importar' });
        }
    }

    /** POST /api/portfolio/import/csv — importar portfolio desde CSV */
    async importCSV(req: AuthRequest, res: Response): Promise<void> {
        if (!prisma) { res.status(503).json({ error: 'Base de datos no disponible' }); return; }
        try {
            const userId = req.user?.id;
            if (!userId) { res.sendStatus(401); return; }

            const { csv, merge } = req.body as { csv?: string; merge?: boolean };
            if (!csv) {
                res.status(400).json({ error: 'Campo "csv" requerido' });
                return;
            }

            const imported = await portfolioImportExportService.importFromCSV(userId, csv, merge);
            res.json({ imported, message: `${imported} posiciones importadas` });
        } catch (err) {
            logger.error('portfolioController.importCSV: %s', (err as Error).message);
            res.status(500).json({ error: 'Error al importar' });
        }
    }

    /** GET /api/portfolio/stats — estadísticas del portfolio */
    async stats(req: AuthRequest, res: Response): Promise<void> {
        if (!prisma) { res.status(503).json({ error: 'Base de datos no disponible' }); return; }
        try {
            const userId = req.user?.id;
            if (!userId) { res.sendStatus(401); return; }

            const stats = await portfolioImportExportService.getStats(userId);
            res.json(stats);
        } catch (err) {
            logger.error('portfolioController.stats: %s', (err as Error).message);
            res.status(500).json({ error: 'Error al calcular estadísticas' });
        }
    }
}

export default new PortfolioController();
