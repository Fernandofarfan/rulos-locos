import fetch from 'node-fetch';
import config from '../config';
import dolarApiService, { DolarCasa } from './dolarApiService';
import logger from '../utils/logger';

interface ExchangeData {
    crypto: string;
    exchange: string;
    ask: number | null;
    bid: number | null;
    available: boolean;
}

type CryptoMap = Record<string, Record<string, ExchangeData>>;

export interface ArbitrageOpportunity {
    type: string;
    description: string;
    steps: string[];
    capital: number;
    ganancia: string;
    rentabilidad: string;
    riesgo: string;
    tiempo: string;
    comisiones: string;
    buyPrice?: number;
    sellPrice?: number;
}

export interface ArbitrageResult {
    dolares: {
        blue: DolarCasa | null;
        oficial: DolarCasa | null;
        mep: DolarCasa | null;
        ccl: DolarCasa | null;
        [key: string]: DolarCasa | null;
    };
    cryptos: CryptoMap;
    opportunities: ArbitrageOpportunity[];
    timestamp: string;
}

class ArbitrageService {
    async calculateArbitrage(): Promise<ArbitrageResult> {
        try {
            const dolaresData = await dolarApiService.getAllDollars();
            const dolares = {
                blue: dolaresData.find((d) => d.casa === 'blue') ?? null,
                oficial: dolaresData.find((d) => d.casa === 'oficial') ?? null,
                mep: dolaresData.find((d) => d.casa === 'bolsa' || d.nombre.toLowerCase().includes('mep')) ?? null,
                ccl: dolaresData.find((d) => d.casa === 'contadoconliqui' || d.nombre.toLowerCase().includes('ccl')) ?? null,
            };

            const cryptos: string[] = ['USDT', 'BTC', 'ETH', 'DAI'];
            const exchanges: string[] = ['binancep2p', 'ripio', 'buenbit', 'letsbit', 'lemoncash', 'satoshitango', 'fiwind'];
            const cryptosData: CryptoMap = {};
            const allPromises: Promise<ExchangeData>[] = [];

            for (const crypto of cryptos) {
                cryptosData[crypto] = {};
                for (const exchange of exchanges) {
                    const promise = (async (): Promise<ExchangeData> => {
                        try {
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 4000);
                            const response = await fetch(
                                `${config.API_URLS.CRIPTOYA}/${exchange}/${crypto}/ARS/1`,
                                {
                                    headers: config.DEFAULT_HEADERS,
                                    signal: controller.signal as unknown as AbortSignal,
                                } as Parameters<typeof fetch>[1],
                            );
                            clearTimeout(timeoutId);
                            if (!response.ok) throw new Error(`HTTP ${response.status}`);
                            const data = await response.json() as { ask?: number | string; bid?: number | string };
                            return {
                                crypto,
                                exchange,
                                ask: parseFloat(String(data.ask)) || null,
                                bid: parseFloat(String(data.bid)) || null,
                                available: !!(data.ask && data.bid),
                            };
                        } catch {
                            return { crypto, exchange, ask: null, bid: null, available: false };
                        }
                    })();
                    allPromises.push(promise);
                }
            }

            const allResults = await Promise.all(allPromises);
            allResults.forEach((result) => {
                if (cryptosData[result.crypto]) {
                    cryptosData[result.crypto][result.exchange] = result;
                }
            });

            const opportunities = this.analyze(dolares, cryptosData);
            return { dolares, cryptos: cryptosData, opportunities, timestamp: new Date().toISOString() };
        } catch (err) {
            logger.error('Error en ArbitrageService.calculateArbitrage: %s', (err as Error).stack);
            throw err;
        }
    }

    analyze(dolares: ArbitrageResult['dolares'], cryptos: CryptoMap): ArbitrageOpportunity[] {
        const opportunities: ArbitrageOpportunity[] = [];
        const COMISIONES = {
            transferenciaBancaria: 0.01,
            cryptoExchange: 0.01,
            cryptoWithdrawal: 0.005,
            p2p: 0.005,
            mepCcl: 0.015,
        };

        const stablecoins = ['USDT', 'DAI'];
        const tiposDolar = ['blue', 'mep', 'ccl', 'oficial'] as const;

        tiposDolar.forEach((tipoDolar) => {
            const dolar = dolares[tipoDolar];
            if (!dolar || !dolar.venta || !dolar.compra) return;

            for (const crypto of stablecoins) {
                if (!cryptos[crypto]) continue;

                for (const [exchange, data] of Object.entries(cryptos[crypto])) {
                    if (!data.available || !data.bid || !data.ask) continue;
                    const capital = 100000;

                    const usdComprados = capital / dolar.venta;
                    const arsObtenidos = usdComprados * data.bid;
                    const comision1 = capital * (tipoDolar === 'blue' ? COMISIONES.transferenciaBancaria : COMISIONES.mepCcl);
                    const comision2 = capital * COMISIONES.p2p;
                    const ganancia1 = arsObtenidos - capital - comision1 - comision2;
                    const rentabilidad1 = (ganancia1 / capital) * 100;

                    if (rentabilidad1 > 0.5) {
                        opportunities.push({
                            type: `${tipoDolar}_to_stable`,
                            description: `Comprar USD ${tipoDolar.toUpperCase()} → ${crypto} → Vender en ${exchange}`,
                            steps: [
                                `1. Comprar USD ${tipoDolar.toUpperCase()} a $${dolar.venta.toFixed(2)}`,
                                `2. Cambiar USD por ${crypto} (1:1)`,
                                `3. Vender ${crypto} en ${exchange} a $${data.bid.toFixed(2)}`,
                            ],
                            capital, ganancia: ganancia1.toFixed(2), rentabilidad: rentabilidad1.toFixed(2),
                            riesgo: tipoDolar === 'blue' ? 'medio' : tipoDolar === 'oficial' ? 'alto' : 'bajo',
                            tiempo: tipoDolar === 'blue' ? '24-48hs' : tipoDolar === 'oficial' ? '72-96hs' : '48-72hs',
                            comisiones: (comision1 + comision2).toFixed(2),
                        });
                    }

                    const stableComprados = capital / data.ask;
                    const arsObtenidos2 = stableComprados * dolar.compra;
                    const comision3 = capital * COMISIONES.p2p;
                    const comision4 = capital * (tipoDolar === 'blue' ? COMISIONES.transferenciaBancaria : COMISIONES.mepCcl);
                    const ganancia2 = arsObtenidos2 - capital - comision3 - comision4;
                    const rentabilidad2 = (ganancia2 / capital) * 100;

                    if (rentabilidad2 > 0.5) {
                        opportunities.push({
                            type: `stable_to_${tipoDolar}`,
                            description: `Comprar ${crypto} en ${exchange} → USD ${tipoDolar.toUpperCase()} → Vender`,
                            steps: [
                                `1. Comprar ${crypto} en ${exchange} a $${data.ask.toFixed(2)}`,
                                `2. Cambiar ${crypto} por USD (1:1)`,
                                `3. Vender USD ${tipoDolar.toUpperCase()} a $${dolar.compra.toFixed(2)}`,
                            ],
                            capital, ganancia: ganancia2.toFixed(2), rentabilidad: rentabilidad2.toFixed(2),
                            riesgo: tipoDolar === 'blue' ? 'medio' : tipoDolar === 'oficial' ? 'alto' : 'bajo',
                            tiempo: tipoDolar === 'blue' ? '24-48hs' : tipoDolar === 'oficial' ? '72-96hs' : '48-72hs',
                            comisiones: (comision3 + comision4).toFixed(2),
                        });
                    }
                }
            }
        });

        // Arbitraje entre exchanges
        for (const [crypto, exchanges] of Object.entries(cryptos)) {
            const exchangesList = Object.entries(exchanges).filter(([, data]) => data.available);
            for (let i = 0; i < exchangesList.length; i++) {
                for (let j = i + 1; j < exchangesList.length; j++) {
                    const [exchange1, data1] = exchangesList[i];
                    const [exchange2, data2] = exchangesList[j];
                    if (!data1.ask || !data2.bid) continue;
                    const capital = 100000;

                    if (data2.bid > data1.ask) {
                        const cryptoComprado = capital / data1.ask;
                        const arsVendido = cryptoComprado * data2.bid;
                        const comisionTotal = capital * (COMISIONES.cryptoExchange * 2 + COMISIONES.cryptoWithdrawal);
                        const gananciaFinal = arsVendido - capital - comisionTotal;
                        const rentabilidad = (gananciaFinal / capital) * 100;
                        if (rentabilidad > 0.5) {
                            opportunities.push({
                                type: 'crypto_arbitrage',
                                description: `Comprar ${crypto} en ${exchange1} → Vender en ${exchange2}`,
                                steps: [
                                    `1. Comprar ${crypto} en ${exchange1} a $${data1.ask.toFixed(2)}`,
                                    `2. Transferir ${crypto} a ${exchange2}`,
                                    `3. Vender ${crypto} en ${exchange2} a $${data2.bid.toFixed(2)}`,
                                ],
                                capital, ganancia: gananciaFinal.toFixed(2), rentabilidad: rentabilidad.toFixed(2),
                                riesgo: 'bajo', tiempo: '1-6hs', comisiones: comisionTotal.toFixed(2),
                            });
                        }
                    }
                    if (data1.bid && data2.ask && data1.bid > data2.ask) {
                        const cryptoComprado = capital / data2.ask;
                        const arsVendido = cryptoComprado * data1.bid;
                        const comisionTotal = capital * (COMISIONES.cryptoExchange * 2 + COMISIONES.cryptoWithdrawal);
                        const gananciaFinal = arsVendido - capital - comisionTotal;
                        const rentabilidad = (gananciaFinal / capital) * 100;
                        if (rentabilidad > 0.5) {
                            opportunities.push({
                                type: 'crypto_arbitrage',
                                description: `Comprar ${crypto} en ${exchange2} → Vender en ${exchange1}`,
                                steps: [
                                    `1. Comprar ${crypto} en ${exchange2} a $${data2.ask.toFixed(2)}`,
                                    `2. Transferir ${crypto} a ${exchange1}`,
                                    `3. Vender ${crypto} en ${exchange1} a $${data1.bid.toFixed(2)}`,
                                ],
                                capital, ganancia: gananciaFinal.toFixed(2), rentabilidad: rentabilidad.toFixed(2),
                                riesgo: 'bajo', tiempo: '1-6hs', comisiones: comisionTotal.toFixed(2),
                            });
                        }
                    }
                }
            }
        }

        opportunities.sort((a, b) => parseFloat(b.rentabilidad) - parseFloat(a.rentabilidad));
        return opportunities;
    }
}

export default new ArbitrageService();
