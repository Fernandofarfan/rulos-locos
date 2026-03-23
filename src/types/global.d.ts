/**
 * Tipos globales extendidos para la aplicación
 */

declare global {
  namespace Express {
    interface Request {
      /**
       * ID único para tracking de cada request
       */
      correlationId?: string;
      
      /**
       * Timestamp de inicio del request (ms)
       */
      startTime?: number;
      
      /**
       * Usuario autenticado (si JWT válido)
       */
      user?: {
        id: string;
        email: string;
        role: 'user' | 'admin';
      };
    }
  }
}

/**
 * Respuesta estándar de API
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  correlationId: string;
  timestamp: string;
}

/**
 * Paginación de resultados
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Cache metadata
 */
export interface CacheMetadata {
  cachedAt: Date;
  expiresAt: Date;
  ttl: number; // segundos
}

/**
 * Configuración de servicios externos
 */
export interface ExternalServiceConfig {
  timeout: number;
  retries: number;
  backoff: 'linear' | 'exponential';
  fallback?: any;
}

export {};
