import { describe, it, expect } from 'vitest';
import { adjustByUva, calculateInvestmentTax, calculateSalaryPower, calculateUvaLoan, compareCardDollar, dollarSalePrice, fixedDepositRates, inflationReturn, loanVsDeposit, MONTHLY_INFLATION_2024, percentageReturn, plazoFijoRate, projectSavings, purchasingPowerLoss, realRate, realRateProjection, savingsReturnPct, uvaEntryOneYearBefore, uvaMonthlyGrowth } from './financial';

describe('financial calculations', () => {
    it('calcula impuesto simplificado solo sobre ganancias', () => {
        expect(calculateInvestmentTax(1000, 1300, 15, false)).toEqual({ gain: 300, tax: 45, netGain: 255, netReturn: 1255 });
        expect(calculateInvestmentTax(1000, 900, 15, false).tax).toBe(0);
    });
    it('compone IPC y aumento salarial, con salario cero seguro', () => {
        const salary = calculateSalaryPower(1000, 10, [10, 20]);
        expect(salary.realToday).toBeCloseTo(1320);
        expect(salary.currentNominal).toBeCloseTo(1100);
        expect(salary.purchasingPower).toBeCloseTo(83.333333);
        expect(calculateSalaryPower(0, 0, [10]).purchasingPower).toBe(0);
        expect(MONTHLY_INFLATION_2024[9]).toBe(2.7);
    });
    it('calcula plazo fijo de 30 días con interés simple y reinversión periódica', () => {
        const rates = fixedDepositRates(36.5);
        expect(rates.period).toBeCloseTo(0.03);
        expect(rates.annual).toBeCloseTo(1.03 ** (365 / 30) - 1);
    });
    it('calcula ajuste UVA y evita división por cero', () => {
        expect(adjustByUva(1000, 100, 120)).toEqual({ ratio: 1.2, adjustedAmount: 1200, nominalGain: 200, nominalGainPct: (1.2 - 1) * 100 });
        expect(adjustByUva(1000, 0, 120)).toBeNull();
    });
    it('calcula préstamo francés y ahorro sin confundir aportes con rendimiento', () => {
        const loan = loanVsDeposit(1200, 12, 12, 0);
        expect(loan.monthlyInstallment).toBeCloseTo(1200 * 0.01 / (1 - 1.01 ** -12));
        expect(loan.totalPaid).toBeCloseTo(loan.monthlyInstallment * 12);
        expect(projectSavings(1000, 0, 2, 100, true)).toBe(1200);
        expect(savingsReturnPct(1200, 1000, 100, 2)).toBe(0);
    });
    it('compara dólar tarjeta y MEP y calcula tasa real Fisher', () => {
        expect(compareCardDollar(100, 1500, 1200).differenceARS).toBe(30000);
        expect(compareCardDollar(0, 0, 0).differencePct).toBe(0);
        const projection = realRateProjection(36.5, 30, 1000, 2);
        expect(projection.tasaEfectivaPeriodo).toBeCloseTo(0.03);
        expect(projection.tasaReal).toBeCloseTo(1.03 / 1.02 - 1);
    });
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
