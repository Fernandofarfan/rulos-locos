import { test, expect } from '@playwright/test';
import { mockData } from './mockData';

test.use({ serviceWorkers: 'block' });

test.describe('Rulos Locos Dashboard', () => {
    test.beforeEach(async ({ page }) => { await mockData(page); });

    test('carga el dashboard y muestra la cotización blue', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/Rulos Locos/);
        await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
        const blueCard = page.locator('.glass-panel').filter({
            has: page.getByRole('heading', { name: 'Dólar Blue', exact: true }),
        });
        await expect(blueCard).toBeVisible();
        await expect(blueCard).toContainText('1.010');
        await expect(blueCard).toContainText('Fuente: test');
    });

    test('navega a las calculadoras', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('button', { name: 'Herramientas', exact: true }).first().click();
        await expect(page.getByRole('heading', { name: 'Herramientas & Calculadoras' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Consumo & Ahorro' })).toBeVisible();
    });

    test('el selector de tema cambia entre claro y oscuro', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('/');
        const theme = page.locator('html');
        await expect(theme).toHaveAttribute('data-theme', /^(dark|light)$/);
        const initial = await theme.getAttribute('data-theme');
        await page.getByRole('button', { name: /Cambiar a modo (claro|oscuro)/ }).click();
        await expect(theme).toHaveAttribute('data-theme', initial === 'dark' ? 'light' : 'dark');
    });

    test('el menú mobile permite navegar', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto('/');
        await page.getByRole('button', { name: 'Abrir menú' }).click();
        const mobileNav = page.getByRole('navigation').filter({ hasText: 'Herramientas' });
        await expect(mobileNav).toBeVisible();
        await mobileNav.getByRole('button', { name: 'Herramientas', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Herramientas & Calculadoras' })).toBeVisible();
    });

    test('los controles de navegación desktop son visibles', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('/');
        const header = page.locator('header');
        for (const name of ['Dashboard', 'Tasas', 'Arbitraje']) {
            await expect(header.getByRole('button', { name, exact: true })).toBeVisible();
        }
    });
});

test.describe('API health checks', () => {
    test('health responde con el estado de las dependencias', async ({ request }) => {
        const res = await request.get('/api/health');
        expect(res.status()).toBe(200);
        const body = await res.json() as { status: string; checks: { database: string; encryption: string; redis: string } };
        expect(['ok', 'degraded']).toContain(body.status);
        expect(['ok', 'unconfigured', 'error']).toContain(body.checks.database);
        expect(['ok', 'unavailable']).toContain(body.checks.encryption);
        expect(['ok', 'unconfigured', 'error']).toContain(body.checks.redis);
    });

    test('rate retorna cotizaciones de compra y venta', async ({ request }) => {
        const res = await request.get('/api/rate');
        expect(res.status()).toBe(200);
        const body = await res.json() as { bid: number; ask: number };
        expect(body.bid).toBeGreaterThan(0);
        expect(body.ask).toBeGreaterThan(0);
    });

    test('arbitrage retorna la cotización blue', async ({ request }) => {
        const res = await request.get('/api/arbitrage');
        expect(res.status()).toBe(200);
        const body = await res.json() as { dolares: { blue: { compra: number; venta: number } } };
        expect(body.dolares.blue.compra).toBeGreaterThan(0);
        expect(body.dolares.blue.venta).toBeGreaterThan(0);
    });

    test('economics/dashboard retorna campos requeridos', async ({ request }) => {
        const res = await request.get('/api/economics/dashboard');
        expect(res.status()).toBe(200);
        const body = await res.json() as { macro?: unknown; market?: unknown };
        expect(body).toHaveProperty('macro');
        expect(body).toHaveProperty('market');
    });
});
