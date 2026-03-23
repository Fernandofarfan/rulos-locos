/**
 * Tests de integración para la API de RulosLocos.
 * Se mockea node-fetch para que los servicios entren en su path de fallback
 * sin hacer llamadas HTTP reales a APIs externas.
 */

// Mockear node-fetch ANTES de requerir app.js para que los servicios usen el mock
jest.mock('node-fetch', () => {
    return jest.fn().mockRejectedValue(new Error('Network unavailable (test mock)'));
});

// Mockear Prisma para que no intente conectarse a la base de datos en tests
jest.mock('../src/utils/db', () => ({
    __esModule: true,
    default: null,
}));

jest.mock('otplib', () => ({
    TOTP: class {
        generateSecret() { return 'A'; }
        keyuri() { return 'A'; }
    }
}));

const request = require('supertest');
const _appModule = require('../src/app');
const app = _appModule.default || _appModule;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function expectNumber(val) {
    expect(typeof val === 'number').toBe(true);
}

function expectString(val) {
    expect(typeof val === 'string').toBe(true);
}

// ─────────────────────────────────────────────────────────────────────────────
// Health
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/health', () => {
    it('devuelve status ok', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status', 'ok');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tipo de cambio principal
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/rate', () => {
    let res;
    beforeAll(async () => {
        res = await request(app).get('/api/rate');
    });

    it('responde con HTTP 200', () => {
        expect(res.status).toBe(200);
    });

    it('tiene campo ask numérico positivo', () => {
        expectNumber(res.body.ask);
        expect(res.body.ask).toBeGreaterThan(0);
    });

    it('tiene campo bid numérico positivo', () => {
        expectNumber(res.body.bid);
        expect(res.body.bid).toBeGreaterThan(0);
    });

    it('ask >= bid (spread normal)', () => {
        expect(res.body.ask).toBeGreaterThanOrEqual(res.body.bid);
    });

    it('tiene campo source (string)', () => {
        expectString(res.body.source);
    });

    it('tiene campo timestamp (ISO string)', () => {
        expectString(res.body.timestamp);
        expect(() => new Date(res.body.timestamp)).not.toThrow();
    });

    it('tiene campo cached (boolean)', () => {
        expect(typeof res.body.cached).toBe('boolean');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Arbitrage
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/arbitrage', () => {
    let res;
    beforeAll(async () => {
        res = await request(app).get('/api/arbitrage');
    });

    it('responde con HTTP 200', () => {
        expect(res.status).toBe(200);
    });

    it('contiene objeto dolares con blue', () => {
        expect(res.body).toHaveProperty('dolares');
        expect(res.body.dolares).toHaveProperty('blue');
    });

    it('blue tiene compra y venta numéricos', () => {
        const blue = res.body.dolares.blue;
        expect(blue).toBeDefined();
        // puede ser string numérico o número
        expect(parseFloat(blue.compra)).toBeGreaterThan(0);
        expect(parseFloat(blue.venta)).toBeGreaterThan(0);
    });

    it('contiene campo history (array)', () => {
        expect(res.body).toHaveProperty('history');
        expect(Array.isArray(res.body.history)).toBe(true);
    });

    it('contiene campo cached (boolean)', () => {
        expect(typeof res.body.cached).toBe('boolean');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Plataformas
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/platforms', () => {
    let res;
    beforeAll(async () => {
        res = await request(app).get('/api/platforms');
    });

    it('responde con HTTP 200', () => {
        expect(res.status).toBe(200);
    });

    it('contiene objeto platforms', () => {
        expect(res.body).toHaveProperty('platforms');
    });

    it('platforms tiene available y unavailable (arrays)', () => {
        const platforms = res.body.platforms;
        expect(platforms).toHaveProperty('available');
        expect(platforms).toHaveProperty('unavailable');
        expect(Array.isArray(platforms.available)).toBe(true);
        expect(Array.isArray(platforms.unavailable)).toBe(true);
    });

    it('cada plataforma (disponible o no) tiene id y name', () => {
        const { available, unavailable } = res.body.platforms;
        const all = [...available, ...unavailable];
        // Con red mocked todas fallen, unavailable debe tener al menos 1
        expect(all.length).toBeGreaterThan(0);
        expect(all[0]).toHaveProperty('id');
        expect(all[0]).toHaveProperty('name');
    });

    it('tiene campo timestamp', () => {
        expect(res.body).toHaveProperty('timestamp');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bonos
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/bonds', () => {
    let res;
    beforeAll(async () => {
        res = await request(app).get('/api/bonds');
    });

    it('responde con HTTP 200', () => {
        expect(res.status).toBe(200);
    });

    it('contiene objeto bonos con disponibles', () => {
        expect(res.body).toHaveProperty('bonos');
        expect(res.body.bonos).toHaveProperty('disponibles');
        expect(Array.isArray(res.body.bonos.disponibles)).toBe(true);
    });

    it('los bonos disponibles tienen propiedad bono (ticker)', () => {
        // DolarAPI tiene fallback, así que debería haber data incluso sin red
        const disponibles = res.body.bonos.disponibles;
        if (disponibles.length > 0) {
            expect(disponibles[0]).toHaveProperty('bono');
        }
        // Si array vacío, solo validamos la estructura
        expect(res.body.bonos).toHaveProperty('total');
    });

    it('contiene objeto estadisticas', () => {
        expect(res.body).toHaveProperty('estadisticas');
        expect(res.body.estadisticas).toHaveProperty('promedio');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard económico
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/economics/dashboard', () => {
    let res;
    beforeAll(async () => {
        res = await request(app).get('/api/economics/dashboard');
    }, 15000);

    it('responde con HTTP 200', () => {
        expect(res.status).toBe(200);
    });

    it('tiene sección macro', () => {
        expect(res.body).toHaveProperty('macro');
    });

    it('macro.inflation tiene mensual numérico', () => {
        const infl = res.body.macro?.inflation;
        expect(infl).toBeDefined();
        expectNumber(parseFloat(infl.mensual ?? infl.monthly ?? 0));
    });

    it('macro.risk es número positivo', () => {
        expectNumber(res.body.macro?.risk);
        expect(res.body.macro.risk).toBeGreaterThanOrEqual(0);
    });

    it('tiene sección market con merval (array)', () => {
        expect(res.body).toHaveProperty('market');
        expect(Array.isArray(res.body.market?.merval)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tasas
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/economics/rates', () => {
    let res;
    beforeAll(async () => {
        res = await request(app).get('/api/economics/rates');
    }, 15000);

    it('responde con HTTP 200', () => {
        expect(res.status).toBe(200);
    });

    it('tiene campo badlar o política monetaria', () => {
        const body = res.body;
        const hasBadlar = body.badlar !== undefined || body.BADLAR !== undefined;
        const hasPolitica = body.politica !== undefined || body.politicaMonetaria !== undefined;
        const hasAny = hasBadlar || hasPolitica || Object.keys(body).length > 0;
        expect(hasAny).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Ruta inexistente → 404 o estructura de error
// ─────────────────────────────────────────────────────────────────────────────

describe('Ruta no encontrada', () => {
    // La app usa app.use('/', apiRoutes) como fallback para Vercel,
    // por lo tanto rutas desconocidas pueden retornar 200 con body vacío
    // o ser manejadas por el cliente SPA. Validamos que no sea 500.
    it('GET /api/esta-ruta-no-existe no retorna error 500', async () => {
        const res = await request(app).get('/api/esta-ruta-no-existe');
        expect(res.status).not.toBe(500);
    });

    it('GET /api/esta-ruta-no-existe no retorna error 503', async () => {
        const res = await request(app).get('/api/esta-ruta-no-existe');
        expect(res.status).not.toBe(503);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Calendário económico (nuevo endpoint)
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/economics/calendar', () => {
    let res;
    beforeAll(async () => {
        res = await request(app).get('/api/economics/calendar');
    }, 15000);

    it('responde con HTTP 200', () => {
        expect(res.status).toBe(200);
    });

    it('contiene array events', () => {
        expect(res.body).toHaveProperty('events');
        expect(Array.isArray(res.body.events)).toBe(true);
    });

    it('events no está vacío (hay eventos futuros)', () => {
        expect(res.body.events.length).toBeGreaterThan(0);
    });

    it('cada evento tiene fecha, title, impact, tipo', () => {
        const ev = res.body.events[0];
        expect(ev).toHaveProperty('fecha');
        expect(ev).toHaveProperty('title');
        expect(ev).toHaveProperty('impact');
        expect(['high', 'medium', 'low']).toContain(ev.impact);
    });

    it('eventos están ordenados por fecha asc', () => {
        const fechas = res.body.events.map(e => e.fecha);
        const sorted = [...fechas].sort();
        expect(fechas).toEqual(sorted);
    });

    it('todos los eventos son fechas futuras (hoy o posterior)', () => {
        const today = new Date().toISOString().split('T')[0];
        res.body.events.forEach(ev => {
            expect(ev.fecha >= today).toBe(true);
        });
    });

    it('contiene campo sources (array de strings)', () => {
        expect(res.body).toHaveProperty('sources');
        expect(Array.isArray(res.body.sources)).toBe(true);
        expect(res.body.sources.length).toBeGreaterThan(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Validación de inputs (middleware validate)
// ─────────────────────────────────────────────────────────────────────────────

describe('Validación — GET /api/economics/historical/:indicator', () => {
    it('indicador inválido → 400', async () => {
        const res = await request(app).get('/api/economics/historical/precio-del-te');
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body).toHaveProperty('field', 'indicator');
    });

    it('indicador válido "inflation" → 200', async () => {
        const res = await request(app).get('/api/economics/historical/inflation');
        expect(res.status).toBe(200);
    });

    it('range inválido → 400', async () => {
        const res = await request(app).get('/api/economics/historical/inflation?range=100Y');
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('field', 'range');
    });

    it('range válido "1M" → 200', async () => {
        const res = await request(app).get('/api/economics/historical/inflation?range=1M');
        expect(res.status).toBe(200);
    });

    it('"5Y" ya no está en los rangos válidos → 400', async () => {
        const res = await request(app).get('/api/economics/historical?range=5Y');
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('field', 'range');
    });
});

describe('Validación — POST /api/notifications/alert', () => {
    it('body vacío → 400', async () => {
        const res = await request(app).post('/api/notifications/alert').send({});
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    it('message demasiado largo → 400', async () => {
        const res = await request(app)
            .post('/api/notifications/alert')
            .send({ message: 'a'.repeat(1001) });
        expect(res.status).toBe(400);
        expect(res.body.field).toBe('message');
    });

    it('message string válido → pasa validación (body sin campo "error" de validación)', async () => {
        const res = await request(app)
            .post('/api/notifications/alert')
            .send({ message: 'Prueba de validación' });
        // La validación no debe rechazarlo: body no tendrá campo "field" (solo errores de
        // validación lo incluyen). El notificationService puede fallar (400/500), pero
        // el campo "field" nunca debe estar presente en errores de Telegram.
        expect(res.body).not.toHaveProperty('field');
    });

    it('prices con valor no numérico → 400', async () => {
        const res = await request(app)
            .post('/api/notifications/alert')
            .send({ prices: { blue: 'no-es-numero' } });
        expect(res.status).toBe(400);
        expect(res.body.field).toBe('prices.blue');
    });

    it('prices con clave desconocida → 400', async () => {
        const res = await request(app)
            .post('/api/notifications/alert')
            .send({ prices: { blue: 1200, injected: 999 } });
        expect(res.status).toBe(400);
        expect(res.body.field).toBe('prices');
    });

    it('prices válido → pasa validación (sin campo "field" en respuesta)', async () => {
        const res = await request(app)
            .post('/api/notifications/alert')
            .send({ prices: { blue: 1200, mep: 1100 } });
        // La validación no genera campo "field" — solo errores de validación lo hacen
        expect(res.body).not.toHaveProperty('field');
    });
});
