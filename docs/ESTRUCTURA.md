# 📁 Estructura del Proyecto

## ✅ Estado de Calidad (15/03/2026)

- TypeScript backend/root: sin errores (`npm run typecheck`)
- Build frontend producción: exitoso (`npm run build`)
- Tests backend API: 49/49 passing (`tests/api.test.js`)
- Limpieza aplicada: archivos no conectados eliminados y documentación alineada

## Organización General

Monorepo con backend en la raíz y frontend en `client/`. El backend se despliega como Serverless Function en Vercel a través de `api/index.js`.

```
RulosLocos/
│
├── 📂 api/
│   └── index.js                     # Entry point para Vercel Serverless Function
│
├── 📂 client/                       # Frontend (React 19 + TypeScript + Vite 7)
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── 📂 src/
│       ├── App.tsx                   # Componente raíz y router principal
│       ├── main.tsx
│       ├── index.css
│       ├── 📂 components/           # 30+ componentes UI
│       │   ├── ArbitrageCalculator.tsx   # Calculadora de arbitraje con simulación
│       │   ├── ArbitrageHub.tsx          # Hub unificado de oportunidades
│       │   ├── AssetComparer.tsx         # Comparador de rendimiento entre activos
│       │   ├── BondCalculator.tsx        # Calculadora de bonos soberanos
│       │   ├── BrechaMonitor.tsx         # Monitor de brecha cambiaria
│       │   ├── CandlestickChart.tsx      # Gráficos OHLC con lightweight-charts [NO MONTADO en App.tsx]
│       │   ├── CarryTradeMonitor.tsx     # Análisis de carry trade
│       │   ├── CERCalculator.tsx         # Calculadora de ajuste por CER/inflación
│       │   ├── ChartCard.tsx             # Gráficos históricos con SMA
│       │   ├── CorrelationHeatmap.tsx    # Heatmap de correlación de activos
│       │   ├── EconomicCalendar.tsx      # Calendario de eventos + feriados reales (ArgentinaDatos)
│       │   ├── EquilibriumDollar.tsx     # Dólar de equilibrio (base monetaria/reservas)
│       │   ├── ErrorBoundary.tsx         # Manejo de errores en componentes
│       │   ├── FCIMoneyMarket.tsx        # FCI Mercado de Dinero (patrimonio y rendimiento)
│       │   ├── HeroCard.tsx              # Tarjeta principal con cotización USDT/ARS
│       │   ├── InflationBreakdown.tsx    # Desglose de inflación por categorías
│       │   ├── InflationCalculator.tsx   # Calculadora de inflación acumulada
│       │   ├── InstrumentComparer.tsx    # Comparador PF vs BADLAR vs FCI vs inflación
│       │   ├── InterestRates.tsx         # Tasas de interés bancarias
│       │   ├── Layout.tsx                # Layout base con navbar (6 secciones) y sidebar
│       │   ├── MacroDashboard.tsx        # Dashboard macroeconómico unificado
│       │   ├── MarketInsight.tsx         # Resumen del mercado de capitales [NO MONTADO en App.tsx]
│       │   ├── MarketTicker.tsx          # Ticker de cotizaciones en tiempo real
│       │   ├── NewsFeed.tsx              # Feed de noticias económicas (RSS, máx 8)
│       │   ├── PDFExport.tsx             # Exportación de reportes en PDF
│       │   ├── PlatformList.tsx          # Comparador de plataformas/exchanges
│       │   ├── PlazoFijoBancos.tsx       # Ranking de TNA por banco (ArgentinaDatos)
│       │   ├── PortfolioTracker.tsx      # Seguimiento de portfolio con P&L
│       │   ├── PriceAlerts.tsx           # Alertas de precio con browser + Telegram
│       │   ├── RealRateCalculator.tsx    # Calculadora de tasa real vs inflación
│       │   ├── ReservasBCRA.tsx          # Panel de reservas del BCRA
│       │   ├── RuloScanner.tsx           # Escáner de oportunidades 24/7 de arbitraje
│       │   ├── RuloDelDia.tsx            # Analista IA de Rulos
│       │   ├── SectionDivider.tsx        # Divisores visuales entre secciones temáticas
│       │   ├── SettingsModal.tsx         # Modal de configuración
│       │   ├── SettingsOverlay.tsx       # Panel lateral de configuración [NO MONTADO en App.tsx]
│       │   ├── StatusPage.tsx            # Monitor de estado de APIs externas y sistema
│       │   ├── StatsCard.tsx             # Tarjeta de estadísticas/KPI
│       │   ├── UVALoanSimulator.tsx      # Simulador de préstamos UVA
│       │   ├── YieldCurve.tsx            # Curva de rendimiento de bonos
│       │   └── 📂 ui/
│       │       ├── Skeleton.tsx          # Componente de carga skeleton
│       │       └── Toaster.tsx           # Notificaciones toast
│       ├── 📂 hooks/                # Custom React Hooks
│       │   ├── useDashboardData.ts   # Fetch de datos + integración Socket.io
│       │   ├── useFlash.ts           # Animación de flash para cambio de precios
│       │   ├── useSocket.ts          # Conexión WebSocket con el backend
│       │   └── useTheme.ts           # Gestión del tema oscuro/claro [NO USADO en App.tsx]
│       ├── 📂 services/
│       │   └── api.ts                # Cliente HTTP centralizado (axios)
│       ├── 📂 types/
│       │   └── index.ts              # TypeScript interfaces y tipos
│       └── 📂 utils/
│           └── exportCSV.ts          # Utilidad de exportación a CSV
│
├── 📂 src/                          # Backend (Node.js + Express + TypeScript)
│   ├── app.ts                       # Configuración Express (middlewares + rutas)
│   ├── server.ts                    # Entry point para desarrollo local
│   ├── 📂 config/
│   │   └── index.ts                 # Variables de entorno validadas con Zod
│   ├── 📂 controllers/              # Lógica de negocio por dominio
│   │   ├── arbitrageController.ts   # Oportunidades de arbitraje
│   │   ├── authController.ts        # Autenticación JWT (login, register, refresh)
│   │   ├── bondController.ts        # Bonos soberanos
│   │   ├── dataController.ts        # Datos generales de mercado
│   │   ├── economicsController.ts   # Dashboard macro + cache + fallbacks
│   │   ├── alertController.ts       # CRUD de alertas persistentes
│   │   ├── notificationController.ts # Notificaciones Telegram/email
│   │   ├── portfolioController.ts   # Portfolio + import/export + stats
│   │   ├── platformController.ts    # Plataformas de exchange
│   │   └── rateController.ts        # Cotización USDT/ARS Binance P2P
│   ├── 📂 routes/
│   │   ├── api.routes.ts            # Rutas principales de la API
│   │   └── auth.routes.ts           # Rutas de autenticación
│   ├── 📂 middleware/
│   │   ├── auth.ts                  # Middleware de autenticación JWT
│   │   └── validate.ts              # Middleware de validación de parámetros (Zod)
│   ├── 📂 services/                 # Integraciones con APIs externas
│   │   ├── ambitoService.ts         # Ámbito Financiero (DEPRECATED — solo fallback estático)
│   │   ├── arbitrageService.ts      # Motor de cálculo de arbitrajes
│   │   ├── argentinaDatosService.ts # API ArgentinaDatos (inflación, UVA, PF por banco, FCI)
│   │   ├── bcraService.ts           # API oficial BCRA v3.0 (reservas diarias, base monetaria)
│   │   ├── cryptoYaService.ts       # CriptoYa (Binance P2P y cotizaciones arbitraje)
│   │   ├── dolarApiService.ts       # DolarAPI (Blue, MEP, CCL, Oficial, Tarjeta)
│   │   ├── marketService.ts         # Stooq.com (acciones/índices) + CoinGecko (BTC/ETH)
│   │   └── notificationService.ts   # Telegram Bot API + Nodemailer email
│   ├── 📂 utils/
│   │   ├── cache.ts                 # Cache en memoria con TTL configurable
│   │   ├── db.ts                    # Cliente Prisma (SQLite)
│   │   └── logger.ts                # Winston logger (console en prod, files en dev)
│   └── 📂 workers/
│       ├── arbitrageWorker.ts       # Job periódico de actualización de arbitrajes (60s)
│       └── alertWorker.ts           # Verificación periódica de alertas (120s)
│
├── 📂 docs/                         # Documentación del proyecto
│   ├── ESTRUCTURA.md                # Este archivo
│   ├── FUENTES_DE_DATOS.md          # APIs y fuentes de todos los datos
│   └── MEJORAS_FUTURAS.md           # Roadmap y pendientes
│
├── 📂 tests/
│   └── api.test.js                  # Tests básicos de API
│
├── 📂 scripts/
│   └── test-api-health.js           # Script de diagnóstico de APIs externas
│
├── 📂 .github/
│   └── workflows/ci.yml             # Pipeline CI/CD (lint + build)
│
├── docker-compose.yml               # Orquestación para desarrollo local
├── Dockerfile                       # Imagen Docker del backend
├── vercel.json                      # Configuración de deploy en Vercel
├── package.json                     # Dependencias y scripts del monorepo
└── README.md                        # Documentación principal
```

