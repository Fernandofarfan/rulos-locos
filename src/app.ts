import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import config from './config';
import apiRoutes from './routes/api.routes';
import authRoutes from './routes/auth.routes';
import healthRoutes from './routes/health.routes';
import logger from './utils/logger';
import swaggerUi from 'swagger-ui-express';
import { errorHandler, asyncHandler } from './middleware/errorHandler';
import { requestTracking } from './middleware/requestTracking';


const app = express();

// Compresión gzip — reduce payload ~70% en respuestas JSON grandes
app.use(compression());
app.use(express.json());

// Request tracking: correlation ID, timing, logging
app.use(requestTracking);

// XSS sanitization middleware — strip HTML tags from string inputs
app.use((req: Request, _res: Response, next: NextFunction) => {
    const sanitize = (obj: any): any => {
        if (typeof obj === 'string') return obj.replace(/<[^>]*>/g, '');
        if (Array.isArray(obj)) return obj.map(sanitize);
        if (obj && typeof obj === 'object') {
            const cleaned: any = {};
            for (const [k, v] of Object.entries(obj)) cleaned[k] = sanitize(v);
            return cleaned;
        }
        return obj;
    };
    if (req.body) req.body = sanitize(req.body);
    next();
});

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'https://criptoya.com', 'https://dolarapi.com', 'https://api.argentinadatos.com', 'https://api.estadisticasbcra.com', 'https://newsdata.io', 'wss:', 'ws:', config.CLIENT_URL],
        },
    },
}));

const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        if (!origin || config.NODE_ENV !== 'production') return callback(null, true);
        const allowedPatterns = [
            /^https:\/\/rulos-locos.*\.vercel\.app$/,
            /^https:\/\/rulos-locos\.com\.ar$/,
            /localhost:5173$/,
        ];
        if (allowedPatterns.some(p => p.test(origin)) || origin === config.CLIENT_URL) {
            callback(null, true);
        } else if (origin.endsWith('.vercel.app')) {
            callback(null, true);
        } else {
            logger.warn('CORS bloqueado para origen: %s', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

app.set('trust proxy', 1);

// Rate limiters diferenciados
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: (req: any) => {
        // Authenticated users get higher limits
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) return 1000;
        return 500;
    },
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' },
});
const aiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'AI rate limit exceeded — max 30 req/15min' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Auth rate limit exceeded — max 20 req/15min' } });

