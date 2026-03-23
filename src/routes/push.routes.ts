import express from 'express';
import webPush from 'web-push';
import prisma from '../utils/db';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();

const VAPID_PUBLIC = process.env.VITE_VAPID_PUBLIC_KEY || '...';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '...';

// Solo configuramos web-push si las claves están definidas
if (VAPID_PUBLIC !== '...' && VAPID_PRIVATE !== '...') {
    webPush.setVapidDetails(
        'mailto:tucorreo@ejemplo.com',
        VAPID_PUBLIC,
        VAPID_PRIVATE
    );
}

// Obtener clave pública para el frontend
router.get('/vapid-public-key', (_req, res) => {
    res.json({ publicKey: VAPID_PUBLIC });
});

// Suscribirse a Web Push
router.post('/subscribe', authenticateToken, async (req, res): Promise<void> => {
    if (!prisma) { res.status(503).json({ error: 'DB no disponible' }); return; }
    try {
        const { subscription } = req.body;
        // @ts-ignore
        const userId = req.user?.id;

        if (!subscription || !subscription.endpoint || !userId) {
            res.status(400).json({ error: 'Suscripción o usuario inválidos' });
            return;
        }

        const existingSub = await prisma.pushSubscription.findUnique({
            where: { endpoint: subscription.endpoint }
        });

        if (existingSub) {
            res.status(200).json({ success: true, message: 'Ya suscrito' });
            return;
        }

        await prisma.pushSubscription.create({
            data: {
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                userId: userId,
            }
        });

        res.status(201).json({ success: true });
    } catch (error) {
        logger.error('Error suscribiendo a push:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
