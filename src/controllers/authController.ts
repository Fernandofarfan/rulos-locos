import { Request, Response, type CookieOptions } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/db';
import { signToken, signRefreshToken, verifyRefreshToken } from '../middleware/auth';
import logger from '../utils/logger';
import { OAuth2Client } from 'google-auth-library';
import { decryptSecret, encryptSecret } from '../utils/crypto';
import { toPlain } from '../utils/serialize';
import { z } from 'zod';
import { getTotp } from '../utils/totp';

async function getQRCode() {
    const QRCode = await import('qrcode');
    return QRCode.default ?? QRCode;
}
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

function signAccess(payload: { id: string; email: string }) {
    return signToken(payload, '15m');
}

function signRefresh(payload: { id: string; email: string; tv: number }) {
    return signRefreshToken(payload);
}

const totpSchema = z.object({ token: z.string().regex(/^\d{6}$/) });
const refreshCookieOptions: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
};
const refreshMaxAge = 30 * 24 * 60 * 60 * 1000;

function setRefreshCookie(res: Response, user: { id: string; email: string; tokenVersion: number }): void {
    res.cookie('rl_refresh', signRefresh({ id: user.id, email: user.email, tv: user.tokenVersion }), {
        ...refreshCookieOptions, maxAge: refreshMaxAge,
    });
}

function getRefreshCookie(req: Request): string | undefined {
    const part = req.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith('rl_refresh='));
    if (!part) return undefined;
    try { return decodeURIComponent(part.slice('rl_refresh='.length)); } catch { return undefined; }
}

function clearRefreshCookie(res: Response): void {
    res.clearCookie('rl_refresh', refreshCookieOptions);
}

function csrfGuard(req: Request, res: Response): boolean {
    if (req.get('X-Requested-With') === 'XMLHttpRequest') return true;
    res.status(403).json({ error: 'Encabezado CSRF requerido' });
    return false;
}

interface AuthRequest extends Request {
    user?: { id: string; email: string };
}

