/**
 * Middleware de validación mejorado usando Zod
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import logger from '../utils/logger';
import { OperationalError } from './errorHandler';
import { ERROR_CODES, HTTP_CODES } from '../utils/constants';

/**
 * Middleware factory para validar Request body, params o query
 */
export const validateRequest = (
  schema: ZodSchema,
  location: 'body' | 'params' | 'query' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataToValidate = location === 'body' ? req.body : 
                           location === 'params' ? req.params : 
                           req.query;

      const validated = schema.parse(dataToValidate);
      
      // Reemplazar el objeto original con los datos validados
      if (location === 'body') req.body = validated as any;
      else if (location === 'params') req.params = validated as any;
      else req.query = validated as any;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn(`Validation error in ${location} [${req.correlationId}]`, {
          issues: error.issues,
        });

        const details = error.issues.map((e: any) => ({
          path: e.path.join('.'),
          code: e.code,
          message: e.message,
        }));

        throw new OperationalError(
          HTTP_CODES.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR,
          'Validation error',
          details
        );
      }
      next(error);
    }
  };
};

/**
 * Valida un objeto contra un schema
 */
export async function validateObject<T>(
  data: unknown,
  schema: ZodSchema
): Promise<T> {
  try {
    return schema.parse(data) as T;
  } catch (error) {
    if (error instanceof ZodError) {
      throw new OperationalError(
        HTTP_CODES.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        'Validation failed',
        error.issues
      );
    }
    throw error;
  }
}

/**
 * Middleware combinado que valida múltiples locations
 */
export const validateRequestFull = (schemas: {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: any[] = [];

    const validate = (data: unknown, schema: ZodSchema | undefined, location: string) => {
      if (!schema) return;
      try {
        schema.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push({
            location,
            details: error.issues.map((e: any) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          });
        }
      }
    };

    validate(req.body, schemas.body, 'body');
    validate(req.params, schemas.params, 'params');
    validate(req.query, schemas.query, 'query');

    if (errors.length > 0) {
      logger.warn(`Multiple validation errors [${req.correlationId}]`, errors);
      throw new OperationalError(
        HTTP_CODES.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        'Multiple validation errors',
        errors
      );
    }

    next();
  };
};