## 🎯 Módulos Principales

### **Frontend (client/)**

Desarrollado con **React 19** y **TypeScript**. Usa **TailwindCSS 4** para el diseño "Deep Space" y **Chart.js 4** + **lightweight-charts** para gráficos financieros. La comunicación con el backend usa `axios` con fallbacks para garantizar estabilidad.

**Componentes destacados:**
| Componente | Descripción |
|---|---|
| `HeroCard` | Cotización Dólar Blue (compra/venta/spread) en tiempo real |
| `ArbitrageHub` | Panel unificado de oportunidades de arbitraje |
| `ChartCard` | Gráficos históricos con SMA y filtros temporales |
| `YieldCurve` | Curva de rendimiento de bonos soberanos |
| `PortfolioTracker` | Seguimiento de inversiones con P&L |
| `MacroDashboard` | Todos los indicadores macro en un panel |
| `CarryTradeMonitor` | Análisis carry trade con tasa vs devaluación |
| `BrechaMonitor` | Monitor de brecha cambiaria entre tipos de dólar |
| `PlazoFijoBancos` | Ranking de TNA por banco con ArgentinaDatos |
| `FCIMoneyMarket` | FCI Mercado de Dinero: patrimonio y rendimiento |
| `RealRateCalculator` | Calculadora de tasa real vs inflación con veredicto |
| `InstrumentComparer` | Comparador PF vs BADLAR vs FCI vs inflación en barras |
| `SectionDivider` | Divisores visuales con ícono, título y badge coloreado |
| `RuloScanner` | Escáner de oportunidades 24/7 y monitor de brechas |
| `StatusPage` | Monitor de estado de servicios y health status |
| `RuloDelDia` | Componente de inteligencia artificial para mostrar un Rulo destacado |

