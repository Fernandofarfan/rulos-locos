import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';

const getClientKey = (req: Request): string => req.ip || 'unknown';

const isDev = process.env.NODE_ENV !== 'production';

const baseLimiter = (windowMs: number, max: number, message: string): RateLimitRequestHandler =>
    rateLimit({
        windowMs,
        max: isDev ? max * 10 : max,  // 10x more permissive in dev
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: getClientKey,
        message,
        skip: (req) => req.path.includes('/healthz') || req.path.includes('/readyz'),
        validate: false,
    });

export const rateLimiters = {
    fast: baseLimiter(60 * 1000, 200, 'Demasiadas solicitudes, intente nuevamente más tarde'),
    normal: baseLimiter(60 * 1000, 60, 'Demasiadas solicitudes'),
    slow: baseLimiter(60 * 1000, 10, 'Demasiados intentos de autenticación'),
    strict: baseLimiter(10 * 1000, 3, 'Espera antes de reintentar'),
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
    }),
};

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
