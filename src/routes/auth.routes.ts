import express from 'express';
import rateLimit from 'express-rate-limit';
import authController from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Demasiados intentos de inicio de sesión, intente más tarde.' },
});

router.post('/register', authLimiter, (req, res) => authController.register(req, res));
router.post('/login', authLimiter, (req, res) => authController.login(req, res));
router.post('/google', authLimiter, (req, res) => authController.googleLogin(req, res));
router.post('/refresh', authLimiter, (req, res) => authController.refresh(req, res));
router.get('/me', authenticateToken, (req, res) => authController.me(req as Parameters<typeof authController.me>[0], res));

router.post('/2fa/generate', authenticateToken, (req, res) => authController.generate2FA(req as any, res));
router.post('/2fa/verify', authenticateToken, (req, res) => authController.verifyAndEnable2FA(req as any, res));
router.post('/2fa/disable', authenticateToken, (req, res) => authController.disable2FA(req as any, res));

export default router;
