import cache, { getRedisClient } from '../utils/cache';
import notificationService from './notificationService';
import logger from '../utils/logger';

export const CORE_SOURCES = ['dolarapi', 'criptoya', 'argentinadatos', 'bcra', 'yahoo', 'data912', 'indec'] as const;
export type CoreSource = typeof CORE_SOURCES[number];
const sixHours = 6 * 60 * 60 * 1000;

export async function recordSourceSuccess(source: CoreSource): Promise<void> {
    const key = `source:last-success:${source}`;
    const now = Date.now();
    try {
        const redis = await getRedisClient();
        if (redis) await redis.set(key, JSON.stringify(now), 'PX', 48 * 60 * 60 * 1000);
        cache.set(key, now, 48 * 60 * 60 * 1000);
    } catch (error) { logger.warn('No se pudo registrar la fuente %s: %s', source, (error as Error).message); }
}

export async function checkSourceHealth(): Promise<void> {
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;
    const redis = await getRedisClient();
    await Promise.all(CORE_SOURCES.map(async source => {
        try {
            const key = `source:last-success:${source}`;
            const last = redis ? Number(await redis.get(key)) : await cache.get<number>(key);
            if (last && Date.now() - last < sixHours) return;
            const cooldown = `source:alert:${source}`;
            if (redis) {
                if (await redis.set(cooldown, '1', 'PX', sixHours, 'NX') !== 'OK') return;
            } else {
                if (cache.getSync(cooldown)) return;
                cache.set(cooldown, true, sixHours);
            }
            const sent = await notificationService.sendTelegramMessage(`⚠️ Fuente ${source}: sin datos exitosos en las últimas 6 horas.`);
            if (!sent) {
                if (redis) await redis.del(cooldown);
                cache.del(cooldown);
            }
        } catch (error) { logger.warn('No se pudo verificar la fuente %s: %s', source, (error as Error).message); }
    }));
}
