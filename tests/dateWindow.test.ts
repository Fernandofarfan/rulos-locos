import { carryTradeHistory } from '../src/utils/dateWindow';
import { filterByDateRange, cutoffDate } from '../src/utils/historicalRange';
import { annualRealRate } from '../src/utils/financial';

describe('historical date windows', () => {
    it('filters sparse ten-year series by date rather than point count', () => {
        const now = new Date('2026-11-13T15:00:00Z');
        const labels = Array.from({ length: 366 }, (_, i) =>
            new Date(Date.parse('2016-11-15T00:00:00Z') + i * 10 * 86400000).toISOString().slice(0, 10));
        const filtered = filterByDateRange(labels, labels.map((_, i) => i), '6M', now);
        expect(filtered.labels.length).toBeGreaterThan(10);
        expect(filtered.labels.every(date => date >= '2026-05-13' && date <= '2026-11-13')).toBe(true);
        expect(filtered.values).toEqual(filtered.labels.map(date => labels.indexOf(date)));
    });

    it('uses Buenos Aires date and clamps end-of-month cutoffs', () => {
        expect(cutoffDate('1M', new Date('2026-04-01T01:00:00Z'))).toBe('2026-02-28');
    });

    it('compounds carry trade over elapsed days, regardless of sampling density', () => {
        const history = carryTradeHistory([
            { fecha: '2026-01-01', valor: 1000 },
            { fecha: '2026-03-02', valor: 1000 },
        ], 12);
        expect(history[1].arsTasaInUSD).toBeCloseTo(1000 * 1.01 ** 2, 2);
    });

    it('converts TNA to an effective annual rate before adjusting for annual inflation', () => {
        expect(annualRealRate(12, 10)).toBeCloseTo((1.01 ** 12 / 1.1 - 1) * 100);
    });
});
