import { Request, Response } from 'express';
import webpush from 'web-push';
import logger from '../utils/logger';

// Configura las VAPID keys desde variables de entorno
// Generarlas una vez con: npx web-push generate-vapid-keys
if (process.env['VAPID_PUBLIC_KEY'] && process.env['VAPID_PRIVATE_KEY']) {
    webpush.setVapidDetails(
        `mailto:${process.env['VAPID_CONTACT_EMAIL'] ?? 'admin@rulos-locos.com.ar'}`,
        process.env['VAPID_PUBLIC_KEY'],
        process.env['VAPID_PRIVATE_KEY'],
    );
}

import prisma from '../utils/db';

export async function subscribe(req: Request, res: Response): Promise<void> {
    const subscription = req.body as webpush.PushSubscription;
    // @ts-ignore
    const userId = req.user?.id;
    if (!subscription?.endpoint) {
        res.status(400).json({ error: 'Suscripción inválida' });
        return;
    }
    try {
        if (!prisma) { res.status(503).json({ error: 'DB no disponible' }); return; }

        // Use an anonymous user if no auth is present for now, or require auth if possible.
        // For simplicity, we can let userId be optional in Prisma or we just bypass if userId is mandatory.
        // Check schema.prisma: userId is String (mandatory block).
        if (!userId) { res.status(401).json({ error: 'Autenticación requerida para push' }); return; }

        await prisma.pushSubscription.upsert({
            where: { endpoint: subscription.endpoint },
            update: {
                // @ts-ignore
                p256dh: subscription.keys.p256dh,
                // @ts-ignore
                auth: subscription.keys.auth,
            },
            create: {
                endpoint: subscription.endpoint,
                // @ts-ignore
                p256dh: subscription.keys.p256dh,
                // @ts-ignore
                auth: subscription.keys.auth,
                userId: userId,
            }
        });
        logger.info('🔔 Nueva suscripción push registrada en DB');
        res.status(201).json({ ok: true });
    } catch (err) {
        logger.error('Error suscribiendo: %s', err);
        res.status(500).json({ error: 'Database err' });
    }
}

export async function unsubscribe(req: Request, res: Response): Promise<void> {
    const { endpoint } = req.body as { endpoint?: string };
    if (!endpoint) { res.status(400).json({ error: 'Missing endpoint' }); return; }
    if (prisma) {
        try {
            await prisma.pushSubscription.delete({ where: { endpoint } });
            res.json({ ok: true });
        } catch (e) { /* ignore if not exist */ res.json({ ok: true }); }
    } else {
        res.json({ ok: true });
    }
}

export async function getVapidPublicKey(_req: Request, res: Response): Promise<void> {
    const key = process.env['VAPID_PUBLIC_KEY'];
    if (!key) {
        res.status(503).json({ error: 'Push no configurado en este servidor (sin VAPID keys)' });
        return;
    }
    res.json({ publicKey: key });
}

/**
 * Envía una notificación push a todos los suscriptores.
 * Llamar desde alertWorker cuando se dispara una alerta de precio.
 */
export async function broadcastPush(payload: {
    title: string;
    body: string;
    url?: string;
    badge?: string;
}): Promise<void> {
    if (!prisma) return;
    const subs = await prisma.pushSubscription.findMany();
    if (subs.length === 0) return;

    if (!process.env['VAPID_PUBLIC_KEY']) {
        logger.warn('broadcastPush: VAPID keys no configuradas, omitiendo push');
        return;
    }
    const message = JSON.stringify({ ...payload, icon: '/icons/icon-192.svg' });
    const failedIds: string[] = [];

    await Promise.allSettled(
        subs.map(async (subRecord: any) => {
            const sub = {
                endpoint: subRecord.endpoint,
                keys: {
                    p256dh: subRecord.p256dh,
                    auth: subRecord.auth
                }
            } as any;
            try {
                await webpush.sendNotification(sub, message);
            } catch (err: any) {
                const status = err.statusCode;
                if (status === 410 || status === 404) {
                    failedIds.push(subRecord.id);
                } else {
                    logger.warn('Push falló para %s: %s', subRecord.endpoint.slice(-8), err.message);
                }
            }
        }),
    );

    if (failedIds.length > 0) {
        await prisma.pushSubscription.deleteMany({
            where: { id: { in: failedIds } }
        });
        logger.info('🗑️ Removidas %d suscripciones expiradas', failedIds.length);
    }
}
