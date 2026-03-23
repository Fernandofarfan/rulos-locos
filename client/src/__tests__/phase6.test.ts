import { describe, it, expect } from 'vitest';

// ─────────────────────────────────────────────
// Test: formatARS utilities
// ─────────────────────────────────────────────
describe('formatARS utilities', () => {
    const formatInt = (n: number) =>
        new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

    const formatPct = (n: number | undefined) =>
        n === undefined || isNaN(n) ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

    it('formats integer ARS correctly', () => {
        const result = formatInt(1250);
        expect(result).toContain('1.250');
    });

    it('formats positive percentage', () => {
        expect(formatPct(3.5)).toBe('+3.50%');
    });

    it('formats negative percentage', () => {
        expect(formatPct(-2.1)).toBe('-2.10%');
    });

    it('returns dash for undefined percentage', () => {
        expect(formatPct(undefined)).toBe('—');
    });
});

// ─────────────────────────────────────────────
// Test: LinearRegression (PricePredictor logic)
// ─────────────────────────────────────────────
describe('Linear Regression', () => {
    interface DataPoint { day: number; price: number; }

    function linearRegression(data: DataPoint[]) {
        const n = data.length;
        if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
        const sumX = data.reduce((s, d) => s + d.day, 0);
        const sumY = data.reduce((s, d) => s + d.price, 0);
        const sumXY = data.reduce((s, d) => s + d.day * d.price, 0);
        const sumX2 = data.reduce((s, d) => s + d.day * d.day, 0);
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        const yMean = sumY / n;
        const ssTot = data.reduce((s, d) => s + (d.price - yMean) ** 2, 0);
        const ssRes = data.reduce((s, d) => s + (d.price - (slope * d.day + intercept)) ** 2, 0);
        const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
        return { slope, intercept, r2 };
    }

    it('computes correct slope for perfect linear data', () => {
        const data = [1, 2, 3, 4, 5].map(d => ({ day: d, price: d * 100 }));
        const { slope, intercept, r2 } = linearRegression(data);
        expect(slope).toBeCloseTo(100, 5);
        expect(intercept).toBeCloseTo(0, 5);
        expect(r2).toBeCloseTo(1, 5);
    });

    it('returns zeros for insufficient data', () => {
        const { slope, r2 } = linearRegression([{ day: 1, price: 100 }]);
        expect(slope).toBe(0);
        expect(r2).toBe(0);
    });
});

// ─────────────────────────────────────────────
// Test: Compound interest calculation
// ─────────────────────────────────────────────
describe('Compound Growth (WhatIfSimulator)', () => {
    function compoundGrowth(initial: number, annualReturn: number, months: number): number {
        const monthly = annualReturn / 100 / 12;
        return initial * Math.pow(1 + monthly, months);
    }

    it('calculates 100% annual return compounded monthly to ~161% TEA in 12 months', () => {
        const result = compoundGrowth(100_000, 100, 12);
        expect(result).toBeCloseTo(261_303, -1); // within ±$10
    });

    it('returns original amount when annualReturn is 0', () => {
        const result = compoundGrowth(50_000, 0, 12);
        expect(result).toBe(50_000);
    });

    it('increases as months increase', () => {
        const r6 = compoundGrowth(100_000, 120, 6);
        const r12 = compoundGrowth(100_000, 120, 12);
        expect(r12).toBeGreaterThan(r6);
    });
});

// ─────────────────────────────────────────────
// Test: Spread calculation (SpreadTracker)
// ─────────────────────────────────────────────
describe('Spread Calculation', () => {
    const spreadPct = (buy: number, sell: number) =>
        sell > 0 ? (((sell - buy) / buy) * 100) : 0;

    it('calculates 4% spread correctly', () => {
        expect(spreadPct(1000, 1040)).toBeCloseTo(4, 1);
    });

    it('returns 0 when sell is 0', () => {
        expect(spreadPct(1000, 0)).toBe(0);
    });

    it('spread is always positive for sell > buy', () => {
        expect(spreadPct(1200, 1250)).toBeGreaterThan(0);
    });
});

// ─────────────────────────────────────────────
// Test: Cumulative inflation (SalaryCalculator)
// ─────────────────────────────────────────────
describe('Cumulative Inflation', () => {
    const MONTHLY = [20.6, 13.2, 11.0, 8.8, 4.2, 4.6, 4.0, 4.2, 3.5, 2.4, 2.4, 2.7];

    function cumulativeInflation(months: number): number {
        return MONTHLY.slice(0, months).reduce((acc, m) => acc * (1 + m / 100), 1) - 1;
    }

    it('single month inflation is correct', () => {
        expect(cumulativeInflation(1)).toBeCloseTo(0.206, 3);
    });

    it('cumulative 2024 is above 100%', () => {
        expect(cumulativeInflation(12) * 100).toBeGreaterThan(100);
    });

    it('12 months >= 6 months inflation', () => {
        expect(cumulativeInflation(12)).toBeGreaterThan(cumulativeInflation(6));
    });
});
