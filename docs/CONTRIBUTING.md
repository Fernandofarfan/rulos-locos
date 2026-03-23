# Contribución & Testing - Rulos Locos

## Requisitos para Contribuir

### Instalación del Ambiente de Desarrollo

```bash
# 1. Clone el repo
git clone https://github.com/Fernandofarfan/rulos-locos.git
cd rulos-locos

# 2. Instalar Node.js (v18+)
node --version  # Debe ser >= 18

# 3. Instalar dependencias
npm install

# 4. Setup Prisma
npx prisma generate
npx prisma db push

# 5. Crear archivo .env
cp .env.example .env
# Editar con tus valores

# 6. Iniciar servidor
npm run dev:full
```

## Ejecutar Tests

### Tests del Backend

```bash
# Todos los tests
npm test

# Un archivo específico
npm test -- api.test.js

# Con cobertura
npm test -- --coverage

# Watch mode (re-run al cambiar archivos)
npm test -- --watch

# Verbose output
npm test -- --verbose
```

### Tests del Frontend

```bash
# Con Vitest (en cliente/)
cd client
npm run test

# Con Playwright (E2E)
npm run test:e2e

# Con ESLint
npm run lint
```

## Estructura de Tests

```
tests/
├── api.test.js          # Tests integración backend
├── unit/
│   ├── helpers.test.ts
│   └── schemas.test.ts
├── integration/
│   ├── auth.test.ts
│   ├── portfolio.test.ts
│   └── commodities.test.ts
└── fixtures/
    └── mock-data.ts
```

## Escribir Tests

### Test Básico

```typescript
import request from 'supertest';
import app from '../src/app';

describe('GET /healthz', () => {
  it('should return health status', async () => {
    const response = await request(app).get('/healthz');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status');
    expect(response.body.status).toBe('healthy');
  });
});
```

### Test con Base de Datos

```typescript
import prisma from '../src/utils/db';

describe('User Service', () => {
  beforeAll(async () => {
    // Setup
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    // Cleanup
    await prisma.$disconnect();
  });

  it('should create a user', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@test.com',
        password: 'hashed',
        name: 'Test User',
      },
    });

    expect(user.email).toBe('test@test.com');
  });
});
```

### Test de Validación

```typescript
import { composedSchemas } from '../src/utils/schemas';

describe('Auth Schemas', () => {
  it('should validate email format', () => {
    const schema = composedSchemas.auth.login;

    const validData = {
      email: 'user@example.com',
      password: 'SecurePass123',
    };

    const result = schema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const schema = composedSchemas.auth.login;
    const invalidData = {
      email: 'not-an-email',
      password: 'SecurePass123',
    };

    const result = schema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
```

### Test de Helpers

```typescript
import { 
  retryWithBackoff, 
  formatCurrency, 
  calculatePercentChange 
} from '../src/utils/helpers';

describe('Helpers', () => {
  it('should retry on failure', async () => {
    let attempts = 0;
    
    const result = await retryWithBackoff(
      async () => {
        attempts++;
        if (attempts < 3) throw new Error('Fail');
        return 'success';
      },
      3,
      10
    );

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should format currency', () => {
    const formatted = formatCurrency(1234.56, 'USD');
    expect(formatted).toContain('1,234.56');
  });

  it('should calculate percent change', () => {
    const change = calculatePercentChange(100, 150);
    expect(change).toBe(50);
  });
});
```

## Code Quality

### ESLint

```bash
# Chequear lint
npm run lint

# Fixear problemas automáticos
npm run lint -- --fix
```

### TypeScript

```bash
# Chequear tipos sin compilar
npm run typecheck

# Compilar
npm run build:ts
```

### Prettier (Formateo)

```bash
# Formatear código
npx prettier --write "src/**/*.{ts,tsx,js,jsx}"

# Ver diferencias
npx prettier --check "src/**/*.{ts,tsx,js,jsx}"
```

## Git Workflow

### 1. Crear Feature Branch

```bash
git checkout -b feature/my-feature
# o
git checkout -b fix/my-bug
```

### 2. Hacer Commits

```bash
# Conventional Commits
git commit -m "feat: agregar nuevo componente"
git commit -m "fix: corregir bug en validación"
git commit -m "docs: mejorar README"
git commit -m "test: agregar tests para helpers"
```

### 3. Push y Pull Request

```bash
git push origin feature/my-feature
# Crear PR en GitHub
```

### 4. CI/CD Automático

- GitHub Actions ejecuta tests automáticamente
- Debe pasar ESLint, TypeScript, Jest antes de mergear

## Conventional Commits

Usar este formato para commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - Nueva funcionalidad
- `fix` - Bug fix
- `docs` - Cambios de documentación
- `style` - Cambios que no afectan lógica (spacing, formatting)
- `refactor` - Refactorización de código
- `perf` - Mejoras de performance
- `test` - Agregar/actualizar tests
- `chore` - Cambios de build, deps, etc.

**Ejemplos:**
```
feat(auth): agregar 2FA con TOTP
fix(portfolio): corregir cálculo de rentabilidad
docs(api): actualizar swagger documentation
test(commodities): aumentar cobertura a 90%
refactor(database): mejorar queries con indexes
```

## Checklist Antes de Hacer PR

- [ ] Tests pasan (`npm test`)
- [ ] ESLint no tiene errores (`npm run lint`)
- [ ] TypeScript compila sin errores (`npm run typecheck`)
- [ ] Cambios documentados en README o docs/
- [ ] Commits siguen Conventional Commits
- [ ] Sin console.log en producción (usar logger)
- [ ] Errores manejados con OperationalError
- [ ] Nuevas funciones tienen JSDoc
- [ ] No hay dependencias innecesarias

## Debugging

### VSCode Launch Config

Agregar a `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "program": "${workspaceFolder}/src/server.ts",
      "preLaunchTask": "tsc: build",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Con Node Inspector

```bash
# Iniciar con debugger
node --inspect-brk dist/server.js

# Ir a chrome://inspect
```

### Logs Estructurados

```typescript
import logger from '@/utils/logger';

// En lugar de:
console.log('User created', user);

// Hacer:
logger.info('User created successfully', {
  userId: user.id,
  email: user.email,
  timestamp: new Date(),
});
```

## Problemas Comunes

### Error: "Cannot find module '@/utils/logger'"

El alias `@/` debe estar configurado en `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Error: "EACCES: permission denied"

```bash
# Cambiar permisos
chmod +x node_modules/.bin/*
```

### Puerto ya ocupado

```bash
# Encontrar proceso en puerto 3000
lsof -i :3000

# Matar proceso
kill -9 <PID>

# O cambiar puerto
PORT=3001 npm run dev:backend
```

### Prisma fuera de sync

```bash
npx prisma migrate resolve --rolled-back <migration-id>
npx prisma db push
```

## Performance Profiling

### Node.js Built-in Profiler

```bash
node --prof dist/server.js
# Generar perfil
node --prof-process isolate-*.log > profile.txt
```

### Clinic.js

```bash
npm i -g clinic

# Doctor (diagnóstico general)
clinic doctor -- node dist/server.js

# Bubble profiling
clinic bubbleprof -- node dist/server.js
```

## Recursos

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Jest Testing](https://jestjs.io/docs/getting-started)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
