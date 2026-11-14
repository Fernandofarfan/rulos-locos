import { calculateNet, calculateRoutes } from '../src/services/netArbitrage';
import { parseFeeOverride } from '../src/config/fees';
import { rankPlatforms } from '../src/controllers/platformBestController';

it('calculates net proceeds and breakeven with fixed withdrawal fees', () => {
    const net = calculateNet(100_000, { price: 1000, fees: [{ label: 'compra', pct: 1 }] },
        { price: 1100, fees: [{ label: 'venta', pct: 1 }] }, 1, 0, 'horas');
    // 100000/(1000*1.01) = 99.0099 units; withdraw 1, sell at 1100 less 1%.
    expect(net.grossArs).toBeCloseTo(10_000);
    expect(net.netArs).toBeCloseTo((100_000 / 1010 - 1) * 1100 * 0.99 - 100_000);
    expect(net.fees[0].amountArs).toBeCloseTo(100_000 / 1010 * 1000 * 0.01);
    expect(net.fees[1].amountArs).toBeCloseTo(1100);
    expect(calculateNet(net.breakEvenCapitalArs!, { price: 1000, fees: [{ label: 'compra', pct: 1 }] },
        { price: 1100, fees: [{ label: 'venta', pct: 1 }] }, 1, 0, 'horas').netArs).toBeCloseTo(0);
    expect(calculateNet(100_000, { price: 1100, fees: [] }, { price: 1000, fees: [] }, 1, 0, 'horas').breakEvenCapitalArs).toBeNull();
});

it('ranks platforms by final price for each direction', () => {
    const quotes = [1010, 990, 1000].map((finalPrice, i) => ({
        platform: String(i), quote: 1000, finalPrice, totalArs: finalPrice, source: 'estimado',
        quoteSource: 'CriptoYa', isEstimated: true,
    }));
    expect(rankPlatforms(quotes, 'buy').map(q => q.finalPrice)).toEqual([990, 1000, 1010]);
    expect(rankPlatforms(quotes, 'sell').map(q => q.finalPrice)).toEqual([1010, 1000, 990]);
});

it('validates base64url fee overrides and rejects unknown keys', () => {
    expect(parseFeeOverride(Buffer.from(JSON.stringify({ p2pPct: 0.5 })).toString('base64url'))).toEqual({ p2pPct: 0.5 });
    expect(() => parseFeeOverride(Buffer.from(JSON.stringify({ surprise: 1 })).toString('base64url'))).toThrow();
    expect(() => parseFeeOverride('!')).toThrow();
    expect(() => parseFeeOverride(Buffer.from(JSON.stringify({ brokerSellPct: 100, marketRightsPct: 1 })).toString('base64url'))).toThrow();
});

it('uses fee-inclusive crypto quotes and ranks the best exchange for each route', () => {
    const rows = calculateRoutes({
        dolares: { blue: null, oficial: null, ccl: null, mep: { casa: 'bolsa', nombre: 'MEP', compra: 1000, venta: 1010 } },
        cryptos: { USDT: {
            first: { crypto: 'USDT', exchange: 'first', ask: 1100, bid: 1090, totalAsk: 1120, totalBid: 1080, available: true },
            second: { crypto: 'USDT', exchange: 'second', ask: 1100, bid: 1095, totalAsk: 1110, totalBid: 1090, available: true },
        } }, opportunities: [], timestamp: '2026-11-13T00:00:00Z',
    }, 100_000, { brokerBuyPct: 0, marketRightsPct: 0, withdrawalUsdt: 0, exchangeTradePct: 5 });
    const route = rows.find(row => row.id === 'mep-usdt')!;
    expect(route.description).toContain('second');
    expect(route.net.netArs).toBeCloseTo(100_000 / 1010 * 1090 - 100_000);
});