// Apply differentiated rate limits
app.use('/api/ai', aiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api', generalLimiter);

// Solo servir archivos estáticos en desarrollo local.
// En Vercel, el CDN/rewrites maneja el frontend y esta línea crashearía el lambda.
if (process.env.NODE_ENV !== 'production') {
    app.use(express.static(path.join(__dirname, '../client/dist')));
}

// Health checks (siempre disponibles sin rate limit)
app.use('/', healthRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// Swagger Docs (Public API)
const swaggerSpec = {
    openapi: '3.0.0',
    info: {
        title: 'Rulos Locos API',
        version: '3.0.0',
        description: 'API pública de cotizaciones, arbitraje, economía argentina, autenticación y portfolio.',
        contact: { name: 'Fernando Farfan', url: 'https://github.com/Fernandofarfan' },
        license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
    },
    servers: [{ url: `/api`, description: 'Servidor Actual' }],
    tags: [
        { name: 'Rate', description: 'Tipo de cambio Blue' },
        { name: 'Arbitrage', description: 'Oportunidades de arbitraje y cotizaciones' },
        { name: 'Economics', description: 'Datos macroeconómicos del BCRA/INDEC' },
        { name: 'Market', description: 'Bonos, CEDEARs, Merval, ROFEX, commodities, cripto' },
        { name: 'AI', description: 'Insights con Inteligencia Artificial (Gemini)' },
        { name: 'Auth', description: 'Autenticación y autorización' },
        { name: 'Portfolio', description: 'Portfolio de inversiones (requiere JWT)' },
        { name: 'Notifications', description: 'Alertas Telegram y Web Push' },
        { name: 'System', description: 'Health, status y resumen diario' },
    ],
    paths: {
        '/rate': { get: { tags: ['Rate'], summary: 'Cotización del dólar blue (CriptoYa)', responses: { '200': { description: 'OK' } } } },
        '/arbitrage': { get: { tags: ['Arbitrage'], summary: 'Todos los tipos de cambio y oportunidades de arbitraje', responses: { '200': { description: 'OK' } } } },
        '/arbitrage/best-rulo': { get: { tags: ['Arbitrage'], summary: 'Mejor rulo del momento', responses: { '200': { description: 'OK' } } } },
        '/economics/dashboard': { get: { tags: ['Economics'], summary: 'Dashboard macroeconómico completo (inflación, riesgo país, reservas, mercado)', responses: { '200': { description: 'OK' } } } },
        '/economics/historical/{indicator}': { get: { tags: ['Economics'], summary: 'Datos históricos por indicador', parameters: [{ name: 'indicator', in: 'path', required: true, schema: { type: 'string', enum: ['blue', 'mep', 'ccl', 'oficial', 'inflation', 'risk'] } }, { name: 'range', in: 'query', schema: { type: 'string', enum: ['1M', '3M', '6M', '1Y'] } }], responses: { '200': { description: 'OK' } } } },
        '/economics/rates': { get: { tags: ['Economics'], summary: 'Tasas de referencia (BADLAR, TNA, etc.)', responses: { '200': { description: 'OK' } } } },
        '/economics/market': { get: { tags: ['Market'], summary: 'Datos de mercado (Merval, bonos, cripto)', responses: { '200': { description: 'OK' } } } },
        '/economics/rofex': { get: { tags: ['Market'], summary: 'Contratos de futuros ROFEX', responses: { '200': { description: 'OK' } } } },
        '/economics/yield-curve': { get: { tags: ['Market'], summary: 'Curva de rendimiento de bonos soberanos', responses: { '200': { description: 'OK' } } } },
        '/economics/reservas': { get: { tags: ['Economics'], summary: 'Reservas internacionales BCRA', responses: { '200': { description: 'OK' } } } },
        '/economics/uva': { get: { tags: ['Economics'], summary: 'Índice UVA diario', responses: { '200': { description: 'OK' } } } },
        '/economics/carry-trade': { get: { tags: ['Economics'], summary: 'Datos de carry trade', responses: { '200': { description: 'OK' } } } },
        '/economics/equilibrium': { get: { tags: ['Economics'], summary: 'Dólar de equilibrio (base monetaria / reservas)', responses: { '200': { description: 'OK' } } } },
        '/economics/plazo-fijo-bancos': { get: { tags: ['Economics'], summary: 'TNA de plazo fijo por banco', responses: { '200': { description: 'OK' } } } },
        '/economics/fci': { get: { tags: ['Economics'], summary: 'FCI Mercado de Dinero', responses: { '200': { description: 'OK' } } } },
        '/economics/news': { get: { tags: ['Economics'], summary: 'Noticias económicas (RSS feeds)', responses: { '200': { description: 'OK' } } } },
        '/economics/holidays': { get: { tags: ['Economics'], summary: 'Feriados nacionales (ArgentinaDatos)', responses: { '200': { description: 'OK' } } } },
        '/economics/calendar': { get: { tags: ['Economics'], summary: 'Calendario de eventos económicos', responses: { '200': { description: 'OK' } } } },
        '/bonds': { get: { tags: ['Market'], summary: 'Bonos soberanos (AL30, GD30, etc.)', responses: { '200': { description: 'OK' } } } },
        '/bonds/live': { get: { tags: ['Market'], summary: 'Bonos en tiempo real', responses: { '200': { description: 'OK' } } } },
        '/server/commodities': { get: { tags: ['Market'], summary: 'Commodities agropecuarios (Soja, Trigo, Maíz)', responses: { '200': { description: 'OK' } } } },
        '/ai/insight': { get: { tags: ['AI'], summary: 'Insight macroeconómico generado por IA (Gemini)', responses: { '200': { description: 'OK' } } } },
        '/ai/rulo-del-dia': { get: { tags: ['AI'], summary: 'Rulo del día recomendado por IA', responses: { '200': { description: 'OK' } } } },
        '/ai/chart-insight': { post: { tags: ['AI'], summary: 'Insight de gráfico por IA', responses: { '200': { description: 'OK' } } } },
        '/daily-summary': { get: { tags: ['System'], summary: 'Resumen diario del mercado (texto formateado)', responses: { '200': { description: 'OK' } } } },
        '/daily-summary/send': { post: { tags: ['System'], summary: 'Enviar resumen diario por Telegram', responses: { '200': { description: 'OK' } } } },
        '/status': { get: { tags: ['System'], summary: 'Estado de servicios externos', responses: { '200': { description: 'OK' } } } },
        '/health': { get: { tags: ['System'], summary: 'Health check del servidor', responses: { '200': { description: 'OK' } } } },
        '/auth/login': { post: { tags: ['Auth'], summary: 'Login de usuario (email + password)', responses: { '200': { description: 'JWT token' } } } },
        '/auth/register': { post: { tags: ['Auth'], summary: 'Registro de nuevo usuario', responses: { '201': { description: 'Usuario creado' } } } },
        '/portfolio': { 
            get: { tags: ['Portfolio'], summary: 'Listar posiciones del portfolio', security: [{ BearerAuth: [] }], responses: { '200': { description: 'OK' } } },
            post: { tags: ['Portfolio'], summary: 'Agregar posición', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Posición creada' } } },
        },
    },
    components: {
        securitySchemes: {
            BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
    },
};
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Rulos Locos — API Docs',
}));
logger.info('Swagger UI disponible en /api/docs');

// Catch-all SPA solo en desarrollo local.
// En Vercel, el rewrite /(.*) → /index.html en vercel.json ya maneja esto.
if (process.env.NODE_ENV !== 'production') {
    app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
}

// Error handler global (SIEMPRE AL FINAL)
app.use(errorHandler);

export default app;
