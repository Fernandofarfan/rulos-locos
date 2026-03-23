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

## 📅 Roadmap Próximos Sprints (Post v3.0)

### Sprint v3.1: Advanced Analytics & AI
- [ ] Incorporación de métricas de Riesgo Estructural: Volatility, Skewness, y Sortino ratio.
- [ ] Ampliación de Gemini AI: Chat contextual dentro de Rulos Locos donde el usuario puede consultar su portafolio a la IA.
- [ ] Alertas Predictivas Inteligentes (IA despachando Push Notifications basadas en volatilidad del CCL).

### Sprint v3.2: Backtesting & Projections
- [ ] Motor de simulación histórica: Permitir a los usuarios "Jugar" a invertir $X en Enero 2022 y ver resultados a valores presentes reales.
- [ ] Collaboration y Ranking Multi-usuario: Tablas de clasificación con los mayores rendimientos en Paper Trading de la plataforma.

### Sprint v3.3: Optimization & QA
- [ ] Caché distribuido con Redis (Upstash) interconectado.
- [ ] Reducción masiva de payloads: Implementar compresión avanzada y Serialización JSON super optimizada para endpoints voluminosos (Gráficos Anuales).
