import { test, expect, type Page } from '@playwright/test';

async function mockData(page: Page) {
    const now = Date.now();
    const labels = Array.from({ length: 366 }, (_, i) =>
        new Date(now - (365 - i) * 10 * 86400000).toISOString().slice(0, 10));
    const values = labels.map((_, i) => 1000 + i);
    const timestamp = new Date(now).toISOString();
    const quote = { compra: 1000, venta: 1010, fechaActualizacion: timestamp };
    const rates = {
        badlar: { tna: 35, tem: 2.92, tea: 41.2, fecha: timestamp.slice(0, 10) },
        plazoFijo: { tna: 33, tem: 2.75, tea: 38.4 },
        inflation: { mensual: 2, interanual: 28, fecha: timestamp.slice(0, 10) },
        realRate: 7, timestamp,
    };
    await page.addInitScript(() => {
        localStorage.setItem('rl_visited', '1');
        localStorage.setItem('rulos-locos-onboarding-done', 'true');
    });
    await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname.replace(/^.*\/api/, '');
        let data: unknown = {};
        if (path === '/rate') data = { bid: 1000, ask: 1010, source: 'test', timestamp };
        else if (path === '/arbitrage') data = { opportunities: [], dolares: { blue: quote, mep: quote, ccl: quote, oficial: quote }, history: [], timestamp };
        else if (path === '/arbitrage/best-rulo') data = { score: 50, tipo: 'MEP → Blue', descripcion: 'Operación de referencia', pasos: ['Comprar MEP', 'Vender Blue'], rentabilidadNeta: 1, capital: 100000, gananciaEstimada: 1000, riesgo: 'MEDIO', tiempo: '1 día' };
        else if (path === '/economics/dashboard') data = {
            macro: { inflation: { mensual: 2, interanual: 28, fecha: timestamp.slice(0, 10) }, risk: 600, reserves: 40000, baseMonetaria: 40000000000000, dolarEquilibrio: 1000 },
            market: { merval: [], cedears: [], bonds: [] }, global: [], timestamp,
        };
        else if (path.startsWith('/economics/historical/')) data = { labels, values };
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
        const data = labels.map((fecha, i) => url.includes('/inflacion')
            ? { fecha, valor: 2 }
            : { fecha, venta: values[i], compra: values[i] - 1 });
        await route.fulfill({ json: data });
    });
    await page.route('https://api.coingecko.com/**', route => route.fulfill({ json: [] }));
}

test.use({ serviceWorkers: 'block' });

test('all main sections and tools tabs render without console errors', async ({ page }) => {
    const errors: string[] = [];
    let section = 'initial';
    page.on('console', message => { if (message.type() === 'error') errors.push(`${section}: ${message.text()}`); });
    page.on('pageerror', error => errors.push(`${section}: ${error.stack ?? error.message}`));
    await mockData(page);
    await page.goto('/');
    for (const [main, sub] of [
        ['Dashboard', ''],
        ['Tasas', 'Acciones & Mercados'],
        ['Arbitraje', ''],
        ['Herramientas', 'Consumo & Ahorro'],
        ['', 'Créditos & UVA'],
        ['', 'Inversión & Retornos'],
        ['Análisis', ''],
        ['Portfolio', ''],
    ]) {
        section = `${main} ${sub}`;
        if (main) await page.getByRole('button', { name: main, exact: true }).first().click();
        if (sub) await page.getByRole('button', { name: sub, exact: true }).first().click();
        await page.waitForTimeout(500);
        await expect(page.locator('main')).toBeVisible();
        await expect(page.locator('body')).not.toContainText(/\b(?:NaN|Infinity|undefined)\b/);
    }
    expect(errors).toEqual([]);
});

test('investment 6M return uses recent observations from a sparse decade of data', async ({ page }) => {
    await mockData(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Herramientas', exact: true }).first().click();
    await page.getByRole('button', { name: 'Inversión & Retornos', exact: true }).click();
    const card = page.locator('.glass-panel').filter({ has: page.getByRole('heading', { name: 'Comparador de Rendimientos' }) });
    await card.getByRole('button', { name: '6M', exact: true }).click();
    const row = card.getByText('Dólar Blue', { exact: true }).locator('../..');
    await expect(row).toContainText(/%/);
    const match = (await row.innerText()).match(/([+-]?\d+(?:\.\d+)?)%/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeGreaterThan(0);
    expect(Number(match![1])).toBeLessThan(5);
});

test('the 6M dollar chart excludes old data from a sparse ten-year series', async ({ page }) => {
    await mockData(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Análisis', exact: true }).first().click();
    const card = page.locator('.glass-panel').filter({ has: page.getByRole('heading', { name: 'Evolución Dólar' }) });
    await card.getByRole('button', { name: '6M', exact: true }).click();
    const range = card.locator('[aria-label="Fechas del gráfico"]');
    await expect(range).toBeAttached();
    const [first, last] = (await range.textContent() ?? '').split(' — ');
    const firstMs = Date.parse(first);
    const lastMs = Date.parse(last);
    expect(Number.isFinite(firstMs)).toBeTruthy();
    expect(Number.isFinite(lastMs)).toBeTruthy();
    expect(Date.now() - firstMs).toBeLessThanOrEqual(190 * 86400000);
    expect(Date.now() - lastMs).toBeLessThanOrEqual(11 * 86400000);
});
