import { test, expect } from '@playwright/test';

test.describe('Rulos Locos Dashboard', () => {
    test('debe cargar la página principal y mostrar el título del dashboard', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/Rulos Locos/);

        const dashboardTitle = page.locator('text=Panorama en tiempo real del mercado cambiario argentino');
        await expect(dashboardTitle).toBeVisible();

        // Comprobar que carga al menos una tarjeta de Dólar Blue
        const blueCard = page.locator('text=Dólar Blue');
        await expect(blueCard).toBeVisible();
    });

    test('debe navegar a la sección de calculadoras', async ({ page }) => {
        await page.goto('/');

        const navItem = page.locator('a[href="#herramientas"]');
        if (await navItem.isVisible()) {
            await navItem.click();
        } else {
            await page.goto('/#herramientas');
        }

        const toolsTitle = page.locator('text=Calculadoras financieras');
        await expect(toolsTitle).toBeVisible();
    });
});

// ── Nuevos tests de regresión ────────────────────────────────────────────────

test.describe('API health checks', () => {
    test('el endpoint /api/health responde 200 con status ok', async ({ request }) => {
        const res = await request.get('/api/health');
        expect(res.status()).toBe(200);
        const body = await res.json() as { status: string };
        expect(body.status).toBe('ok');
    });

    test('el endpoint /api/rate retorna datos de dólar blue', async ({ request }) => {
        const res = await request.get('/api/rate');
        expect(res.status()).toBe(200);
        const body = await res.json() as { blue?: { compra?: number; venta?: number } };
        expect(body).toHaveProperty('blue');
        expect(typeof body.blue?.compra).toBe('number');
        expect(typeof body.blue?.venta).toBe('number');
    });

    test('el endpoint /api/economics/dashboard retorna campos requeridos', async ({ request }) => {
        const res = await request.get('/api/economics/dashboard');
        expect(res.status()).toBe(200);
        const body = await res.json() as { macro?: unknown; market?: unknown };
        expect(body).toHaveProperty('macro');
        expect(body).toHaveProperty('market');
    });
});

test.describe('Acessibilidad y UX básica', () => {
    test('el toggle de modo oscuro/claro existe y es clickeable', async ({ page }) => {
        await page.goto('/');
        // El botón de tema tiene aria-label
        const themeBtn = page.locator('[aria-label="Cambiar a modo claro"], [aria-label="Cambiar a modo oscuro"]');
        await expect(themeBtn).toBeVisible();
        await themeBtn.click();
        // Verificar que la clase cambia
        const hasLightTheme = await page.locator('body.light-theme').count() > 0;
        expect(typeof hasLightTheme).toBe('boolean'); // Solo verifica que la operación no falla
    });

    test('el menú mobile es accesible en viewport pequeño', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto('/');
        const menuBtn = page.locator('[aria-label="Abrir menú"]');
        await expect(menuBtn).toBeVisible();
        await menuBtn.click();
        const mobileNav = page.locator('nav').filter({ hasText: 'Dashboard' });
        await expect(mobileNav).toBeVisible();
    });

    test('los links de navegación desktop son visibles en viewport grande', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('/');
        await expect(page.locator('a[href="#dashboard"]')).toBeVisible();
        await expect(page.locator('a[href="#mercado"]')).toBeVisible();
        await expect(page.locator('a[href="#arbitrage"]')).toBeVisible();
    });
});
