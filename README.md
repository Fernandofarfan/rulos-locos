# Rulos Locos - Dashboard Financiero Argentino

Plataforma profesional en tiempo real para analisis de arbitrajes, cotizaciones de criptomonedas, indicadores macroeconomicos, simulacion financiera y seguimiento de portafolio.

**Plataforma en vivo**: [rulos-locos.vercel.app](https://rulos-locos.vercel.app)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/react-19-blue.svg)
![TypeScript](https://img.shields.io/badge/typescript-100%25_Clean-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![Vercel](https://img.shields.io/badge/deployed-vercel-black.svg)
![Supabase](https://img.shields.io/badge/database-supabase-teal.svg)

---

## Estado de Produccion (v3.1.0)

- **TypeScript estricto**: 0 errores de compilacion en Frontend y Backend.
- **Base de Datos Nube**: PostgreSQL en **Supabase** via Prisma ORM.
- **Despliegue Serverless**: Frontend (Vite) + Backend (Express) en **Vercel**.
- **Autenticacion Robusta**: Login tradicional, 2FA (TOTP), **Google OAuth** y refresh tokens JWT.
- **Seguridad**: Headers CSP, XSS protection, rate limiting escalonado, CORS restrictivo.
- **73 tests**: API integration + unit tests backend pasando.

---

## Funcionalidades

### Arbitraje & Cripto
- Cotizacion en Tiempo Real: Dolar Blue, MEP, CCL y Cripto (USDT/USDC/DAI, BTC, ETH).
- Calculadora de Arbitraje: Identificacion de oportunidades y spreads optimos.
- Brecha Cambiaria: Monitor de divergencia entre todos los tipos de cambio.
- Alertas de Precio: Notificaciones por Browser Push, Email y Telegram Bot.
- **Spread vs CCL**: Comparacion directa de stablecoins contra el CCL en tiempo real.

### Analisis Tecnico & IA
- Analista Macroeconomico IA: Insights diarios generados por **Google Gemini AI**.
- Graficos Historicos Avanzados: SMA, EMA, RSI, MACD, Bollinger Bands, **Stochastic, ATR, Fibonacci, VWAP**.
- Curva de Rendimiento: Yield curve en tiempo real de bonos soberanos (AL30, GD30).
- Exportacion de Reportes: Descarga nativa en PDF y CSV.

### Indicadores Macroeconomicos
- Dashboard Central: Inflacion (m/m, a/a), Riesgo Pais, Reservas BCRA, Base Monetaria.
- Mercados Globales & CEDEARs: Merval, S&P500, Nasdaq, Oro, WTI en vivo.
- Dolar de Equilibrio: Calculo teorico Base Monetaria / Reservas.
- Tasas: Ranking de Plazos Fijos, **FCI Money Market, Renta Fija, Renta Variable**.
- **Obligaciones Negociables**: TIR, duration, calificacion y precio de ONs argentinas.

### Herramientas de Inversion
- **Paper Trading**: Simulador con $1.000.000 ARS virtuales. Limite de 20 operaciones/dia tier free.
- **Portfolio Tracker Pro**: Tracking multi-activo con export/import (JSON/CSV), rendimiento ponderado.
- Calculadoras: Indexacion CER, prestamos UVA, simulador de amortizacion, tasa real.
- **Conexion real a exchanges**: Binance via API keys (ccxt).

---

## Stack Tecnologico

**Frontend:**
- **React 19** + **Vite 7**
- **TypeScript 5.x** (Estricto, verbatimModuleSyntax)
- **TailwindCSS 4** con Glassmorphism moderno
- **Context API + SWR** para state management
- **Axios** con retry automatico en todos los endpoints

**Backend:**
- **Node.js 18+** + **Express 4** (Serverless)
- **Prisma 6.4.1** + **Supabase PostgreSQL**
- **JWT** con refresh tokens + Google OAuth
- **Rate Limiting** por tiers de endpoints
- **SWR Cache** con request coalescing
- **Winston Logger** para observabilidad

**Infraestructura:**
- **Vercel** con security headers, cache inmutable, clean URLs
- **GitHub Actions**: CI/CD con tsc, ESLint, Jest, Vitest, Playwright E2E
- **PWA**: Instalable, offline, push notifications

---

## Variables de Entorno

```env
# Base de datos
DATABASE_URL="postgresql://USUARIO:PASSWORD@HOST.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Auth
JWT_SECRET="secreto_largo_min_32_chars"
VITE_GOOGLE_CLIENT_ID="tu_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_ID="tu_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="tu_client_secret"

# IA (Opcional)
GEMINI_API_KEY="tu_clave_google_ai_studio"

# Notificaciones (Opcional)
TELEGRAM_BOT_TOKEN="token_del_botfather"
EMAIL_USER="tu@gmail.com"
EMAIL_PASS="password_de_app"
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
CLIENT_URL="https://rulos-locos.vercel.app"

# Push Notifications (generar con: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_CONTACT_EMAIL="admin@rulos-locos.com.ar"
```

---

## Ejecucion Local

1. Clonar e instalar:
   ```bash
   git clone https://github.com/Fernandofarfan/rulos-locos.git
   cd rulos-locos
   npm install --include=dev
   ```
2. Sincronizar Prisma:
   ```bash
   npm run prisma:generate
   ```
3. Iniciar (Backend :3001 + Frontend Vite :5173):
   ```bash
   npm run dev:full
   ```

---

## API Endpoints

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/v1/rate` | Cotizacion dolar blue |
| GET | `/api/v1/arbitrage` | Todos los tipos de cambio + oportunidades |
| GET | `/api/v1/economics/dashboard` | Dashboard macro completo |
| GET | `/api/v1/economics/historical/:indicator` | Datos historicos |
| GET | `/api/v1/economics/renta-fija` | ONs + FCI ranking |
| GET | `/api/v1/exchange/prices/:symbol` | Precios multi-exchange |
| POST | `/api/v1/auth/login` | Login (devuelve access + refresh token) |
| POST | `/api/v1/auth/refresh` | Refrescar token |
| GET | `/api/v1/paper-trading/usage` | Uso de Paper Trading (tier free: 20/dia) |
| GET | `/api/docs` | Swagger UI |

---

## Licencia

MIT. Consulta `docs/CONTRIBUTING.md` para reglas de contribucion.
