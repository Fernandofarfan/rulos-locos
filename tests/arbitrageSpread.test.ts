import arbitrageService from '../src/services/arbitrageService';

it('calculates the net blue-to-USDT spread with both fees', () => {
    const result = arbitrageService.analyze({
        blue: { casa: 'blue', nombre: 'Blue', compra: 980, venta: 1000 },
        mep: null, ccl: null, oficial: null,
    }, {
        USDT: { binance: { crypto: 'USDT', exchange: 'binance', ask: 1110, bid: 1100, available: true } },
    });
    const opportunity = result.find(item => item.type === 'blue_to_stable');
    // 100 USD-equivalent units minus one reference withdrawal unit, sold at 1100 less 0.1%.
    expect(opportunity).toMatchObject({ capital: 100000, ganancia: '10000.00', rentabilidad: '10.00', comisiones: '1208.90' });
    expect(opportunity!.net.netArs).toBeCloseTo(8791.10);
    expect(opportunity!.net.netPct).toBeCloseTo(8.7911);
});
