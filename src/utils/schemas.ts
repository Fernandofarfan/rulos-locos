/**
 * Esquemas de validación centralizados con Zod
 * Reutilizables en toda la aplicación
 */

import { z } from 'zod';

// Primitivas comunes
export const schemas = {
  // Email
  email: z.string().email('Email inválido').toLowerCase(),
  
  // Password (mínimo 8 caracteres, al menos 1 mayúscula, 1 número)
  password: z.string()
    .min(8, 'Password mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos 1 mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos 1 número'),
  
  // Nombre
  name: z.string()
    .min(2, 'Nombre mínimo 2 caracteres')
    .max(100, 'Nombre máximo 100 caracteres'),
  
  // ID de Mongo
  mongoId: z.string().regex(/^[0-9a-f]{24}$/i, 'ID inválido'),
  
  // Número positivo
  positiveNumber: z.number().positive('Debe ser positivo'),
  
  // Número entre 0 y 1 (porcentaje decimal)
  percentage: z.number().min(0).max(1),
  
  // URL
  url: z.string().url('URL inválida'),
  
  // ISO Date
  isoDate: z.string().datetime('Fecha inválida'),
  
  // Paginación
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
};

// Schemas compuestos
export const composedSchemas = {
  /**
   * Autenticación
   */
  auth: {
    register: z.object({
      email: schemas.email,
      password: schemas.password,
      name: schemas.name,
    }),
    login: z.object({
      email: schemas.email,
      password: z.string().min(1, 'Password requerido'),
    }),
    resetPassword: z.object({
      email: schemas.email,
    }),
    changePassword: z.object({
      currentPassword: z.string().min(1, 'Password actual requerido'),
      newPassword: schemas.password,
    }),
  },

  /**
   * Portfolio
   */
  portfolio: {
    createPosition: z.object({
      symbol: z.string().min(1).max(20),
      quantity: schemas.positiveNumber,
      entryPrice: schemas.positiveNumber,
      notes: z.string().max(500).optional(),
    }),
    updatePosition: z.object({
      quantity: schemas.positiveNumber.optional(),
      entryPrice: schemas.positiveNumber.optional(),
      notes: z.string().max(500).optional(),
    }),
  },

  /**
   * Alertas
   */
  alerts: {
    createAlert: z.object({
      symbol: z.string().min(1).max(20),
      condition: z.enum(['above', 'below']),
      price: schemas.positiveNumber,
      channels: z.array(z.enum(['email', 'telegram', 'push'])).min(1),
    }),
  },

  /**
   * Paginación
   */
  pagination: {
    query: z.object({
      page: schemas.page,
      pageSize: schemas.pageSize,
      search: z.string().max(100).optional(),
      sort: z.string().max(50).optional(),
    }),
  },
};

// Tipos TypeScript derivados de Zod
export type RegisterInput = z.infer<typeof composedSchemas.auth.register>;
export type LoginInput = z.infer<typeof composedSchemas.auth.login>;
export type CreatePositionInput = z.infer<typeof composedSchemas.portfolio.createPosition>;
export type CreateAlertInput = z.infer<typeof composedSchemas.alerts.createAlert>;
export type PaginationQuery = z.infer<typeof composedSchemas.pagination.query>;
