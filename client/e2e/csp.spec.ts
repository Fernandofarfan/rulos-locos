import { test, expect } from '@playwright/test';

test('CSP permits the dashboard and its main tabs', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', message => {
        if (/content security policy|violates.*security policy|CSP violation/i.test(message.text())) violations.push(message.text());
    });
    await page.addInitScript(() => {
        localStorage.setItem('rl_visited', '1');
        localStorage.setItem('rulos-locos-onboarding-done', '1');
        window.addEventListener('securitypolicyviolation', event => {
            console.error(`CSP violation: ${event.violatedDirective} ${event.blockedURI}`);
        });
    });
    await page.route('**/api/**', async route => {
        const url = new URL(route.request().url());
        let data: unknown = {};
        if (url.pathname.endsWith('/rate')) data = { bid: 1000, ask: 1010, source: 'test', timestamp: new Date().toISOString() };
        if (url.pathname.endsWith('/arbitrage')) data = { opportunities: [], dolares: {}, history: [], timestamp: new Date().toISOString() };
        if (url.pathname.endsWith('/economics/dashboard')) data = {
            macro: { inflation: { mensual: 0, interanual: 0 }, risk: 0, reserves: 0, baseMonetaria: 0, dolarEquilibrio: 0 },
            market: { merval: [], cedears: [], bonds: [] }, global: [], timestamp: new Date().toISOString(),
        };
        await route.fulfill({ json: data });
    });
    await page.goto('/');
    for (const label of ['Dashboard', 'Tasas', 'Arbitraje', 'Herramientas', 'Análisis', 'Portfolio']) {
        await page.getByRole('button', { name: label, exact: true }).first().click();
        await page.waitForTimeout(600);
    }
    expect(violations).toEqual([]);
});
