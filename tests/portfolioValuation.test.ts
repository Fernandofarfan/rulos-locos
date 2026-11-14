import { valuePosition } from '../src/services/portfolioValuation';

it('computes nominal, USD and CPI-adjusted gains with monthly compounding', () => {
    const result = valuePosition({
        amount: 2, buyPrice: 1000, currentPrice: 1500, date: '2024-01-01', mep: 1000, historicalMep: 500,
        inflation: [{ fecha: '2024-01-01', valor: 10 }, { fecha: '2024-02-01', valor: 10 }, { fecha: '2024-03-01', valor: 20 }],
        inflationEstimated: false, asOf: new Date('2024-04-10T00:00:00Z'),
    });
    expect(result.valueArs).toBe(3000);
    expect(result.valueUsd).toBe(3);
    expect(result.nominalPnlArs).toBe(1000);
    expect(result.pnlUsd).toBe(-1);
    // Bought on January 1: ARS 2000 × 1.10 × 1.10 × 1.20 = ARS 2904.
    expect(result.realPnlArs).toBeCloseTo(96);
    expect(result.isEstimated).toBe(false);
});

it('marks stale CPI and partial-month interpolation as estimated', () => {
    const result = valuePosition({
        amount: 1, buyPrice: 1000, currentPrice: 1200, date: '2024-01-16', mep: 1000, historicalMep: 900,
        inflation: [{ fecha: '2024-01-01', valor: 10 }], inflationEstimated: false,
        asOf: new Date('2024-06-01T00:00:00Z'),
    });
    expect(result.inflationMultiplier).toBeCloseTo(1.1 ** (16 / 31));
    expect(result.isEstimated).toBe(true);
});

it('does not invent real P&L when a month is missing', () => {
    const result = valuePosition({
        amount: 1, buyPrice: 1000, currentPrice: 1500, date: '2024-01-01', mep: 1000, historicalMep: null,
        inflation: [{ fecha: '2024-01-01', valor: 10 }, { fecha: '2024-03-01', valor: 20 }], inflationEstimated: false,
    });
    expect(result.realPnlArs).toBeNull();
    expect(result.pnlUsd).toBeNull();
    expect(result.isEstimated).toBe(true);
});
