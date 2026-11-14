import express from 'express';
import authController from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { authLimiter, sessionLimiter } from '../middleware/rateLimiters';
import { validateBody, RegisterSchema, LoginSchema } from '../middleware/validate';

const router = express.Router();

router.post('/register', authLimiter, validateBody(RegisterSchema), (req, res) => authController.register(req, res));
router.post('/login', authLimiter, validateBody(LoginSchema), (req, res) => authController.login(req, res));
router.post('/google', authLimiter, (req, res) => authController.googleLogin(req, res));
router.post('/refresh', sessionLimiter, (req, res) => authController.refresh(req, res));
router.post('/logout', sessionLimiter, (req, res) => authController.logout(req, res));
router.get('/me', authenticateToken, (req, res) => authController.me(req, res));

router.post('/2fa/generate', authenticateToken, (req, res) => authController.generate2FA(req, res));
router.post('/2fa/verify', authenticateToken, (req, res) => authController.verifyAndEnable2FA(req, res));
router.post('/2fa/disable', authenticateToken, (req, res) => authController.disable2FA(req, res));

export default router;
