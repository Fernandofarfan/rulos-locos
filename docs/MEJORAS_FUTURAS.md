# 🚀 Roadmap de Mejoras - Rulos Locos v3.0.0

## ✅ Implementado: V3.0.0 PRO (Marzo 2026)

### 🥇 Estabilización Profunda y Typescript Clean
- [x] Corrección de los 60+ errores de Typescript reportados en el proyecto entero.
- [x] Eliminación de Dead Code, Imports sin usar y Refactoring de jerarquía Types.
- [x] Aplicación rigurosa de `verbatimModuleSyntax` para separar el scope de valores del Scope Tipos (`import type { ... }`).

### 🥇 Migración Infraestructura a Nube
- [x] Abandono total de SQLite (`better-sqlite3`) y refactorización del Schema a PostgreSQL compatibilidad total.
- [x] Integración vía Prisma con **Supabase**, utilizando PGBouncer nativo para Vercel Serverless.
- [x] Despliegue productivo continuo con Vercel.

### 🥇 Core de Auth Resuelto
- [x] Interceptor Global Axios configurado. Todas las llamadas al backend ahora emiten el Token JWT.
- [x] Corregidas fallas intermitentes del botón de Login de Google provocado por mala lectura de variables `VITE_`.
- [x] Habilitado bono de $1.000.000 al instante en el simulador Paper Trading.

---

## ✅ Implementado: V3.1.0 - Quality & Features (Mayo 2026)

### 🛡️ Calidad de Código
- [x] ESLint configurado para backend (`eslint.config.js` en raíz) con reglas TypeScript estrictas.
- [x] CI/CD actualizado: nuevo job de **Playwright E2E** en GitHub Actions + lint en backend y frontend.
- [x] 24 nuevos tests unitarios para servicios backend (`tests/services.test.js`).
- [x] 14 nuevos tests frontend para componentes y lógica (`client/src/__tests__/components.test.tsx`).
- [x] Total: 73 tests pasando (49 API + 24 servicios) en backend.

### 🌐 Features Nuevas
- [x] **API Versioning**: endpoints ahora disponibles en `/api/v1/*` con compatibilidad hacia atrás.
- [x] **Landing Page Pública**: página de bienvenida con cotizaciones en vivo, features y CTA, visible sin login.
- [x] **Conexión Real a Exchanges**: servicio `exchangeService.ts` usando ccxt para Binance y otros exchanges.
- [x] **Ranking de FCIs y ONs**: nuevo endpoint `/api/economics/renta-fija` con datos de Obligaciones Negociables y FCI por categoría.
- [x] **Newsletter por Email**: el resumen diario ahora se envía también por email a todos los usuarios registrados.
- [x] **Dark Mode por Sistema**: detección automática de `prefers-color-scheme` con fallback a localStorage.
- [x] **i18n Expandido**: 80+ claves de traducción en ES, EN y PT.
- [x] **Push Notifications VAPID**: documentadas en `.env.example` con instrucciones de generación.
- [x] **Paper Trading Tier Limits**: endpoint `/api/paper-trading/usage` con límite de 20 operaciones/día para tier free.

### 📊 Ya existente (confirmado)
- [x] Gráfico de velas con RSI, MACD, Bollinger Bands, EMA(20) y volumen (`CandlestickChart.tsx`).
- [x] Exportación PDF programática con datos macro, tasas y mercados (`PDFExport.tsx`).

---

## 📅 Roadmap Próximos Sprints (Post v3.1)

### Sprint v3.2: Advanced Analytics & AI
- [ ] Incorporación de métricas de Riesgo Estructural: Volatility, Skewness, y Sortino ratio.
- [ ] Ampliación de Gemini AI: Chat contextual dentro de Rulos Locos donde el usuario puede consultar su portafolio a la IA.
- [ ] Alertas Predictivas Inteligentes (IA despachando Push Notifications basadas en volatilidad del CCL).

### Sprint v3.3: Backtesting & Projections
- [ ] Motor de simulación histórica: Permitir a los usuarios "Jugar" a invertir $X en Enero 2022 y ver resultados a valores presentes reales.
- [ ] Collaboration y Ranking Multi-usuario: Tablas de clasificación con los mayores rendimientos en Paper Trading de la plataforma.

### Sprint v3.4: Optimization & QA
- [ ] Caché distribuido con Redis (Upstash) interconectado.
- [ ] Reducción masiva de payloads: Implementar compresión avanzada y Serialización JSON super optimizada para endpoints voluminosos (Gráficos Anuales).
- [ ] Monorepo tooling: Turborepo o Nx para builds paralelos y caché de tareas.
