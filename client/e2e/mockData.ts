import type { Page } from '@playwright/test';

export async function mockData(page: Page) {
    const now = Date.now();
    const labels = Array.from({ length: 366 }, (_, i) => new Date(now - (365 - i) * 10 * 86400000).toISOString().slice(0, 10));
    const values = labels.map((_, i) => 1000 + i);
    const timestamp = new Date(now).toISOString();
    const quote = { compra: 1000, venta: 1010, fechaActualizacion: timestamp, source: 'test', isEstimated: false };
    const rates = {
        badlar: { tna: 35, tem: 2.92, tea: 41.2, fecha: timestamp.slice(0, 10) },
        plazoFijo: { tna: 33, tem: 2.75, tea: 38.4 },
        inflation: { mensual: 2, interanual: 28, fecha: timestamp.slice(0, 10) }, realRate: 7, timestamp,
    };
    await page.addInitScript(() => {
        localStorage.setItem('rl_visited', '1');
        localStorage.setItem('rulos-locos-onboarding-done', 'true');
    });
    await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname.replace(/^.*\/api/, '');
        let data: unknown = {};
        if (path === '/rate') data = { bid: 1000, ask: 1010, source: 'test', timestamp };
        else if (path === '/arbitrage') data = { opportunities: [], dolares: { blue: quote, mep: quote, ccl: quote, oficial: quote }, history: [], timestamp, cryptos: {} };
        else if (path === '/arbitrage/net') data = { routes: [], referenceFees: {}, updatedAt: timestamp };
        else if (path === '/arbitrage/history') data = { points: [], summary: {} };
        else if (path === '/platforms/best') data = { platforms: [] };
        else if (path === '/arbitrage/best-rulo') data = { score: 50, tipo: 'MEP → Blue', descripcion: 'Operación de referencia', pasos: ['Comprar MEP', 'Vender Blue'], rentabilidadNeta: 1, capital: 100000, gananciaEstimada: 1000, riesgo: 'MEDIO', tiempo: '1 día' };
        else if (path === '/economics/dashboard') data = {
            macro: { inflation: { mensual: 2, interanual: 28, fecha: timestamp.slice(0, 10) }, risk: 600, reserves: 40000, baseMonetaria: 40000000000000, dolarEquilibrio: 1000 },
            market: { merval: [], cedears: [], bonds: [] }, global: [], timestamp,
        };
        else if (path.startsWith('/economics/historical/')) data = { labels, values, source: 'test', isEstimated: false };
        else if (path === '/economics/rates') data = rates;
        else if (path === '/economics/equilibrium') data = { theoretical: 1000, reserves: 40000, baseMonetaria: 40000000000000, timestamp, source: 'test' };
        else if (path === '/economics/reservas') data = { data: [], source: 'test', timestamp };
        else if (path === '/economics/uva') data = { data: [{ fecha: '2021-01-01', valor: 100 }, { fecha: timestamp.slice(0, 10), valor: 300 }], source: 'test', timestamp };
        else if (path === '/economics/yield-curve') data = { points: [], cclUsed: 1000, timestamp, source: 'test' };
        else if (path === '/economics/carry-trade') data = { history: [], tna: 35, timestamp };
        else if (path === '/economics/fci') data = { fondos: [] };
        else if (path === '/economics/plazo-fijo-bancos') data = { bancos: [] };
        else if (path === '/economics/calendar') data = { events: [], sources: [] };
        else if (path === '/economics/holidays') data = { holidays: [] };
        else if (path === '/economics/news' || path === '/economics/rofex' || path === '/bonds/live' || path === '/server/commodities') data = [];
        else if (path === '/market') data = { merval: [], cedears: [], bonds: [], global: [], timestamp };
        else if (path.startsWith('/ai/')) data = { insight: 'Información orientativa', text: 'Información orientativa' };
        await route.fulfill({ json: data });
    });
    await page.route('https://api.argentinadatos.com/**', async route => {
        const url = route.request().url();
        await route.fulfill({ json: labels.map((fecha, i) => url.includes('/inflacion')
            ? { fecha, valor: 2 } : { fecha, venta: values[i], compra: values[i] - 1 }) });
    });
    await page.route('https://api.coingecko.com/**', route => route.fulfill({ json: [] }));
}
