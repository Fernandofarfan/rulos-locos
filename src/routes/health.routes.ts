import { Router } from 'express';
import { getHealth, getReady, getMetrics } from '../controllers/healthController';

const router = Router();

/**
 * Health check endpoints para Kubernetes, Docker, Load Balancers, etc.
 * 
 * GET  /healthz         - Liveness probe (¿el servidor está corriendo?)
 * GET  /readyz          - Readiness probe (¿está listo para recibir requests?)
 * GET  /metrics         - Métricas básicas sin datos sensibles
 */

router.get('/healthz', getHealth);
router.get('/readyz', getReady);
router.get('/metrics', getMetrics);

export default router;
