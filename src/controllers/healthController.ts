import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';
import prisma from '../utils/db';

/**
 * Health check del servidor
 * - Verifica que Express esté corriendo
 * - Valida conexión a BD
 * - Retorna stats básicos
 */
export const getHealth = asyncHandler(async (_req: Request, res: Response) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  // Validar BD
  let dbStatus = 'disconnected';
  let dbLatency = -1;
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - start;
    dbStatus = 'connected';
  } catch (error) {
    logger.error('Health check: DB connection failed', error);
    dbStatus = 'error';
  }

  const status = dbStatus === 'connected' ? 'healthy' : 'degraded';
  const statusCode = status === 'healthy' ? 200 : 503;

  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: Math.round(uptime),
    uptimeReadable: formatUptime(uptime),
    database: {
      status: dbStatus,
      latency: dbLatency,
    },
    memory: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      nodeVersion: process.version,
    },
    correlationId: _req.correlationId,
  });
});

/**
 * Ready check - confirma que el servidor está listo para recibir requests
 */
export const getReady = asyncHandler(async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ready: true });
  } catch (error) {
    logger.error('Ready check failed: DB not accessible', error);
    res.status(503).json({ ready: false, reason: 'database_unavailable' });
  }
});

/**
 * Metrics básicos del servidor (sin exponer datos sensibles)
 */
export const getMetrics = asyncHandler(async (_req: Request, res: Response) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  res.json({
    metrics: {
      uptime,
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
      },
    },
    timestamp: new Date().toISOString(),
  });
});

// Helper functions
function formatUptime(seconds: number): string {
  const units = [
    { label: 'd', seconds: 86400 },
    { label: 'h', seconds: 3600 },
    { label: 'm', seconds: 60 },
  ];

  const parts: string[] = [];
  let remaining = seconds;

  for (const unit of units) {
    const count = Math.floor(remaining / unit.seconds);
    if (count > 0) {
      parts.push(`${count}${unit.label}`);
      remaining -= count * unit.seconds;
    }
  }

  const s = Math.floor(remaining);
  if (s > 0) parts.push(`${s}s`);

  return parts.length === 0 ? '0s' : parts.join(' ');
}
