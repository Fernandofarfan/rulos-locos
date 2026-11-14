import { expect, test } from '@playwright/test';

const baseURL = process.env.PREVIEW_BASE_URL;
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
test.skip(!baseURL, 'Solo se ejecuta contra un deployment Preview.');
test.use({
    baseURL: baseURL || 'http://localhost:5173',
    extraHTTPHeaders: bypass ? { 'x-vercel-protection-bypass': bypass } : {},
});

test('health, portada y página pública sin errores de consola', async ({ page, request }) => {
    const errors: string[] = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(error.message));
    const health = await request.get('/api/health');
    expect(health.ok()).toBeTruthy();
    await page.goto('/');
    await expect(page.locator('body')).not.toBeEmpty();
    const seo = await page.goto('/dolar-blue-hoy');
    expect(seo?.ok()).toBeTruthy();
    await expect(page.locator('h1')).toContainText('Dólar blue');
    expect(errors).toEqual([]);
});
