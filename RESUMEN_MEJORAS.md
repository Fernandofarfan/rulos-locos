# 📋 Resumen Histórico de Mejoras - Rulos Locos v3.0.0

**Estado actual**: Producción Estable (Vercel + Supabase)
**Fecha de último Release**: Marzo 2026

Rulos Locos v3.0.0 culminó un ciclo intensivo de QA, depuración y migración de infraestructura para convertirse en una plataforma verdaderamente "Enterprise-Ready".

---

## 🚀 Logros Críticos (Release v3.0.0)

### 1️⃣ **Migración a Cloud Database (Supabase)**
- Se erradicó el uso de SQLite (`better-sqlite3`) en el entorno de producción que causaba fallos nativos de C++ en Vercel.
- Se migró toda la capa de datos (`prisma/schema.prisma`) al protocolo nativo de PostgreSQL conectado a **Supabase** usando conexión pgbouncer (`?pgbouncer=true`).
- Degradamos temporalmente Prisma a la versión estable 6.4.1 para máxima compatibilidad con el entorno Serverless de Vercel y el engine de PostgreSQL.

### 2️⃣ **Zero TypeScript Errors (Frontend & Backend)**
- El frontend atravesó una auditoría estricta de compilación (`tsc --noEmit`), resolviendo más de **60 errores heredados**.
- **Cambios aplicados:**
  1. Limpieza total de imports e iconografías (`lucide-react`) no utilizadas en los 35+ componentes.
  2. Implementación de `verbatimModuleSyntax`, separando imports reales de los imports de tipado usando `import type`.
  3. Resolución de tipos inseguros (`any` implícitos) y ajuste en las firmas de hooks mutables (`useDashboardData`).

### 3️⃣ **Google OAuth Sincronizado**
- Se reconstruyó la conexión de Google Login. Se detectó que faltaba la variable fundamental en el bundle de Vite (`VITE_GOOGLE_CLIENT_ID`).
- Se rediseñó la inyección en tiempo de compilación.
- El usuario ahora puede registrarse automáticamente con su cuenta Google o hacer cross-login si su cuenta tradicional comparte el mismo email.

### 4️⃣ **Interceptor Axios (Paper Trading Fix)**
- **El Problema**: Las llamadas a los endpoints de la API como `paperTradingApi` o `portfolioApi` fallaban de modo silencioso (retornando saldo $0) debido a la ausencia del Token JWT en las peticiones.
- **La Solución**: Se agregó un **Request Interceptor** al cliente genérico de Axios en `src/services/api.ts` para que extraiga de forma dinámica el token `rl_token` y autorice las peticiones de simulador y portafolios. **Bono de $1M ARS rehabilitado para nuevos usuarios simuladores**.

---

## ✨ Features Previas Consolidadas

### 📦 **Import/Export de Portafolio**
- Soporte para restaurar backups JSON/CSV directamente desde el dashboard Pro.
- Lógica inteligente de *Merge vs Replace* para evitar duplicación de activos.

### 🔔 **Alertas Persistentes (Webhooks + Telegram)**
- Los usuarios pueden programar alertas de divisas o mercado que viven en Supabase y son auditadas por un Cron Job (Worker).
- Se despachan en simultáneo por Email (Nodemailer) y por Telegram si el ID del chat fue vinculado.

### 🧠 **Analista IA con Gemini**
- Un insight diario con proyecciones sobre el CCL y el riesgo país alimentado dinámicamente inyectando la información fresca del Dashboard en la API de Google Gemini.

### 🛡️ **Rate Limiting Escalonado**
1. **FAST (100 req/min)**: Para la información pública de divisas (SWR).
2. **NORMAL (20 req/min)**: Para creación de alertas y portafolio.
3. **STRICT (1 req/10s)**: Para interacciones IA (Gemini).

---

## 📈 Impacto

El sistema ahora no crashea bajo builds, compila en 60 segundos netos y sirve a los clientes estáticamente gracias al empaquetado optimizado de Vite, respaldando toda la dinámica de backend en las Node Serverless Functions optimizadas por Vercel.
