# Guía de Arquitectura - Rulos Locos

## Estructura del Proyecto

```
src/
├── middleware/          # Middlewares Express
│   ├── auth.ts
│   ├── errorHandler.ts      (NEW) - Manejo centralizado de errores
│   ├── requestTracking.ts   (NEW) - Tracking de requests con correlation IDs
│   └── validation.ts        (NEW) - Validación de input con Zod
├── controllers/
│   ├── healthController.ts  (NEW) - Health checks para producción
│   └── ...
├── routes/
│   ├── health.routes.ts     (NEW) - Rutas de salud del servidor
│   └── ...
├── services/
│   └── ...
├── utils/
│   ├── helpers.ts           (NEW) - Funciones de utilidad comunes
│   ├── constants.ts         (NEW) - Constantes globales de la app
│   ├── schemas.ts           (NEW) - Esquemas Zod reutilizables
│   └── logger.ts
└── types/
    └── global.d.ts          (NEW) - Tipos globales extendidos
```

## Mejoras Implementadas

### 1. **Error Handling Centralizado**
- Middleware `errorHandler.ts` captura todos los errores
- Responde con formato estándar JSON
- Maneja específicamente ZodError, OperationalError, y genéricos
- Correlation ID en cada error para debugging

**Uso:**
```typescript
import { OperationalError } from '@/middleware/errorHandler';

throw new OperationalError(
  400,
  'INVALID_INPUT',
  'El email ya está registrado',
  { email }
);
```

### 2. **Request Tracking**
- Cada request obtiene un Correlation ID único (uuid)
- Tracking automático de timing de requests
- Logging de inicio/fin con performance metrics
- Headers de response: `x-correlation-id`, `x-response-time`

### 3. **Health Checks para Producción**
- `GET /healthz` - Liveness probe (¿servidor corriendo?)
- `GET /readyz` - Readiness probe (¿listo para requests?)
- `GET /metrics` - Métricas del servidor (memoria, uptime)
- Verifica estado de BD en healthz

**Uso en Kubernetes/Docker:**
```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /readyz
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### 4. **Validación Centralizada con Zod**
Esquemas reutilizables en `src/utils/schemas.ts`

**Uso:**
```typescript
import { composedSchemas } from '@/utils/schemas';
import { validateRequest } from '@/middleware/validation';

router.post(
  '/login',
  validateRequest(composedSchemas.auth.login, 'body'),
  loginController
);
```

### 5. **Constantes Globales**
En `src/utils/constants.ts`:
- `ERROR_CODES` - Códigos de error estándar
- `HTTP_CODES` - Status codes
- `RATE_LIMITS` - Límites de rate limiting
- `CACHE_TTL` - Tiempos de cache
- Instrumentos financieros, roles de usuario, etc.

**Uso:**
```typescript
import { ERROR_CODES, HTTP_CODES } from '@/utils/constants';

if (!user) {
  throw new OperationalError(
    HTTP_CODES.NOT_FOUND,
    ERROR_CODES.USER_NOT_FOUND,
    'Usuario no encontrado'
  );
}
```

### 6. **Helpers de Utilidad**
En `src/utils/helpers.ts`:
- `retryWithBackoff()` - Retry con backoff exponencial
- `withTimeout()` - Timeout para promises
- `batch()` - Procesamiento en lotes
- `debounce()`, `throttle()` - Rate limiting de funciones
- `formatBytes()`, `formatCurrency()` - Formateo
- `deepMerge()`, `calculatePercentChange()` - Utilitarios

**Uso:**
```typescript
import { retryWithBackoff, formatCurrency } from '@/utils/helpers';

const data = await retryWithBackoff(
  () => externalApi.fetch(),
  3,  // maxRetries
  100 // backoffMs
);

console.log(formatCurrency(12345.67, 'ARS'));
```

### 7. **Graceful Shutdown**
Servidor cierra apropiadamente:
- Detiene aceptar nuevas conexiones
- Cierra conexiones Socket.io activas
- Desconecta BD
- Timeout de 30 segundos para forzar salida
- Maneja SIGTERM/SIGINT

### 8. **Tipos Globales Extendidos**
En `src/types/global.d.ts`:
```typescript
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      startTime?: number;
      user?: { id: string; email: string; role: 'user' | 'admin' };
    }
  }
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: any };
  correlationId: string;
  timestamp: string;
}
```

## Patrones de Uso

### Crear un Endpoint Seguro
```typescript
import { Router } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { validateRequest } from '@/middleware/validation';
import { composedSchemas } from '@/utils/schemas';
import { OperationalError } from '@/middleware/errorHandler';
import { ERROR_CODES, HTTP_CODES } from '@/utils/constants';

const router = Router();

router.post(
  '/portfolio',
  validateRequest(composedSchemas.portfolio.createPosition, 'body'),
  asyncHandler(async (req, res) => {
    // req.body está validado
    const { symbol, quantity, entryPrice } = req.body;

    // Buscar usuario (asumiendo middleware de auth)
    const portfolio = await db.portfolio.create({
      userId: req.user.id,
      symbol,
      quantity,
      entryPrice,
    });

    res.status(201).json({
      success: true,
      data: portfolio,
      correlationId: req.correlationId,
    });
  })
);

export default router;
```

### Llamar a Servicio Externo con Retry
```typescript
import { retryWithBackoff, withTimeout } from '@/utils/helpers';

const getPrice = async (symbol: string) => {
  return await withTimeout(
    retryWithBackoff(
      () => externalApi.getPrice(symbol),
      3,      // retries
      100,    // backoff ms
      'exponential'
    ),
    5000  // 5 segundos timeout
  );
};
```

### Cachear Datos
```typescript
import { CACHE_TTL } from '@/utils/constants';

const getCachedData = async (key: string, fn: () => Promise<any>) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL.MEDIUM * 1000) {
    return cached.data;
  }

  const data = await fn();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
};
```

## Best Practices

### ✅ DO
- Usar `asyncHandler()` wrapper en endpoints
- Validar input con Zod schemas
- Lanzar `OperationalError` para errores esperados
- Usar error codes y HTTP codes de constantes
- Agregar JSDoc a funciones públicas
- Usar logger en lugar de console.log
- Incluir correlation IDs en logs

### ❌ DON'T
- No lanzar strings como errores (`throw 'error'`)
- No usar console.log en producción
- No olvidar try-catch en promises
- No validar manualmente strings
- No hardcodear valores/constantes

## Próximas Mejoras

- [ ] Middleware de autenticación mejorado con JWT
- [ ] Rate limiting por usuario
- [ ] Caché distribuido con Redis
- [ ] Métricas con Prometheus
- [ ] Tracing distribuido con Jaeger
- [ ] API documentation mejorada con OpenAPI/Swagger
- [ ] E2E testing con Cypress
- [ ] Load testing con k6
- [ ] Feature flags
- [ ] A/B testing
