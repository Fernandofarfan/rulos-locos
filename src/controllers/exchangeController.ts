import { Request, Response } from 'express';
import prisma from '../utils/db';
import logger from '../utils/logger';

interface AuthRequest extends Request {
    user?: { id: string; email: string };
}

class ExchangeController {

    // Obtener las llaves vinculadas (sin devolver el secret)
    async listKeys(req: AuthRequest, res: Response): Promise<void> {
        if (!prisma) { res.status(503).json({ error: 'DB no disponible' }); return; }
        try {
            const userId = req.user?.id;
            if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }

            const keys = await prisma.exchangeKey.findMany({
                where: { userId },
                select: { id: true, exchange: true, apiKey: true, createdAt: true, updatedAt: true }
            });

            res.json(keys);
        } catch (error) {
            logger.error('Error listKeys: %s', (error as Error).message);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Guardar una nueva API Key de solo lectura
    async addKey(req: AuthRequest, res: Response): Promise<void> {
        if (!prisma) { res.status(503).json({ error: 'DB no disponible' }); return; }
        try {
            const userId = req.user?.id;
            if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }

            const { exchange, apiKey, apiSecret, passthrough } = req.body as { exchange: string; apiKey: string; apiSecret: string; passthrough?: string };

            if (!exchange || !apiKey || !apiSecret) {
                res.status(400).json({ error: 'Faltan parámetros de conexión' });
                return;
            }

            // Idealmente acá se debería validar que la key conecta al exchange, o encriptarla antes de meterla a la DB
            // Por simplicidad de este MVP, la guardaremos en Base64 básica (en Prod real se usa AES-256)

            const newKey = await prisma.exchangeKey.create({
                data: {
                    userId,
                    exchange: exchange.toUpperCase(),
                    apiKey,
                    apiSecret: Buffer.from(apiSecret).toString('base64'),
                    passthrough
                }
            });

            res.status(201).json({ id: newKey.id, exchange: newKey.exchange, apiKey: newKey.apiKey });

        } catch (error: any) {
            logger.warn('AddKey err: %s', error.message);
            if (error.code === 'P2002') {
                res.status(400).json({ error: 'Ya tienes una llave configurada para este Exchange.' });
            } else {
                res.status(400).json({ error: error.message });
            }
        }
    }

    // Eliminar llave
    async removeKey(req: AuthRequest, res: Response): Promise<void> {
        if (!prisma) { res.status(503).json({ error: 'DB no disponible' }); return; }
        try {
            const userId = req.user?.id;
            const id = req.params.id as string;

            if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }

            await prisma.exchangeKey.deleteMany({
                where: { id, userId }
            });

            res.sendStatus(204);

        } catch (error) {
            logger.warn('RemoveKey err: %s', (error as Error).message);
            res.status(400).json({ error: 'Clave no encontrada' });
        }
    }
}

export default new ExchangeController();
