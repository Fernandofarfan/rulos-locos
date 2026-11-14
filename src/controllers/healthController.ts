import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';
import prisma, { databaseConfigured } from '../utils/db';
import config from '../config';
import { getRedisClient } from '../utils/cache';

const { version } = require('../../package.json') as { version: string };

async function within<T>(promise: Promise<T>, ms = 2000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Timeout')), ms); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function getDependencyChecks() {
  const database = async (): Promise<{ status: 'ok' | 'unconfigured' | 'error'; latency: number }> => {
    if (!prisma) return { status: databaseConfigured ? 'error' : 'unconfigured', latency: -1 };
    const start = Date.now();
    try { await within(prisma.$queryRaw`SELECT 1`); return { status: 'ok', latency: Date.now() - start }; }
    catch { return { status: 'error', latency: -1 }; }
  };
  const redis = async (): Promise<'ok' | 'unconfigured' | 'error'> => {
    if (!process.env.REDIS_URL) return 'unconfigured';
    try {
      const client = await within(getRedisClient());
      return client && await within(client.ping()) === 'PONG' ? 'ok' : 'error';
    } catch { return 'error'; }
  };
  const [databaseResult, redisStatus] = await Promise.all([database(), redis()]);
  return {
    checks: {
      database: databaseResult.status,
      encryption: config.ENCRYPTION_AVAILABLE ? 'ok' as const : 'unavailable' as const,
      redis: redisStatus,
    },
    databaseLatency: databaseResult.latency,
  };
}

export const getApiHealth = asyncHandler(async (_req: Request, res: Response) => {
  const { checks } = await getDependencyChecks();
  const status = checks.database === 'ok' && checks.encryption === 'ok' && checks.redis !== 'error' ? 'ok' : 'degraded';
  res.status(200).json({ status, version, checks });
});

/**
 * Health check del servidor
 * - Verifica que Express esté corriendo
 * - Valida conexión a BD
 * - Retorna stats básicos
 */
export const getHealth = asyncHandler(async (_req: Request, res: Response) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const { checks, databaseLatency } = await getDependencyChecks();
  const status = checks.database === 'ok' && checks.encryption === 'ok' && checks.redis !== 'error' ? 'healthy' : 'degraded';
  res.status(200).json({
    status,
    checks,
    timestamp: new Date().toISOString(),
    uptime: Math.round(uptime),
    uptimeReadable: formatUptime(uptime),
    database: {
      status: checks.database === 'ok' ? 'connected' : checks.database === 'unconfigured' ? 'unavailable' : 'error',
      latency: databaseLatency,
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
  if (!prisma) {
    res.status(503).json({ ready: false, reason: 'database_unavailable' });
    return;
  }
  try {
    await within(prisma.$queryRaw`SELECT 1`);
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
