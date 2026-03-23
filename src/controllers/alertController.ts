import { Request, Response } from 'express';
import prisma from '../utils/db';
import logger from '../utils/logger';
import notificationService from '../services/notificationService';
import { sendPriceAlertEmail } from '../services/emailService';

interface AuthRequest extends Request {
    user?: { id: string; email: string };
}

class AlertController {
    /**
     * GET /api/alerts - Listar todas las alertas del usuario
     */
    async list(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!prisma) {
                res.status(503).json({ error: 'Base de datos no disponible' });
                return;
            }

            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'No autenticado' });
                return;
            }

            const alerts = await prisma.alert.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });

            res.json(alerts);
        } catch (error) {
            logger.error('Error listando alertas: %s', (error as Error).message);
            res.status(500).json({ error: 'Error al listar alertas' });
        }
    }

    /**
     * POST /api/alerts - Crear nueva alerta
     */
    async create(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!prisma) {
                res.status(503).json({ error: 'Base de datos no disponible' });
                return;
            }

            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'No autenticado' });
                return;
            }

            const { asset, condition, threshold } = req.body as {
                asset?: string;
                condition?: string;
                threshold?: number;
            };

            if (!asset || !condition || threshold === undefined) {
                res.status(400).json({
                    error: 'asset, condition (above|below) y threshold requeridos',
                });
                return;
            }

            if (!['above', 'below'].includes(condition)) {
                res.status(400).json({ error: 'condition debe ser "above" o "below"' });
                return;
            }

            const alert = await prisma.alert.create({
                data: {
                    asset: asset.toLowerCase(),
                    condition,
                    threshold: Number(threshold),
                    userId,
                    active: true,
                },
            });

            logger.info('Alerta creada para usuario %s: %s %s %d', userId, asset, condition, threshold);
            res.status(201).json(alert);
        } catch (error) {
            logger.error('Error creando alerta: %s', (error as Error).message);
            res.status(500).json({ error: 'Error al crear alerta' });
        }
    }

    /**
     * PATCH /api/alerts/:id - Actualizar alerta
     */
    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!prisma) {
                res.status(503).json({ error: 'Base de datos no disponible' });
                return;
            }

            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'No autenticado' });
                return;
            }

            const id = req.params.id as string;
            const { asset, condition, threshold, active } = req.body as Record<string, any>;

            // Verificar que el alert pertenece al usuario
            const existing = await prisma.alert.findFirst({
                where: { id, userId },
            });

            if (!existing) {
                res.status(404).json({ error: 'Alerta no encontrada' });
                return;
            }

            const updateData: Record<string, any> = {};
            if (asset !== undefined) updateData.asset = asset.toLowerCase();
            if (condition !== undefined) {
                if (!['above', 'below'].includes(condition)) {
                    res.status(400).json({ error: 'condition debe ser "above" o "below"' });
                    return;
                }
                updateData.condition = condition;
            }
            if (threshold !== undefined) updateData.threshold = Number(threshold);
            if (active !== undefined) updateData.active = Boolean(active);

            const updated = await prisma.alert.update({
                where: { id },
                data: updateData,
            });

            logger.info('Alerta actualizada: %s', id);
            res.json(updated);
        } catch (error) {
            logger.error('Error actualizando alerta: %s', (error as Error).message);
            res.status(500).json({ error: 'Error al actualizar alerta' });
        }
    }

    /**
     * DELETE /api/alerts/:id - Eliminar alerta
     */
    async delete(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!prisma) {
                res.status(503).json({ error: 'Base de datos no disponible' });
                return;
            }

            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'No autenticado' });
                return;
            }

            const id = req.params.id as string;

            const existing = await prisma.alert.findFirst({
                where: { id, userId },
            });

            if (!existing) {
                res.status(404).json({ error: 'Alerta no encontrada' });
                return;
            }

            await prisma.alert.delete({ where: { id } });

            logger.info('Alerta eliminada: %s', id);
            res.json({ message: 'Alerta eliminada' });
        } catch (error) {
            logger.error('Error eliminando alerta: %s', (error as Error).message);
            res.status(500).json({ error: 'Error al eliminar alerta' });
        }
    }

    /**
     * POST /api/alerts/:id/test - Probar una alerta (envía notificación)
     */
    async test(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!prisma) {
                res.status(503).json({ error: 'Base de datos no disponible' });
                return;
            }

            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'No autenticado' });
                return;
            }

            const id = req.params.id as string;

            const alert = await prisma.alert.findFirst({
                where: { id, userId },
                include: { user: true },
            });

            if (!alert) {
                res.status(404).json({ error: 'Alerta no encontrada' });
                return;
            }

            const message = `<b>🧪 Test de Alerta</b>\n\n` +
                `📊 Activo: <b>${alert.asset.toUpperCase()}</b>\n` +
                `📈 Condición: <b>${alert.condition === 'above' ? '⬆️ Arriba de' : '⬇️ Abajo de'}</b>\n` +
                `💰 Umbral: <b>$${alert.threshold}</b>\n\n` +
                `<i>Este es un test de configuración</i>`;

            const telegramOk = await notificationService.sendTelegramMessage(message);

            if (alert.user?.email) {
                sendPriceAlertEmail({
                    to: alert.user.email,
                    message: message.replace(/<[^>]+>/g, ''),
                }).catch(e => logger.warn('Email test error: %s', e.message));
            }

            logger.info('Alerta testeada: %s', id);
            res.json({
                status: telegramOk ? 'ok' : 'partial',
                message: telegramOk ? 'Notificación de prueba enviada' : 'Error en Telegram',
            });
        } catch (error) {
            logger.error('Error testeando alerta: %s', (error as Error).message);
            res.status(500).json({ error: 'Error al testear alerta' });
        }
    }
}

export default new AlertController();
