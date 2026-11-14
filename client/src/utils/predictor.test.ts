import { describe, expect, it } from 'vitest';
import { linearRegression, walkForwardBacktest } from './predictor';

describe('backtest walk-forward', () => {
    const series = Array.from({ length: 100 }, (_, day) => ({ day, price: 100 + day * 2 }));
    it('recupera una recta exacta y predice sin error para cada horizonte', () => {
        expect(linearRegression(series).slope).toBeCloseTo(2);
        for (const horizon of [7, 14, 30]) {
            const result = walkForwardBacktest(series, horizon);
            expect(result.samples).toBeGreaterThan(0);
            expect(result.mape).toBeCloseTo(0);
            expect(result.hitRate).toBe(100);
        }
    });
    it('no usa observaciones demasiado alejadas del horizonte', () => {
        expect(walkForwardBacktest(series.filter(point => point.day % 30 === 0), 7).samples).toBe(0);
    });
});
