# 📡 Fuentes de Datos — Rulos Locos

Referencia completa de todas las APIs y servicios que alimentan la aplicación en producción.

---

## ✅ APIs Activas en Producción

### 1. CriptoYa — USDT/ARS Binance P2P y arbitraje cripto

| Campo | Valor |
|---|---|
| URL | `https://criptoya.com/api/binancep2p/USDT/ARS/1` |
| Token | No requiere |
| Frecuencia | Tiempo real (P2P Binance) |
| Cache app | 30 segundos |
| Servicio | `src/services/cryptoYaService.js` |

**Respuesta ejemplo:**
```json
{
  "totalAsk": 1200,
  "totalBid": 1195,
  "time": 1700000000
}
```

---

### 2. DolarAPI — Tipos de cambio oficiales y paralelos

| Campo | Valor |
|---|---|
| URL base | `https://dolarapi.com/v1/dolares` |
| URL CCL | `https://dolarapi.com/v1/dolares/contadoconliqui` |
| Token | No requiere |
| Frecuencia | Varias veces por día |
| Servicio | `src/services/dolarApiService.js` |

**Tipos disponibles:** Blue, MEP, CCL, Oficial, Tarjeta, Mayorista, Cripto

**Respuesta ejemplo (un tipo):**
```json
{
  "moneda": "USD",
  "casa": "blue",
  "nombre": "Blue",
  "compra": 1160,
  "venta": 1165,
  "fechaActualizacion": "2026-02-18T12:00:00Z"
}
```

---

### 3. ArgentinaDatos — Inflación, Riesgo País, Histórico dólar

| Campo | Valor |
|---|---|
| URL base | `https://api.argentinadatos.com/v1` |
| Token | No requiere |
| Frecuencia | Inflación: mensual (INDEC); Riesgo País: diario |
| Servicio | `src/services/argentinaDatosService.js` |

**Endpoints usados:**
- `/finanzas/indices/inflacion` → inflación mensual histórica
- `/finanzas/indices/inflacionInteranual` → variación interanual
- `/finanzas/indices/riesgo-pais` → EMBI+ Argentina (JP Morgan)
- `/cotizaciones/dolares` → histórico cotizaciones dólar
- `/finanzas/indices/uva` → índice UVA diario
- `/feriados/{año}` → feriados nacionales del año (EconomicCalendar)
- `/finanzas/tasas/plazoFijo` → TNA de plazo fijo por banco (PlazoFijoBancos)
- `/finanzas/fci/mercadoDinero/ultimo` → FCI Mercado de Dinero último hábil (FCIMoneyMarket)
- `/finanzas/rendimientos` → rendimientos de instrumentos financieros (InstrumentComparer)

---

### 4. Stooq.com — Índices globales y ADRs argentinos

| Campo | Valor |
|---|---|
| URL | `https://stooq.com/q/l/?s={symbol}&f=sd2cn&h&e=csv` |
| Token | No requiere |
| Frecuencia | Cierre del día anterior (no intraday) |
| Formato | CSV con cabecera |
| Servicio | `src/services/marketService.js` |
| User-Agent | `Mozilla/5.0` (obligatorio para evitar 403) |

**Símbolos utilizados:**

| Símbolo | Descripción |
|---|---|
| `^spx` | S&P 500 |
| `^ndx` | Nasdaq 100 |
| `gc.f` | Oro (Gold Futures) |
| `cl.f` | Petróleo WTI (Crude Oil Futures) |
| `ypf.us` | YPF (ADR NYSE) |
| `ggal.us` | Grupo Financiero Galicia (ADR NYSE) |
| `pam.us` | Pampa Energía (ADR NYSE) |
| `bma.us` | Banco Macro (ADR NYSE) |
| `cepu.us` | Central Puerto (ADR NYSE) |
| `aapl.us` | Apple (para CEDEAR AAPL) |
| `meli.us` | MercadoLibre (para CEDEAR MELI) |
| `tsla.us` | Tesla (para CEDEAR TSLA) |
| `ko.us` | Coca-Cola (para CEDEAR KO) |
| `spy.us` | SPDR S&P 500 ETF (para CEDEAR SPY) |
| `nvda.us` | NVIDIA (para CEDEAR NVDA) |
| `amzn.us` | Amazon (para CEDEAR AMZN) |

**Respuesta CSV ejemplo:**
```
Symbol,Date,Open,Close,Name
GGAL.US,2026-02-18,49.55,49.65,GRUPO FINANCIERO GALICIA
```

**Conversión a ARS:** precio USD × CCL (DolarAPI)

---

### 5. CoinGecko — Bitcoin y Ethereum

| Campo | Valor |
|---|---|
| URL | `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true` |
| Token | No requiere (free tier) |
| Límite | ~50 llamadas/minuto en plan gratuito |
| Frecuencia | Tiempo real |
| Servicio | `src/services/marketService.js` |

**Respuesta ejemplo:**
```json
{
  "bitcoin": {
    "usd": 68286,
    "usd_24h_change": 1.25
  },
  "ethereum": {
    "usd": 3540,
    "usd_24h_change": -0.80
  }
}
```

---

### 6. BCRA API Oficial v3.0 — Reservas y Base Monetaria

| Campo | Valor |
|---|---|
| URL base | `https://api.bcra.gob.ar/estadisticas/v3.0/monetarias/{idVariable}` |
| Token | No requiere |
| SSL | Requiere `rejectUnauthorized: false` (cert self-signed) |
| Frecuencia | Datos diarios |
| Parámetros | `?offset=0&limit=1` para el dato más reciente |
| Servicio | `src/services/bcraService.js` |

**Variables disponibles (IDs confirmados):**

