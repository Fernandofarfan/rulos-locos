import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/db';
import { JWT_SECRET } from '../middleware/auth';
import logger from '../utils/logger';
import { OAuth2Client } from 'google-auth-library';

// otplib y qrcode se importan de manera lazy (son módulos ESM que crashean en CJS serverless)
let _totp: import('otplib').TOTP | null = null;
async function getTotp(): Promise<import('otplib').TOTP> {
    if (_totp) return _totp;
    const { TOTP } = await import('otplib');
    _totp = new TOTP();
    return _totp;
}
async function getQRCode() {
    const QRCode = await import('qrcode');
    return QRCode.default ?? QRCode;
}
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${JWT_SECRET}_refresh`;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

function signAccess(payload: { id: string; email: string }) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

function signRefresh(payload: { id: string; email: string }) {
    return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '30d' });
}

interface AuthRequest extends Request {
    user?: { id: string; email: string };
}

class AuthController {
    async register(req: Request, res: Response): Promise<void> {
        if (!prisma) { res.status(503).json({ error: 'Base de datos no disponible (ejecutá `npx prisma generate`)' }); return; }
        try {
            const { email, password, name } = req.body as { email?: string; password?: string; name?: string };
            if (!email || !password) {
                res.status(400).json({ error: 'Email y contraseña requeridos' });
                return;
            }

            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                res.status(409).json({ error: 'El usuario ya existe' });
                return;
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await prisma.user.create({ data: { email, password: hashedPassword, name } });
            logger.info(`Nuevo usuario registrado: ${email}`);

            const token = signAccess({ id: user.id, email: user.email });
            const refreshToken = signRefresh({ id: user.id, email: user.email });
            res.status(201).json({ token, refreshToken, user: { id: user.id, email: user.email, name: user.name } });
        } catch (error) {
            logger.error('Error en registro: %s', (error as Error).message);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    async login(req: Request, res: Response): Promise<void> {
        if (!prisma) { res.status(503).json({ error: 'Base de datos no disponible (ejecutá `npx prisma generate`)' }); return; }
        try {
            const { email, password } = req.body as { email?: string; password?: string };
            if (!email || !password) {
                res.status(400).json({ error: 'Email y contraseña requeridos' });
                return;
            }

            const user = await prisma.user.findUnique({ where: { email } });
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
                const twoFactorCode = req.body.twoFactorCode as string | undefined;
                if (!twoFactorCode) {
                    res.status(200).json({ require2fa: true, userId: user.id });
                    return;
                }

                if (!user.twoFactorSecret) {
                    res.status(500).json({ error: '2FA activado pero falta el secreto en la DB.' });
                    return;
                }

                const totp = await getTotp();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const isValid = (totp as any).verify({ token: twoFactorCode, secret: user.twoFactorSecret });
                if (!isValid) {
                    res.status(401).json({ error: 'Código 2FA incorrecto o expirado.' });
                    return;
                }
            }

            const token = signAccess({ id: user.id, email: user.email });
            const refreshToken = signRefresh({ id: user.id, email: user.email });
            res.json({ token, refreshToken, user: { id: user.id, email: user.email, name: user.name } });
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
                include: { alerts: true, portfolio: true, balances: true, virtualTxs: true, apiKeys: true },
            });

            if (!user) {
                res.sendStatus(404);
                return;
            }

            const { password: _pw, ...userWithoutPassword } = user;
            void _pw;
            res.json(userWithoutPassword);
        } catch (error) {
            logger.error('Error fetching profile: %s', (error as Error).message);
            res.status(500).json({ error: 'Error interno' });
        }
    }
    async refresh(req: Request, res: Response): Promise<void> {
        const { refreshToken } = req.body as { refreshToken?: string };
        if (!refreshToken) { res.status(400).json({ error: 'Refresh token requerido' }); return; }
        try {
            const payload = jwt.verify(refreshToken, REFRESH_SECRET) as { id: string; email: string; iat: number; exp: number };
            const newAccess = signAccess({ id: payload.id, email: payload.email });
            const newRefresh = signRefresh({ id: payload.id, email: payload.email });
            res.json({ token: newAccess, refreshToken: newRefresh });
        } catch {
            res.status(401).json({ error: 'Refresh token inválido o expirado' });
        }
    }

    // Generar Secreto 2FA y devolver QR
    async generate2FA(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }

            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }

            const totp = await getTotp();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const secret = (totp as any).generateSecret();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const otpauth = (totp as any).keyuri(user.email, 'RulosLocos', secret);

            await prisma.user.update({
                where: { id: userId },
                data: { twoFactorSecret: secret }
            });

            const QRCode = await getQRCode();
            const qrCodeDataUrl = await (QRCode as any).toDataURL(otpauth);

            res.json({ secret, qrCode: qrCodeDataUrl });
        } catch (error) {
            logger.error('Error generando 2FA: %s', (error as Error).message);
            res.status(500).json({ error: 'Error interno generando 2FA' });
        }
    }

    // Validar el primer código y activar
    async verifyAndEnable2FA(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            const { token } = req.body as { token?: string };

            if (!userId || !token) { res.status(400).json({ error: 'Token 2FA requerido' }); return; }

            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user || !user.twoFactorSecret) { res.status(400).json({ error: 'No hay secreto 2FA generado.' }); return; }

            const totp = await getTotp();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const isValid = (totp as any).verify({ token, secret: user.twoFactorSecret });

            if (!isValid) {
                res.status(400).json({ error: 'Código 2FA incorrecto o vencido.' });
                return;
            }

            await prisma.user.update({
                where: { id: userId },
                data: { twoFactorEnabled: true }
            });

            res.json({ success: true, message: '2FA activado correctamente.' });
        } catch (error) {
            logger.error('Error verificando 2FA: %s', (error as Error).message);
            res.status(500).json({ error: 'Error interno verificando 2FA' });
        }
    }

    async disable2FA(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }

            await prisma.user.update({
                where: { id: userId },
                data: { twoFactorEnabled: false, twoFactorSecret: null }
            });

            res.json({ success: true, message: '2FA ha sido desactivado.' });
        } catch (error) {
            res.status(500).json({ error: 'Server err' });
        }
    }

    async googleLogin(req: Request, res: Response): Promise<void> {
        logger.info('>>> [DEBUG] Entrando a googleLogin');
        if (!prisma) { 
            logger.error('>>> [DEBUG] Error: Prisma no inicializado');
            res.status(503).json({ error: 'DB no disponible' }); 
            return; 
        }
        const { credential } = req.body as { credential?: string };
        if (!credential) { 
            logger.warn('>>> [DEBUG] Error: No llegó credential en el body');
            res.status(400).json({ error: 'Token de Google requerido' }); 
            return; 
        }

        logger.info('>>> [DEBUG] GOOGLE_CLIENT_ID: %s', GOOGLE_CLIENT_ID);
        if (!GOOGLE_CLIENT_ID) {
            logger.error('>>> [DEBUG] Error: GOOGLE_CLIENT_ID es undefined');
            res.status(503).json({ error: 'Google OAuth no configurado (definí GOOGLE_CLIENT_ID en backend)' });
            return;
        }

        try {
            logger.info('>>> [DEBUG] Verificando token con Google...');
            const ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            logger.info('>>> [DEBUG] Google Payload recibido para: %s', payload?.email);

            if (!payload || !payload.email) {
                logger.warn('>>> [DEBUG] Token inválido o sin email');
                res.status(400).json({ error: 'Token inválido' });
                return;
            }

            const { email, sub: googleId, name, picture: avatarUrl } = payload;
            logger.info('>>> [DEBUG] Buscando usuario en DB: %s', email);

            // Buscar usuario existente por email o googleId
            let user = await prisma.user.findFirst({
                where: { OR: [{ email }, { googleId }] }
            });

            if (user) {
                logger.info('>>> [DEBUG] Usuario encontrado (ID: %s)', user.id);
                // Si existe pero no tiene googleId, lo vinculamos
                if (!user.googleId) {
                    logger.info('>>> [DEBUG] Vinculando googleId a usuario existente');
                    user = await prisma.user.update({
                        where: { id: user.id },
                        data: { googleId, avatarUrl: user.avatarUrl || avatarUrl }
                    });
                }
            } else {
                logger.info('>>> [DEBUG] Creando nuevo usuario Google: %s', email);
                // Si no existe, lo creamos sin password
                user = await prisma.user.create({
                    data: {
                        email,
                        name: name || 'Usuario de Google',
                        googleId,
                        avatarUrl,
                    }
                });
                logger.info('>>> [DEBUG] Nuevo usuario Google registrado con éxito');
            }

            const token = signAccess({ id: user.id, email: user.email });
            const refreshToken = signRefresh({ id: user.id, email: user.email });
            logger.info('>>> [DEBUG] Login exitoso, enviando tokens.');
            res.json({ token, refreshToken, user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl } });
        } catch (error) {
            logger.error('>>> [DEBUG] Error en googleLogin CATCH: %s', (error as Error).message);
            if ((error as Error).stack) logger.error((error as Error).stack); 
            res.status(401).json({ error: 'Fallo al autenticar con Google' });
        }
    }
}

export default new AuthController();
