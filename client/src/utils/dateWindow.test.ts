import { describe, expect, it } from 'vitest';
import { closestSeriesValue, filterLastHours, filterSeries } from './dateWindow';

describe('date-based series windows', () => {
    it('keeps paired values in the last six calendar months, excluding future dates', () => {
        const labels = ['2020-01-01', '2026-05-12', '2026-05-13', '2026-11-13', '2026-11-14'];
        const series = { labels, values: labels.map((_, i) => i) };
        expect(filterSeries(series, 6, new Date('2026-11-13T15:00:00Z'))).toEqual({
            labels: ['2026-05-13', '2026-11-13'], values: [2, 3],
        });
    });
    it('selects the closest dated observation despite gaps', () => {
        expect(closestSeriesValue({ labels: ['2020-01-01', '2025-11-10', '2025-11-20'], values: [10, 100, 110] }, '2025-11-13')).toBe(100);
    });
    it('filters intraday observations by elapsed hours rather than sample count', () => {
        const hour = 60 * 60 * 1000;
        const now = 20 * hour;
        expect(filterLastHours([{ timestamp: now - 13 * hour }, { timestamp: now - 12 * hour }, { timestamp: now - hour }], 12, now))
            .toEqual([{ timestamp: now - 12 * hour }, { timestamp: now - hour }]);
    });
});