class AuthController {
    async register(req: Request, res: Response): Promise<void> {
        if (!prisma) { res.status(503).json({ error: 'Base de datos no disponible (ejecutá `npx prisma generate`)' }); return; }
        try {
            const { email, password, name } = req.body as { email: string; password: string; name?: string };

            const existingUser = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
            if (existingUser) {
                res.status(409).json({ error: 'El usuario ya existe' });
                return;
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await prisma.user.create({ data: { email, password: hashedPassword, name } });
            logger.info(`Nuevo usuario registrado: ${email}`);

            const token = signAccess({ id: user.id, email: user.email });
            setRefreshCookie(res, user);
            res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
        } catch (error) {
            logger.error('Error en registro: %s', (error as Error).message);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    async login(req: Request, res: Response): Promise<void> {
        if (!prisma) { res.status(503).json({ error: 'Base de datos no disponible (ejecutá `npx prisma generate`)' }); return; }
        try {
            const { email, password, twoFactorCode } = req.body as { email: string; password: string; twoFactorCode?: string };

            const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
            if (!user) {
                res.status(401).json({ error: 'Credenciales inválidas' });
                return;
            }

            if (!user.password) {
                res.status(401).json({ error: 'Credenciales inválidas o cuenta de Google' });
                return;
            }

            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                res.status(401).json({ error: 'Credenciales inválidas' });
                return;
            }

            // 2FA Flow
            if (user.twoFactorEnabled) {
                if (!twoFactorCode) {
                    res.status(200).json({ require2fa: true, userId: user.id });
                    return;
                }

                if (!user.twoFactorSecret) {
                    res.status(500).json({ error: '2FA activado pero falta el secreto en la DB.' });
                    return;
                }

                const totp = await getTotp();
                const isValid = (await totp.verify({ token: twoFactorCode, secret: decryptSecret(user.twoFactorSecret, 'plain') })).valid;
                if (!isValid) {
                    res.status(401).json({ error: 'Código 2FA incorrecto o expirado.' });
                    return;
                }
            }

            const token = signAccess({ id: user.id, email: user.email });
            setRefreshCookie(res, user);
            res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
        } catch (error) {
            logger.error('Error en login: %s', (error as Error).message);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    async me(req: AuthRequest, res: Response): Promise<void> {
        if (!prisma) { res.status(503).json({ error: 'Base de datos no disponible (ejecutá `npx prisma generate`)' }); return; }
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.sendStatus(401);
                return;
            }

            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    alerts: true,
                    portfolio: true,
                    balances: true,
                    virtualTxs: true,
                    apiKeys: {
                        select: { id: true, exchange: true, createdAt: true, updatedAt: true },
                    },
                },
            });

            if (!user) {
                res.sendStatus(404);
                return;
            }

            const { password: _pw, twoFactorSecret: _secret, ...userWithoutPassword } = user;
            void _pw;
            void _secret;
            res.json(toPlain(userWithoutPassword));
        } catch (error) {
            logger.error('Error fetching profile: %s', (error as Error).message);
            res.status(500).json({ error: 'Error interno' });
        }
    }
    async refresh(req: Request, res: Response): Promise<void> {
        if (!csrfGuard(req, res)) return;
        const refreshToken = getRefreshCookie(req);
        if (!refreshToken) { res.sendStatus(204); return; }
        if (!prisma) { res.status(503).json({ error: 'DB no disponible' }); return; }
        let payload: { id: string; tv: number };
        try {
            const decoded = verifyRefreshToken(refreshToken);
            if (typeof decoded === 'string' || typeof decoded.id !== 'string' || !Number.isInteger(decoded.tv)) throw new Error('Invalid payload');
            payload = { id: decoded.id, tv: decoded.tv as number };
        } catch {
            res.status(401).json({ error: 'Refresh token inválido o expirado' });
            return;
        }
        try {
            const user = await prisma.user.findUnique({ where: { id: payload.id } });
            if (!user || user.tokenVersion !== payload.tv) { clearRefreshCookie(res); res.status(401).json({ error: 'Sesión revocada' }); return; }
            setRefreshCookie(res, user);
            res.json({ token: signAccess({ id: user.id, email: user.email }), user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl } });
        } catch (error) {
            logger.error('Error renovando sesión: %s', (error as Error).message);
            res.status(500).json({ error: 'No se pudo renovar la sesión' });
        }
    }

    async logout(req: Request, res: Response): Promise<void> {
        if (!csrfGuard(req, res)) return;
        const token = getRefreshCookie(req);
        if (!token) { clearRefreshCookie(res); res.sendStatus(204); return; }
        let payload: { id: string; tv: number };
        try {
            const decoded = verifyRefreshToken(token);
            if (typeof decoded === 'string' || typeof decoded.id !== 'string' || !Number.isInteger(decoded.tv)) throw new Error('Invalid payload');
            payload = { id: decoded.id, tv: decoded.tv as number };
        } catch {
            clearRefreshCookie(res);
            res.sendStatus(204);
            return;
        }
        if (!prisma) { res.status(503).json({ error: 'DB no disponible' }); return; }
        try {
            await prisma.user.updateMany({ where: { id: payload.id, tokenVersion: payload.tv }, data: { tokenVersion: { increment: 1 } } });
            clearRefreshCookie(res);
            res.sendStatus(204);
        } catch (error) {
            logger.error('Error cerrando sesión: %s', (error as Error).message);
            res.status(500).json({ error: 'No se pudo revocar la sesión' });
        }
    }

    // Generar Secreto 2FA y devolver QR
    async generate2FA(req: AuthRequest, res: Response): Promise<void> {
        if (!prisma) { res.status(503).json({ error: 'DB no disponible' }); return; }
        try {
            const userId = req.user?.id;
            if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }

            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
            if (user.twoFactorEnabled) { res.status(400).json({ error: '2FA ya está activado' }); return; }

            const totp = await getTotp();
            const secret = totp.generateSecret();
            const otpauth = totp.generateURI({ label: user.email, issuer: 'RulosLocos', secret });

            await prisma.user.update({
                where: { id: userId },
                data: { twoFactorSecret: encryptSecret(secret) }
            });

            const QRCode = await getQRCode();
            const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

            res.json({ secret, qrCode: qrCodeDataUrl });
        } catch (error) {
            logger.error('Error generando 2FA: %s', (error as Error).message);
            res.status(500).json({ error: 'Error interno generando 2FA' });
        }
    }

    // Validar el primer código y activar
    async verifyAndEnable2FA(req: AuthRequest, res: Response): Promise<void> {
        if (!prisma) { res.status(503).json({ error: 'DB no disponible' }); return; }
        try {
            const userId = req.user?.id;
            const { token } = req.body as { token?: string };

            if (!userId || !token) { res.status(400).json({ error: 'Token 2FA requerido' }); return; }

            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user || !user.twoFactorSecret || user.twoFactorEnabled) { res.status(400).json({ error: 'No hay secreto 2FA pendiente.' }); return; }

            const totp = await getTotp();
            const isValid = (await totp.verify({ token, secret: decryptSecret(user.twoFactorSecret, 'plain') })).valid;

            if (!isValid) {
                res.status(400).json({ error: 'Código 2FA incorrecto o vencido.' });
                return;
            }

            const updated = await prisma.user.update({
                where: { id: userId },
                data: { twoFactorEnabled: true, tokenVersion: { increment: 1 } }
            });

            setRefreshCookie(res, updated);
            res.json({ success: true, message: '2FA activado correctamente.' });
        } catch (error) {
            logger.error('Error verificando 2FA: %s', (error as Error).message);
            res.status(500).json({ error: 'Error interno verificando 2FA' });
        }
    }

    async disable2FA(req: AuthRequest, res: Response): Promise<void> {
        const parsed = totpSchema.safeParse(req.body);
        if (!parsed.success) { res.status(400).json({ error: 'Token 2FA requerido' }); return; }
        if (!prisma) { res.status(503).json({ error: 'DB no disponible' }); return; }
        try {
            const userId = req.user?.id;
            if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }

            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user?.twoFactorEnabled || !user.twoFactorSecret) { res.status(400).json({ error: '2FA no está activado' }); return; }
            const totp = await getTotp();
            const valid = (await totp.verify({ token: parsed.data.token, secret: decryptSecret(user.twoFactorSecret, 'plain') })).valid;
            if (!valid) { res.status(400).json({ error: 'Código 2FA incorrecto o vencido.' }); return; }
            const updated = await prisma.user.update({
                where: { id: userId },
                data: { twoFactorEnabled: false, twoFactorSecret: null, tokenVersion: { increment: 1 } }
            });

            setRefreshCookie(res, updated);
            res.json({ success: true, message: '2FA ha sido desactivado.' });
        } catch (error) {
            res.status(500).json({ error: 'Server err' });
        }
    }

    async googleLogin(req: Request, res: Response): Promise<void> {
        if (!prisma) { 
            res.status(503).json({ error: 'DB no disponible' }); 
            return; 
        }
        const { credential } = req.body as { credential?: string };
        if (!credential) { 
            res.status(400).json({ error: 'Token de Google requerido' }); 
            return; 
        }

        if (!GOOGLE_CLIENT_ID) {
            res.status(503).json({ error: 'Google OAuth no configurado (definí GOOGLE_CLIENT_ID en backend)' });
            return;
        }

        try {
            const ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();

            if (!payload || !payload.email || !payload.email_verified) {
                res.status(400).json({ error: 'Token inválido' });
                return;
            }

            const { sub: googleId, name, picture: avatarUrl } = payload;
            const email = payload.email.trim().toLowerCase();

            let user = await prisma.user.findFirst({
                where: { OR: [{ email: { equals: email, mode: 'insensitive' } }, { googleId }] }
            });

            if (!user) {
                user = await prisma.user.create({
                    data: {
                        email,
                        name: name || 'Usuario de Google',
                        googleId,
                        avatarUrl,
                    }
                });
            }

            if (user.twoFactorEnabled) {
                const code = totpSchema.safeParse({ token: req.body.twoFactorCode });
                if (!code.success) { res.json({ require2fa: true, userId: user.id }); return; }
                if (!user.twoFactorSecret) { res.status(500).json({ error: 'Falta el secreto 2FA' }); return; }
                const totp = await getTotp();
                const valid = (await totp.verify({ token: code.data.token, secret: decryptSecret(user.twoFactorSecret, 'plain') })).valid;
                if (!valid) { res.status(401).json({ error: 'Código 2FA incorrecto o expirado.' }); return; }
            }

            if (!user.googleId) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { googleId, avatarUrl: user.avatarUrl || avatarUrl },
                });
            }

            const token = signAccess({ id: user.id, email: user.email });
            setRefreshCookie(res, user);
            res.json({ token, user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl } });
        } catch (error) {
            logger.error('Error en googleLogin: %s', (error as Error).message);
            res.status(401).json({ error: 'Fallo al autenticar con Google' });
        }
    }
}

export default new AuthController();
