import { provenanceReplacer } from '../src/utils/provenance';

it('marks synthetic and live items without changing arrays or date serialization', () => {
    const body = JSON.parse(JSON.stringify({
        items: [
            { source: 'Yahoo Finance', price: 100 },
            { source: 'argentinadatos', estimated: true, price: 200 },
        ],
        timestamp: new Date('2026-01-01T00:00:00Z'),
    }, provenanceReplacer));
    expect(body.items).toEqual([
        { source: 'Yahoo Finance', price: 100, isEstimated: false },
        { source: 'estimado', estimated: true, price: 200, isEstimated: true },
    ]);
    expect(body.timestamp).toBe('2026-01-01T00:00:00.000Z');
});
