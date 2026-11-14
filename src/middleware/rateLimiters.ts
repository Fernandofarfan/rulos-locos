import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import { getRedisClient } from '../utils/cache';

const getClientKey = (req: Request): string => req.ip || 'unknown';

const isDev = process.env.NODE_ENV !== 'production';

export function createRateLimitStore(prefix: string): RedisStore | undefined {
    if (!process.env.REDIS_URL) return undefined;
    return new RedisStore({
        prefix: `rl:${prefix}:`,
        sendCommand: async (command: string, ...args: string[]) => {
            const redis = await getRedisClient();
            if (!redis) throw new Error('Redis rate-limit store unavailable');
            return redis.call(command, ...args) as Promise<RedisReply>;
        },
    });
}

const baseLimiter = (name: string, windowMs: number, max: number, message: string): RateLimitRequestHandler =>
    rateLimit({
        windowMs,
        max: isDev ? max * 10 : max,  // 10x more permissive in dev
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: getClientKey,
        message,
        skip: (req) => req.path.includes('/healthz') || req.path.includes('/readyz'),
        validate: false,
        store: createRateLimitStore(name),
    });

export const rateLimiters = {
    fast: baseLimiter('fast', 60 * 1000, 200, 'Demasiadas solicitudes, intente nuevamente más tarde'),
    normal: baseLimiter('normal', 60 * 1000, 60, 'Demasiadas solicitudes'),
    slow: baseLimiter('slow', 60 * 1000, 10, 'Demasiados intentos de autenticación'),
    strict: baseLimiter('strict', 10 * 1000, 3, 'Espera antes de reintentar'),
    apiKey: rateLimit({
        windowMs: 60 * 1000,
        max: 500,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req: Request) => {
            const headerKey = req.headers['x-api-key'];
            const apiKey = Array.isArray(headerKey) ? headerKey[0] : headerKey;
            return apiKey ? `apikey:${apiKey}` : `ip:${getClientKey(req)}`;
        },
        skip: (req: Request) => !req.headers['x-api-key'],
        store: createRateLimitStore('api-key'),
    }),
};

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Demasiados intentos de inicio de sesión, intente más tarde.' },
    store: createRateLimitStore('auth-routes'),
});

export const sessionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    message: { error: 'Demasiadas solicitudes de sesión, intente más tarde.' },
    store: createRateLimitStore('auth-session'),
});

export const createSafeRateLimiter = (limiter: RateLimitRequestHandler) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            limiter(req, res, next);
        } catch {
            next();
        }
    };
};

export default rateLimiters;
