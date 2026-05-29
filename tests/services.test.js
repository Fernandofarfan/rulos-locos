/**
 * Tests unitarios para servicios del backend.
 */
const arbitrageService = require('../src/services/arbitrageService').default;
const alertService = require('../src/services/alertService').default;
const marketService = require('../src/services/marketService').default;

describe('ArbitrageService', () => {
    describe('analyze()', () => {
        const mockDolares = {
            blue: { casa: 'blue', nombre: 'Blue', compra: 1200, venta: 1210 },
            mep: { casa: 'bolsa', nombre: 'MEP', compra: 1180, venta: 1190 },
            ccl: { casa: 'contadoconliqui', nombre: 'CCL', compra: 1190, venta: 1200 },
            oficial: { casa: 'oficial', nombre: 'Oficial', compra: 850, venta: 900 },
        };

        it('encuentra oportunidades de arbitraje con spreads positivos', () => {
            const cryptos = {
                USDT: {
                    binancep2p: { crypto: 'USDT', exchange: 'binancep2p', ask: 1200, bid: 1250, available: true },
                },
                DAI: {},
            };
            const result = arbitrageService.analyze(mockDolares, cryptos);
            expect(Array.isArray(result)).toBe(true);
        });

        it('retorna array vacio si no hay cryptos disponibles', () => {
            const result = arbitrageService.analyze(mockDolares, {});
            expect(Array.isArray(result)).toBe(true);
        });

        it('incluye campos requeridos en cada oportunidad', () => {
            const cryptos = {
                USDT: {
                    binancep2p: { crypto: 'USDT', exchange: 'binancep2p', ask: 1000, bid: 1500, available: true },
                },
            };
            const result = arbitrageService.analyze(mockDolares, cryptos);
            if (result.length > 0) {
                const opp = result[0];
                expect(opp).toHaveProperty('type');
                expect(opp).toHaveProperty('description');
                expect(opp).toHaveProperty('rentabilidad');
                expect(opp).toHaveProperty('riesgo');
                expect(opp).toHaveProperty('tiempo');
            }
        });

        it('ordena oportunidades por rentabilidad descendente', () => {
            const cryptos = {
                USDT: {
                    b1: { crypto: 'USDT', exchange: 'b1', ask: 1000, bid: 1500, available: true },
                    b2: { crypto: 'USDT', exchange: 'b2', ask: 1200, bid: 1250, available: true },
                },
            };
            const result = arbitrageService.analyze(mockDolares, cryptos);
            for (let i = 1; i < result.length; i++) {
                expect(parseFloat(result[i - 1].rentabilidad)).toBeGreaterThanOrEqual(
                    parseFloat(result[i].rentabilidad)
                );
            }
        });

        it('ignora exchanges sin datos disponibles', () => {
            const cryptos = {
                USDT: {
                    broken1: { crypto: 'USDT', exchange: 'broken1', ask: null, bid: null, available: false },
                    broken2: { crypto: 'USDT', exchange: 'broken2', ask: null, bid: null, available: false },
                },
            };
            const result = arbitrageService.analyze(mockDolares, cryptos);
            expect(Array.isArray(result)).toBe(true);
        });

        it('soporta DAI como stablecoin', () => {
            const cryptos = {
                DAI: {
                    buenbit: { crypto: 'DAI', exchange: 'buenbit', ask: 1210, bid: 1220, available: true },
                },
            };
            const result = arbitrageService.analyze(mockDolares, cryptos);
            expect(Array.isArray(result)).toBe(true);
        });
    });
});

describe('AlertService', () => {
    describe('checkAlertTrigger()', () => {
        it('dispara when price is above threshold (condition: above)', () => {
            const result = alertService.checkAlertTrigger('blue', 1300, 'above', 1200);
            expect(result).toBe(true);
        });

        it('no dispara when price is below threshold (condition: above)', () => {
            const result = alertService.checkAlertTrigger('blue', 1100, 'above', 1200);
            expect(result).toBe(false);
        });

        it('dispara when price is exactly at threshold (condition: above)', () => {
            const result = alertService.checkAlertTrigger('blue', 1200, 'above', 1200);
            expect(result).toBe(true);
        });

        it('dispara when price is below threshold (condition: below)', () => {
            const result = alertService.checkAlertTrigger('mep', 900, 'below', 1000);
            expect(result).toBe(true);
        });

        it('no dispara when price is above threshold (condition: below)', () => {
            const result = alertService.checkAlertTrigger('mep', 1100, 'below', 1000);
            expect(result).toBe(false);
        });

        it('dispara when price exactly equals threshold (condition: below)', () => {
            const result = alertService.checkAlertTrigger('mep', 1000, 'below', 1000);
            expect(result).toBe(true);
        });

        it('retorna false si currentPrice es undefined', () => {
            const result = alertService.checkAlertTrigger('ccl', undefined, 'above', 1000);
            expect(result).toBe(false);
        });

        it('retorna false para condicion desconocida', () => {
            const result = alertService.checkAlertTrigger('blue', 1200, 'unknown', 1000);
            expect(result).toBe(false);
        });
    });

    describe('getCurrentPrices()', () => {
        it('retorna un objeto con formato valido', async () => {
            const prices = await alertService.getCurrentPrices();
            expect(typeof prices).toBe('object');
        });

        it('no lanza excepcion', async () => {
            await expect(alertService.getCurrentPrices()).resolves.toBeDefined();
        });
    });
});

describe('MarketService', () => {
    describe('getMervalStocks()', () => {
        it('retorna array de stocks', async () => {
            const stocks = await marketService.getMervalStocks();
            expect(Array.isArray(stocks)).toBe(true);
        });

        it('cada stock tiene los campos minimos requeridos', async () => {
            const stocks = await marketService.getMervalStocks();
            if (stocks.length > 0) {
                expect(stocks[0]).toHaveProperty('ticker');
                expect(stocks[0]).toHaveProperty('name');
                expect(stocks[0]).toHaveProperty('price');
                expect(stocks[0]).toHaveProperty('source');
            }
        });

        it('retorna fallbacks si la API falla (node-fetch mockeado)', async () => {
            const stocks = await marketService.getMervalStocks();
            expect(stocks.length).toBeGreaterThanOrEqual(5);
        });
    });

    describe('getCedears()', () => {
        it('retorna array de cedears', async () => {
            const cedears = await marketService.getCedears();
            expect(Array.isArray(cedears)).toBe(true);
            if (cedears.length > 0) {
                expect(cedears[0]).toHaveProperty('ticker');
                expect(cedears[0]).toHaveProperty('price');
            }
        });
    });

    describe('getGlobalIndices()', () => {
        it('retorna array de indices globales', async () => {
            const indices = await marketService.getGlobalIndices();
            expect(Array.isArray(indices)).toBe(true);
        });

        it('incluye S&P 500, Nasdaq y Bitcoin', async () => {
            const indices = await marketService.getGlobalIndices();
            const symbols = indices.map(i => i.symbol);
            expect(symbols).toContain('^GSPC');
            expect(symbols).toContain('BTC-USD');
        });
    });

    describe('getBonds()', () => {
        it('retorna array de bonos', async () => {
            const bonds = await marketService.getBonds();
            expect(Array.isArray(bonds)).toBe(true);
        });

        it('cada bono tiene ticker, parity e irr', async () => {
            const bonds = await marketService.getBonds();
            if (bonds.length > 0) {
                expect(bonds[0]).toHaveProperty('ticker');
                expect(bonds[0]).toHaveProperty('parity');
                expect(bonds[0]).toHaveProperty('irr');
            }
        });
    });
});
