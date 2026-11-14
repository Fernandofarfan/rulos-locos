import { summarizeHistory } from '../src/services/ruloHistory';

it('summarizes each day using its best result without compounding', () => {
    const summary = summarizeHistory([
        { timestamp: new Date('2025-01-01T10:00:00Z'), netPct: 1 },
        { timestamp: new Date('2025-01-01T11:00:00Z'), netPct: 2 },
        { timestamp: new Date('2025-01-02T11:00:00Z'), netPct: -1 },
    ], 7);
    expect(summary.avgNetPct).toBeCloseTo(2 / 3);
    expect(summary.positiveDaysPct).toBe(50);
    expect(summary.simulatedReturnPct).toBe(1);
});
