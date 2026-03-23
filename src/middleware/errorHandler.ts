import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { ZodError } from 'zod';

/**
 * Interfaz para errores API
 */
export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

/**
 * Clase para operaciones relacionadas con errores
 */
export class OperationalError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'OperationalError';
  }
}

/**
 * Middleware de manejo de errores global
 * - Captura y formatea errores
 * - Valida errores ZOD
 * - Envía respuestas consistentes
 */
export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const correlationId = _req.headers['x-correlation-id'] || 'unknown';

  // Errores de validación Zod
  if (err instanceof ZodError) {
    logger.warn('Validation error [%s]', correlationId, {
      issues: err.issues,
    });
    return res.status(400).json({
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: err.issues.map((e: any) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
      correlationId,
    });
  }

  // Errores operacionales
  if (err instanceof OperationalError) {
    logger.warn('Operational error [%s]: %s', correlationId, err.code, {
      message: err.message,
      statusCode: err.statusCode,
      details: err.details,
    });
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
      correlationId,
    });
  }

  // Errores desconocidos
  logger.error('Unhandled error [%s]', correlationId, {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    correlationId,
  });
};

/**
 * Wrapper para rutas async que captura errores automáticamente
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
