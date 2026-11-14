import { describe, it, expect } from 'vitest';
import { calculateUvaLoan, dollarSalePrice, inflationReturn, percentageReturn, plazoFijoRate, projectSavings, purchasingPowerLoss, realRate, uvaEntryOneYearBefore, uvaMonthlyGrowth } from './financial';

describe('financial calculations', () => {
    it('derives UVA growth from elapsed time, not the number of samples', () => {
        const monthly = uvaMonthlyGrowth([
            { fecha: '2020-01-01', valor: 20 },
            { fecha: '2025-01-01', valor: 100 },
            { fecha: '2026-01-01', valor: 120 },
        ]);
        // A 20% rise over one year means roughly 1.2^(1/12) per month.
        expect(monthly).toBeCloseTo(Math.pow(1.2, 1 / 12), 4);
        expect(120 * Math.pow(monthly, 12)).toBeCloseTo(144, 1);
    });

    it('chooses the observation closest to one year earlier in a sparse series', () => {
        const entries = [
            { fecha: '2020-01-01', valor: 20 },
            { fecha: '2024-12-28', valor: 98 },
            { fecha: '2025-02-01', valor: 100 },
            { fecha: '2026-01-01', valor: 106 },
        ];
        expect(uvaEntryOneYearBefore(entries)?.fecha).toBe('2024-12-28');
    });

    it('keeps a realistic 20-year UVA projection finite and in a plausible band', () => {
        const principal = 10_000_000;
        const loan = calculateUvaLoan([
            { fecha: '2024-01-01', valor: 100 },
            { fecha: '2025-01-01', valor: 108 },
            { fecha: '2026-01-01', valor: 116.64 },
        ], principal, '2024-01-01', 20, 5)!;
        expect(Number.isFinite(loan.total)).toBe(true);
        expect(loan.total).toBeGreaterThan(principal);
        expect(loan.total).toBeLessThan(principal * 20);
    });
    it('calculates a 20-year fixed-UVA loan with the French amortization formula', () => {
        const loan = calculateUvaLoan([
            { fecha: '2020-01-01', valor: 100 },
            { fecha: '2021-01-01', valor: 100 },
            { fecha: '2022-01-01', valor: 100 },
        ], 5_000_000, '2021-01-01', 20, 6.5)!;
        // 240 installments, each P*r/(1-(1+r)^-240), r=0.065/12; UVA stays constant.
        const expectedPayment = 5_000_000 * (0.065 / 12) / (1 - Math.pow(1 + 0.065 / 12, -240));
        expect(loan.paymentARS).toHaveLength(240);
        expect(loan.paymentLabels.slice(0, 4)).toEqual(['2021-01', '2021-02', '2021-03', '2021-04']);
        expect(new Set(loan.paymentLabels).size).toBe(240);
        expect(loan.total).toBeCloseTo(expectedPayment * 240, 2);
        expect(loan.total).toBeLessThan(10_000_000);
    });

    it('calculates real return using the Fisher equation', () => {
        expect(realRate(0.10, 0.05)).toBeCloseTo(1.1 / 1.05 - 1);
        expect(realRate(0, 0)).toBe(0);
    });

    it('reports loss of purchasing power relative to initial capital', () => {
        expect(inflationReturn(2)).toBe(-50);
        expect(purchasingPowerLoss(1000, 1)).toBe(500);
    });

    it('reads the actual plazo fijo TNA and falls back only if absent', () => {
        expect(plazoFijoRate({ plazoFijo: { tna: 41 } })).toBe(41);
        expect(plazoFijoRate(null)).toBe(35);
    });

    it('uses the market buy quote when the investor sells dollars', () => {
        const quote = { compra: 1000, venta: 1100 };
        expect(dollarSalePrice(quote, 900)).toBe(1000);
    });
    it('calculates return only for finite positive initial capital', () => {
        expect(percentageReturn(1000, 1100)).toBeCloseTo(10);
        expect(Number.isNaN(percentageReturn(0, 0))).toBe(true);
    });

    it('distinguishes annual effective rates from nominal TNA', () => {
        expect(projectSavings(1000, 20, 12, 0, false)).toBeCloseTo(1200);
        expect(projectSavings(1000, 12, 12, 0, true)).toBeCloseTo(1000 * Math.pow(1.01, 12));
    });
});
