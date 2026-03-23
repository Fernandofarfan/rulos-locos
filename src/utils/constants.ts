/**
 * Constantes globales de la aplicación
 */

/**
 * Códigos de error estándar
 */
export const ERROR_CODES = {
  // 400 - Bad Request
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',
  
  // 401 - Unauthorized
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  NO_TOKEN: 'NO_TOKEN',
  
  // 403 - Forbidden
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // 404 - Not Found
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  
  // 409 - Conflict
  DUPLICATE: 'DUPLICATE',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  
  // 429 - Too Many Requests
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // 500 - Internal Server Error
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  
  // Custom
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
};

/**
 * HTTP Status codes
 */
export const HTTP_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  RATE_LIMIT_ERROR: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * Límites de rate limiting
 */
export const RATE_LIMITS = {
  GENERAL: { windowMs: 15 * 60 * 1000, max: 500 },
  AUTH: { windowMs: 15 * 60 * 1000, max: 20 },
  AI: { windowMs: 15 * 60 * 1000, max: 30 },
  AUTHENTICATED: { windowMs: 15 * 60 * 1000, max: 1000 },
};

/**
 * Timeouts para servicios externos (ms)
 */
export const TIMEOUTS = {
  DEFAULT: 5000,
  EXTERNAL_API: 8000,
  DATABASE: 10000,
  SOCKET_IO: 30000,
};

/**
 * TTL para cache (segundos)
 */
export const CACHE_TTL = {
  VERY_SHORT: 60,           // 1 minuto
  SHORT: 5 * 60,             // 5 minutos
  MEDIUM: 15 * 60,           // 15 minutos
  LONG: 60 * 60,             // 1 hora
  VERY_LONG: 24 * 60 * 60,   // 1 día
};

/**
 * Patrones de email
 */
export const EMAIL_PATTERNS = {
  VALID: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  ARG_GOV: /\.gov\.ar$/i,
};

/**
 * Ambientes soportados
 */
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
} as const;

/**
 * Monedas soportadas
 */
export const CURRENCIES = {
  ARS: 'ARS',
  USD: 'USD',
  BTC: 'BTC',
  ETH: 'ETH',
};

/**
 * Roles de usuario
 */
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
} as const;

/**
 * Estados de órdenes
 */
export const ORDER_STATUS = {
  PENDING: 'pending',
  FILLED: 'filled',
  PARTIALLY_FILLED: 'partially_filled',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
} as const;

/**
 * Tipos de alertas
 */
export const ALERT_TYPES = {
  PRICE_ALERT: 'price_alert',
  NEWS_ALERT: 'news_alert',
  ARBITRAGE_ALERT: 'arbitrage_alert',
  SYSTEM_ALERT: 'system_alert',
} as const;

/**
 * Canales de notificación
 */
export const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  TELEGRAM: 'telegram',
  PUSH: 'push',
  SMS: 'sms',
} as const;

/**
 * Instrumentos financieros comunes
 */
export const INSTRUMENTS = {
  BLUE: 'BLUE',
  MEP: 'MEP',
  CCL: 'CCL',
  OFICIAL: 'OFICIAL',
  CRIPTO_USDT: 'USDT/ARS',
  BTC: 'BTC',
  ETH: 'ETH',
  SOJA: 'SOJA',
  MAIZ: 'MAIZ',
  TRIGO: 'TRIGO',
  ORO: 'ORO',
  PETR: 'PETR',
  MERVAL: 'MERVAL',
  SP500: 'SP500',
  NDQ: 'NDQ',
} as const;