| ID | Variable | Unidad | Último dato |
|---|---|---|---|
| `1` | Reservas Internacionales | Millones USD | 45,130 (2026-02-18) |
| `15` | Base Monetaria | Millones ARS | 40,986,425 (2026-02-18) |
| `27` | Inflación mensual | % | — |
| `28` | Inflación interanual | % | — |
| `29` | Tasa de desempleo | % | — |

**Respuesta ejemplo:**
```json
{
  "status": 200,
  "metadata": {
    "resultset": { "count": 1, "offset": 0, "limit": 1 }
  },
  "results": [
    {
      "idVariable": 1,
      "fecha": "2026-02-18",
      "valor": 45130
    }
  ]
}
```

**Nota:** El valor de Base Monetaria viene en millones ARS. Para obtener pesos exactos, multiplicar × 1,000,000.

---

---

### 8. Google Gemini API — IA Asistida

| Campo | Valor |
|---|---|
| URL | `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` |
| Token | Requiere `GEMINI_API_KEY` |
| Formato | JSON |
| Servicio | `src/services/aiService.ts` |

**Uso:** Análisis de contexto macroeconómico, insights de mercado en tiempo real y recomendación del "Rulo del Día".

## 🔑 Variables de Entorno / Tokens

| Variable | Servicio | Vence | Dónde cargarla |
|---|---|---|---|
| `BCRA_TOKEN` | estadisticasbcra.com (fallback) | 2027-02-21 | Vercel → Settings → Environment Variables |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API | No vence | Vercel ENV + `.env` local |
| `TELEGRAM_CHAT_ID` | Telegram Bot API | No vence | Vercel ENV + `.env` local |

**Token BCRA (estadisticasbcra.com):**
```
eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4MDMyNDcwMzksInR5cGUiOiJleHRlcm5hbCIsInVzZXIiOiJmZXJuYW5kby5mYXJmYW4xNkBnbWFpbC5jb20ifQ.nFo-jti9jtPKccSCzrIlsQ_ejfgKRU0FFwLTsj1jcz4HVEhBy7K_bGiFzWhSjDJH3VQYVw-Qj20M6jADfqxMOw
```
> ⚠️ Este servicio solo tiene datos hasta abril 2024. Se usa como fallback si la API oficial del BCRA falla.
> Header: `BEARER` (en mayúsculas). Endpoints: `/reservas`, `/base` (NO `/base_monetaria_total`).

---

## ⚠️ APIs Descartadas

| Servicio | Motivo |
|---|---|
| Yahoo Finance (`query1.finance.yahoo.com`) | Bloqueado desde IPs de datacenter (Vercel) |
| BYMA Open Data | SSL errors + HTTP 400 en todos los endpoints |
| estadisticasbcra.com (principal) | Solo datos hasta abril 2024, desactualizado |
| Ámbito Financiero (scraping) | Inconsistente, reemplazado por DolarAPI |

---

## 📊 Estado de Cada Dato en Producción

| Dato | Estado | Fuente |
|---|---|---|
| USDT/ARS Binance P2P | ✅ REAL tiempo real | CriptoYa |
| Dólar Blue / MEP / CCL | ✅ REAL | DolarAPI |
| Dólar Oficial / Tarjeta | ✅ REAL | DolarAPI |
| Bitcoin, Ethereum | ✅ REAL tiempo real | CoinGecko |
| S&P 500, Nasdaq 100 | ✅ REAL (cierre ant.) | Stooq.com |
| Gold (XAU), WTI | ✅ REAL (cierre ant.) | Stooq.com |
| Merval top 5 acciones | ✅ REAL (cierre ant.) | Stooq ADRs × CCL |
| CEDEARs top 7 | ✅ REAL (cierre ant.) | Stooq USA × CCL |
| Inflación mensual/anual | ✅ REAL (INDEC) | ArgentinaDatos |
| Riesgo País EMBI+ | ✅ REAL diario | ArgentinaDatos |
| Reservas BCRA | ✅ REAL diario | api.bcra.gob.ar ID=1 |
| Base Monetaria | ✅ REAL diario | api.bcra.gob.ar ID=15 |
| Índice UVA | ✅ REAL diario | ArgentinaDatos |
| Noticias económicas | ✅ REAL | Google News RSS |
| Tasas bancarias | ✅ REAL | ArgentinaDatos |
| Plazo Fijo por banco (TNA) | ✅ REAL | ArgentinaDatos `/finanzas/tasas/plazoFijo` |
| FCI Mercado de Dinero | ✅ REAL | ArgentinaDatos `/finanzas/fci/mercadoDinero/ultimo` |
| Feriados nacionales | ✅ REAL | ArgentinaDatos `/feriados/{año}` |
| Bonos AL30, GD30, AL35, GD35 | ✅ REAL (cierre ant.) | Stooq.com BA |
| Brecha cambiaria | ✅ CALCULADO | CCL / Oficial (DolarAPI) |
| Dólar de equilibrio | ✅ CALCULADO | Base Monetaria / Reservas (BCRA) |
| Insights & Rulo del Día | ✅ CALCULADO (IA) | Gemini (Google) |

---

## 🔄 Caché y Actualización

| Endpoint | TTL Caché | Razón |
|---|---|---|
| `/api/rates` | 60 segundos | Cotizaciones cambian frecuentemente |
| `/api/market` | 5 minutos | Datos de bolsa por cierre de día |
| `/api/bcra` | 10 minutos | Datos diarios del BCRA |
| `/api/economics` | 30 minutos | Inflación/riesgo país semi-estáticos |
| `/api/news` | 15 minutos | Noticias con moderada frecuencia |

---

*Última actualización: Febrero 2026 (Fase 6)*
