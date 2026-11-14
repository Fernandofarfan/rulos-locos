import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockData } from './mockData';

test.use({ serviceWorkers: 'block' });

for (const colorScheme of ['light', 'dark'] as const) test(`secciones y herramientas sin violaciones serias o críticas (${colorScheme})`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ colorScheme });
    await mockData(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
    const violations: string[] = [];
    for (const [main, sub] of [
        ['Dashboard', ''], ['Tasas', 'Acciones & Mercados'], ['Arbitraje', ''],
        ['Herramientas', 'Consumo & Ahorro'], ['', 'Créditos & UVA'], ['', 'Inversión & Retornos'],
        ['Análisis', ''], ['Portfolio', ''],
    ]) {
        if (main) await page.getByRole('button', { name: main, exact: true }).first().click();
        if (sub) await page.getByRole('button', { name: sub, exact: true }).first().click();
        await page.waitForTimeout(1500);
        const results = await new AxeBuilder({ page }).analyze();
        for (const issue of results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')) {
            violations.push(`${main || 'Herramientas'} ${sub}: ${issue.id} (${issue.nodes.length}) ${issue.nodes.map(node => `${node.target.join(' ')} ${node.html} ${node.failureSummary}`).join('; ')}`);
        }
    }
    expect(violations).toEqual([]);
});
