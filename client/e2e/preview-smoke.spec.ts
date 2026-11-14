import { expect, test } from '@playwright/test';

const baseURL = process.env.PREVIEW_BASE_URL;
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
test.skip(!baseURL, 'Solo se ejecuta contra un deployment Preview.');
test.use({
    baseURL: baseURL || 'http://localhost:5173',
    trace: 'off',
});

test('health, portada y página pública sin errores de consola', async ({ page, request }) => {
    const errors: string[] = [];
    page.on('console', message => {
        if (message.type() === 'error' && !message.text().includes('vercel.live')) errors.push(message.text());
    });
    page.on('pageerror', error => errors.push(error.message));
    const health = await request.get('/api/health', {
        headers: bypass ? { 'x-vercel-protection-bypass': bypass } : {},
    });
    expect(health.ok()).toBeTruthy();
    const initialURL = new URL('/', baseURL!);
    if (bypass) {
        initialURL.searchParams.set('x-vercel-protection-bypass', bypass);
        initialURL.searchParams.set('x-vercel-set-bypass-cookie', 'samesitenone');
    }
    await page.goto(initialURL.toString());
    await page.goto('/');
    await expect(page.locator('body')).not.toBeEmpty();
    const seo = await page.goto('/dolar-blue-hoy');
    expect(seo?.ok()).toBeTruthy();
    expect(new URL(seo!.url()).hostname).not.toMatch(/(^|\.)vercel\.com$/);
    await expect(page.getByRole('heading', { level: 1, name: /Dólar blue/i })).toBeVisible();
    expect(errors).toEqual([]);
});
