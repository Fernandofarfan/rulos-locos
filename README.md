# Rulos Locos - Dashboard Financiero Argentino 🇦🇷

Plataforma profesional en tiempo real para análisis de arbitrajes, cotizaciones de criptomonedas, indicadores macroeconómicos, simulación financiera y seguimiento de portafolio.

🌐 **Plataforma en vivo**: [rulos-locos.vercel.app](https://rulos-locos.vercel.app)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/react-19-blue.svg)
![TypeScript](https://img.shields.io/badge/typescript-100%25_Clean-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![Vercel](https://img.shields.io/badge/deployed-vercel-black.svg)
![Supabase](https://img.shields.io/badge/database-supabase-teal.svg)

---

## ✅ Estado de Producción (v3.0.0)

El proyecto se encuentra en su versión estable **v3.0.0**. 
- **TypeScript estricto**: 0 errores de compilación tanto en Frontend (`tsc --noEmit -p tsconfig.app.json`) como en Backend.
- **Base de Datos Nube**: Migración exitosa de SQLite local a **Supabase (PostgreSQL)** mediante Prisma ORM para despliegue Serverless.
- **Despliegue Serverless**: Frontend (Vite) y Backend (Express) sirviendo de manera nativa y unificada a través de **Vercel CDN**.
- **Autenticación Robusta**: Login tradicional, 2FA (TOTP) y **Google OAuth** perfectamente sincronizado entre frontend y backend.

## 🚀 Funcionalidades Pro Principales

### 💹 Arbitraje & Cripto
- **Cotización en Tiempo Real**: Dólar Blue, MEP, CCL y Cripto (USDT/BTC/ETH).
- **Calculadora de Arbitraje**: Identificación de oportunidades y spreads óptimos.
- **Brecha Cambiaria**: Monitor de divergence entre todos los tipos de cambio argentinos.
- **Alertas de Precio**: Notificaciones multi-canal (Browser, Email y Telegram Bot).

### 📊 Análisis Técnico & IA
- **Analista Macroeconómico IA**: Insights diarios generados por **Google Gemini AI**.
- **Gráficos Históricos Avanzados**: SMA de 20 períodos, volumen y rangos dinámicos.
- **Curva de Rendimiento**: Yield curve en tiempo real de bonos soberanos argentinos (AL30, GD30).
- **Exportación de Reportes**: Descarga nativa en PDF y CSV.

### 📈 Indicadores Macroeconómicos
- **Dashboard Central**: Inflación (m/m, a/a), Riesgo País, Reservas Internacionales del BCRA y Base Monetaria.
- **Mercados Globales & CEDEARs**: Integración de cotizaciones Merval, S&P500, Nasdaq, Oro y WTI en vivo.
- **Dólar de Equilibrio**: Cálculo teórico dinámico relacionando Base Monetaria amplia y Reservas.
- **Tasas**: Ranking de Plazos Fijos, FCI Money Market y política monetaria.

### 🎯 Herramientas de Inversión (Nuevas)
- **Paper Trading (Simulador)**: Entorno libre de riesgo con $1.000.000 ARS virtuales para probar estrategias de mercado en tiempo real.
- **Portfolio Tracker Pro**: Tracking multi-activo con exportación/importación (JSON/CSV) y cálculo de rendimiento ponderado.
- **Calculadoras Financieras**: Indexación CER, préstamos UVA y simulador de amortización.

---

## 🛠️ Stack Tecnológico

**Frontend:**
- **React 19** + **Vite 7**
- **TypeScript 5.x** (Estricto, zero explicit `any`)
- **TailwindCSS 4** para UI modular estilo Glassmorphism
- **Context API + SWR** para state management ligero
- **Axios** con interceptores de Auth robustos

**Backend:**
- **Node.js 18+** + **Express 4** (Mode Serverless)
- **Prisma 6.4.1** conectado a **Supabase PostgreSQL** pooler.
- **JWT + Google Auth Library** para seguridad de sesiones.
- **Rate Limiting** dinámico por tiers de endpoints.
- **Winston Logger** para observabilidad.

**Infraestructura:**
- **Vercel** (`vercel.json` config).
- **GitHub Actions** para CI/CD (Testing E2E con Playwright).

---

## 📦 Despliegue & Variables de Entorno

Para replicar localmente o realizar un despliegue en Vercel, se deben configurar las siguientes variables en `.env` (o en el Vercel Dashboard):

```env
# 1. Base de datos
DATABASE_URL="postgresql://USUARIO:PASSWORD@HOST.pooler.supabase.com:6543/postgres?pgbouncer=true"

# 2. Seguridad & Auth
JWT_SECRET="un_secreto_largo_y_muy_seguro"
VITE_GOOGLE_CLIENT_ID="tu_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_ID="tu_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="tu_client_secret"

# 3. Inteligencia Artificial (Opcional)
GEMINI_API_KEY="tu_clave_de_google_ai_studio"

# 4. APIs Externas & Notificaciones (Opcional)
TELEGRAM_BOT_TOKEN="token_del_botfather"
CLIENT_URL="https://rulos-locos.vercel.app"
```

## 🏗️ Ejecución Local

1. Clonar el repositorio y acceder:
   ```bash
   git clone https://github.com/Fernandofarfan/rulos-locos.git
   cd rulos-locos
   ```
2. Instalar dependencias (instala tanto back como frontend):
   ```bash
   npm install --include=dev
   ```
3. Sincronizar Prisma:
   ```bash
   npm run prisma:generate
   ```
4. Iniciar servidor full-stack (Backend en `:3001` y Frontend Vite en `:5173`):
   ```bash
   npm run dev:full
   ```

## 📜 Licencia & Contribuciones

Este proyecto es Open Source bajo la licencia MIT. Consultá `docs/CONTRIBUTING.md` para reglas de ramas y pull requests. Se acepta feedback continuo para agregar nuevos endpoints macroeconómicos.
