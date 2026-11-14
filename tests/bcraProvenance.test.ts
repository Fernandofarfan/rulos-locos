jest.mock('../src/config', () => ({
    __esModule: true,
    default: {
        BCRA_TOKEN: 'test-token',
        API_URLS: { BCRA_STATS: 'https://example.test' },
        DEFAULT_HEADERS: {},
    },
}));

import bcraService from '../src/services/bcraService';

describe('BCRA source selection', () => {
    const originalFetch = global.fetch;
    afterEach(() => { global.fetch = originalFetch; });

    it('identifies official data and converts monetary base from millions of pesos', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ results: [{ detalle: [{ fecha: '2026-01-01', valor: 123 }] }] }),
        }) as jest.Mock;
        await expect(bcraService.getBaseMonetariaWithSource()).resolves.toEqual({ value: 123_000_000, source: 'BCRA' });
    });

    it('identifies the secondary service when the official API fails', async () => {
        global.fetch = jest.fn()
            .mockRejectedValueOnce(new Error('official unavailable'))
            .mockResolvedValueOnce({ ok: true, json: async () => [{ v: 49000, d: '2026-01-01' }] }) as jest.Mock;
        await expect(bcraService.getReservesWithSource()).resolves.toEqual({ value: 49000, source: 'estadisticasbcra.com' });
    });
});
