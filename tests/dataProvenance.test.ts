jest.mock('../src/utils/cache', () => ({
    __esModule: true, default: { get: jest.fn().mockResolvedValue(null), set: jest.fn() },
}));
jest.mock('../src/services/marketService', () => ({
    __esModule: true, default: { getQuotesBatch: jest.fn().mockResolvedValue([]) },
}));
jest.mock('../src/services/dolarApiService', () => ({
    __esModule: true, default: { getAllDollars: jest.fn().mockResolvedValue([{ casa: 'contadoconliqui', venta: 1000 }]) },
}));
jest.mock('../src/services/argentinaDatosService', () => ({
    __esModule: true, default: {
        getHistoricalDollars: jest.fn().mockRejectedValue(new Error('unavailable')),
        getReservasHistory: jest.fn().mockResolvedValue({
            data: [{ fecha: '2026-11-01', valor: 43000 }], source: 'estimado', estimated: true,
        }),
    },
}));

import type { Request, Response } from 'express';
import economicsController from '../src/controllers/economicsController';
import marketService from '../src/services/marketService';

function response() {
    return { json: jest.fn() } as unknown as Response & { json: jest.Mock };
}
const request = {} as Request;

it('converts fallback bond prices from USD and labels the curve estimated', async () => {
    const res = response();
    await economicsController.getYieldCurve(request, res);
    const body = res.json.mock.calls[0][0];
    expect(body).toMatchObject({ estimated: true, source: 'estimado' });
    expect(body.points[0].priceUSD).toBe(62.5);
    expect(body.points[0].priceARS).toBe(62500);
    expect(body.points.every((point: { ytm: number; priceUSD: number }) =>
        point.priceUSD >= 5 && point.priceUSD <= 200 && point.ytm >= -5 && point.ytm <= 60)).toBe(true);
});

it('drops implausible yield points and returns an estimated empty curve', async () => {
    jest.mocked(marketService.getQuotesBatch).mockResolvedValueOnce(
        ['AL29', 'AL30', 'AL35', 'AL41', 'GD29', 'GD30', 'GD35', 'GD41']
            .map(symbol => ({ symbol: `${symbol}.BA`, regularMarketPrice: 100 })),
    );
    const res = response();
    await economicsController.getYieldCurve(request, res);
    expect(res.json.mock.calls[0][0]).toMatchObject({ points: [], estimated: true, source: 'estimado' });
});

it('preserves the provenance of synthetic reserves', async () => {
    const res = response();
    await economicsController.getReservas(request, res);
    expect(res.json.mock.calls[0][0]).toMatchObject({ source: 'estimado', isEstimated: true });
});

it('marks generated historical data as estimated', async () => {
    const res = response();
    const req = { params: { indicator: 'blue' }, query: { range: '6M' } } as unknown as Request;
    await economicsController.getHistoricalData(req, res);
    expect(res.json.mock.calls[0][0]).toMatchObject({ source: 'estimado', isEstimated: true });
    expect(res.json.mock.calls[0][0].values.length).toBeGreaterThan(0);
});
