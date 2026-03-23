import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import logger from '../utils/logger';

/**
 * Middleware que agrega:
 * - Correlation ID único para cada request
 * - Timing de requests
 * - Logging automático de request/response
 */
export const requestTracking = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req.headers['x-correlation-id'] as string) ?? randomUUID();
  const startTime = Date.now();

  // Agregar tracking al objeto request
  (req as any).correlationId = correlationId;
  (req as any).startTime = startTime;

  // Setear header de response
  res.setHeader('x-correlation-id', correlationId);

  // Log de inicio (solo en desarrollo o para rutas críticas)
  if (process.env.NODE_ENV !== 'production' || req.path.includes('/api/auth')) {
    logger.debug('→ %s %s [%s]', req.method, req.path, correlationId);
  }

  // Interceptar response para logging
  const originalSend = res.send.bind(res);
  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log de finalización
    if (process.env.NODE_ENV !== 'production' || statusCode >= 400) {
      logger.info('← %s %s %d [%s] %dms', 
        req.method, 
        req.path, 
        statusCode, 
        correlationId,
        duration
      );
    }

    // Agregar headers de timing
    res.setHeader('x-response-time', `${duration}ms`);

    return originalSend(data) as Response;
  };

  next();
};

/**
 * Extiende Express Request con propiedades de tracking
 */
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      startTime?: number;
    }
  }
}
