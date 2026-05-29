import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '24h';
const JWT_REFRESH_EXPIRES_IN = '7d';

declare global {
    namespace Express {
        interface Request {
            user?: jwt.JwtPayload | string;
        }
    }
}

export function getJwtSecret(): string {
    if (!JWT_SECRET || JWT_SECRET === 'super_secret_key_change_me') {
        if (process.env.NODE_ENV === 'production') {
            logger.error('JWT_SECRET no configurado o usa el valor por defecto en produccion');
            throw new Error('JWT_SECRET must be set in production');
        }
        logger.warn('JWT_SECRET usa valor por defecto - solo para desarrollo');
        return 'super_secret_key_change_me';
    }
    return JWT_SECRET;
}

export function signToken(payload: object, expiresIn?: string): string {
    const secret = getJwtSecret();
    const options: jwt.SignOptions = {};
    if (expiresIn) options.expiresIn = expiresIn as any;
    return jwt.sign(payload, secret, options);
}

export function signRefreshToken(payload: object): string {
    const secret = getJwtSecret();
    return jwt.sign({ ...payload, type: 'refresh' }, secret, { expiresIn: JWT_REFRESH_EXPIRES_IN } as any);
}

export function verifyRefreshToken(token: string): jwt.JwtPayload | string {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
    if (decoded.type !== 'refresh') throw new Error('Invalid token type');
    return decoded;
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) {
        res.sendStatus(401);
        return;
    }

    try {
        const secret = getJwtSecret();
        const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
        if (decoded.type === 'refresh') {
            res.status(401).json({ error: 'Refresh tokens cannot be used for API access' });
            return;
        }
        req.user = decoded;
        next();
    } catch {
        res.sendStatus(403);
    }
}

export const JWT_SECRET_EXPORT = JWT_SECRET;