### **Backend (src/)**

API REST en **Node.js + Express** con arquitectura multicapa:

```
Request → Route → Controller → Service → External API
                     ↓              ↓
                  Cache          Fallback
```

**Endpoints principales:**

| Endpoint | Descripción | Cache |
|---|---|---|
| `GET /api/health` | Estado del servidor | No |
| `GET /api/rate` | USDT/ARS Binance P2P | 30s |
| `GET /api/arbitrage` | Oportunidades arbitraje | 60s |
| `GET /api/economics/dashboard` | Dashboard macro completo | 30s |
| `GET /api/economics/historical/:type` | Historial blue/mep/ccl/inflation | 5min |
| `GET /api/economics/yield-curve` | Curva de rendimiento | 5min |
| `GET /api/economics/reservas` | Reservas BCRA | 5min |
| `GET /api/bonds` | Bonos soberanos | 2min |

### **Vercel Serverless**

En producción, `api/index.js` actúa como entry point de la Serverless Function:
- Plan Hobby: límite de 10 segundos por request
- Timeouts internos: servicios externos limitados a 4-5s
- Fallbacks: todos los endpoints devuelven datos de respaldo ante fallos externos

## 🔄 Flujo de Datos

```
1. Frontend (React) → apiService (axios) → /api/...
2. Vercel → api/index.js → src/app.ts (Express)
3. app.ts → Route → Controller
4. Controller verifica Cache → Si hit, responde inmediatamente
5. Si miss → Promise.allSettled([service1(), service2(), ...])
6. Services → fetch() a APIs externas con AbortController (4-5s timeout)
7. Controller transforma y valida → Cache.set(data, TTL)
8. Respuesta al cliente
9. Socket.io emite actualizaciones de arbitraje cada 60s
```

## 🛡️ Seguridad y Robustez

- **Helmet**: Headers HTTP seguros (CSP, HSTS, etc.)
- **CORS**: Lista blanca de dominios Vercel + localhost en desarrollo  
- **Rate Limiting**: 500 req/15min por IP (ajustado para Vercel)
- **Rate Limiting por endpoint**: FAST/NORMAL/SLOW/STRICT según criticidad
- **AbortController**: Timeout estricto en todos los fetch a APIs externas
- **Fallbacks**: Cada endpoint tiene datos de respaldo para no devolver 500
- **Global Timeout**: 7s timeout global en `/api/economics/dashboard`
- **Winston**: Logging estructurado JSON en producción
