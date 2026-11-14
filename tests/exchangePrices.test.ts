import { filterPriceOutliers, type ExchangePrice } from '../src/services/exchangeService';

const now = Date.parse('2026-11-14T00:00:00Z');
function quote(last: number, timestamp = now): ExchangePrice {
    return { exchange: 'test', symbol: 'BTC/USDT', bid: last, ask: last, last, timestamp };
}

it('removes invalid prices and quotes more than 10% from the median', () => {
    expect(filterPriceOutliers([quote(70000), quote(71000), quote(69000), quote(35000), quote(0)], now)
        .map(price => price.last)).toEqual([70000, 71000, 69000]);
});

it('drops stale, missing and implausibly future timestamps before calculating the median', () => {
    expect(filterPriceOutliers([
        quote(70000), quote(71000), quote(68000, now - 30 * 86400000),
        quote(68000, 0), quote(68000, now + 10 * 60000),
    ], now).map(price => price.last)).toEqual([70000, 71000]);
});
