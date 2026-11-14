import arbitrageService from '../src/services/arbitrageService';

it('calculates the net blue-to-USDT spread with both fees', () => {
    const result = arbitrageService.analyze({
        blue: { casa: 'blue', nombre: 'Blue', compra: 980, venta: 1000 },
        mep: null, ccl: null, oficial: null,
    }, {
        USDT: { binance: { crypto: 'USDT', exchange: 'binance', ask: 1110, bid: 1100, available: true } },
    });
    const opportunity = result.find(item => item.type === 'blue_to_stable');
    // $100,000 / $1,000 * $1,100 = $110,000; fees are 1% + 0.5% of initial capital.
    expect(opportunity).toMatchObject({ capital: 100000, ganancia: '8500.00', rentabilidad: '8.50', comisiones: '1500.00' });
});
