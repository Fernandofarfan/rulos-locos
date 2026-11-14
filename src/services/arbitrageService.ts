import config from '../config';
import dolarApiService, { DolarCasa } from './dolarApiService';
import logger from '../utils/logger';
import { referenceFees } from '../config/fees';
import { calculateNet, type NetCalculation, type NetLeg } from './netArbitrage';
import { recordSourceSuccess } from './sourceHealth';

interface ExchangeData {
    crypto: string;
    exchange: string;
    ask: number | null;
    bid: number | null;
    totalAsk?: number;
    totalBid?: number;
    timestamp?: string;
    available: boolean;
}

type CryptoMap = Record<string, Record<string, ExchangeData>>;

export interface ArbitrageOpportunity {
    id: string;
    net: NetCalculation;
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
    source?: string;
    isEstimated?: boolean;
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
                            const response = await fetch(
                                `${config.API_URLS.CRIPTOYA}/${exchange}/${crypto}/ARS/1`,
                                {
                                    headers: config.DEFAULT_HEADERS,
                                    signal: AbortSignal.timeout(4000),
                                } as Parameters<typeof fetch>[1],
                            );
                            if (!response.ok) throw new Error(`HTTP ${response.status}`);
                            const data = await response.json() as { ask?: number | string; bid?: number | string; totalAsk?: number | string; totalBid?: number | string; time?: number };
                            return {
                                crypto,
                                exchange,
                                ask: parseFloat(String(data.ask)) || null,
                                bid: parseFloat(String(data.bid)) || null,
                                totalAsk: parseFloat(String(data.totalAsk)) || undefined,
                                totalBid: parseFloat(String(data.totalBid)) || undefined,
                                timestamp: data.time ? new Date(data.time * 1000).toISOString() : undefined,
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
            if (allResults.some(result => result.available)) await recordSourceSuccess('criptoya');
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
        const dollarLeg = (kind: string, side: 'buy' | 'sell', price: number): NetLeg => ({
            price, fees: kind === 'mep' || kind === 'ccl' ? [
                { label: 'Comisión bróker', pct: side === 'buy' ? referenceFees.brokerBuyPct : referenceFees.brokerSellPct },
                { label: 'Derechos de mercado', pct: referenceFees.marketRightsPct },
            ] : [{ label: 'Transferencia bancaria', pct: referenceFees.bankTransferPct }],
        });
        const cryptoLeg = (data: ExchangeData, side: 'buy' | 'sell'): NetLeg => {
            const total = side === 'buy' ? data.totalAsk : data.totalBid;
            const included = !!total && total > 0;
            return { price: included ? total : (side === 'buy' ? data.ask! : data.bid!),
                fees: [{ label: included ? 'Comisión incluida en cotización' : 'Comisión cripto',
                    pct: included ? 0 : data.exchange === 'binancep2p' ? referenceFees.p2pPct : referenceFees.exchangeTradePct }] };
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

                    const net1 = calculateNet(capital, dollarLeg(tipoDolar, 'buy', dolar.venta), cryptoLeg(data, 'sell'), referenceFees.withdrawalUsdt, referenceFees.taxPct, 'T+0 a T+1 y horas de red');
                    const comision1 = net1.fees.reduce((sum, fee) => sum + fee.amountArs, 0);
                    const rentabilidad1 = (data.bid / dolar.venta - 1) * 100;
                    const ganancia1 = capital * rentabilidad1 / 100;

                    if (rentabilidad1 > 0.5) {
                        opportunities.push({
                            id: `${tipoDolar}-${crypto.toLowerCase()}-${exchange}`, net: net1,
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
                            comisiones: comision1.toFixed(2),
                        });
                    }

                    const net2 = calculateNet(capital, cryptoLeg(data, 'buy'), dollarLeg(tipoDolar, 'sell', dolar.compra), referenceFees.withdrawalUsdt, referenceFees.taxPct, 'T+0 a T+1 y horas de red');
                    const comision2 = net2.fees.reduce((sum, fee) => sum + fee.amountArs, 0);
                    const rentabilidad2 = (dolar.compra / data.ask - 1) * 100;
                    const ganancia2 = capital * rentabilidad2 / 100;

                    if (rentabilidad2 > 0.5) {
                        opportunities.push({
                            id: `${crypto.toLowerCase()}-${tipoDolar}-${exchange}`, net: net2,
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
                            comisiones: comision2.toFixed(2),
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
                        const usdtArs = Object.values(cryptos.USDT ?? {}).find(value => value.bid && value.bid > 0)?.bid ?? dolares.mep?.venta ?? dolares.ccl?.venta;
                        if (!usdtArs) continue;
                        const net = calculateNet(capital, cryptoLeg(data1, 'buy'), cryptoLeg(data2, 'sell'),
                            referenceFees.withdrawalUsdt * usdtArs / data2.bid, referenceFees.taxPct, 'horas de red');
                        const comisionTotal = net.fees.reduce((sum, fee) => sum + fee.amountArs, 0);
                        const rentabilidad = (data2.bid / data1.ask - 1) * 100;
                        const gananciaFinal = capital * rentabilidad / 100;
                        if (rentabilidad > 0.5) {
                            opportunities.push({
                                id: `${crypto.toLowerCase()}-${exchange1}-a-${exchange2}`, net,
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
                        const usdtArs = Object.values(cryptos.USDT ?? {}).find(value => value.bid && value.bid > 0)?.bid ?? dolares.mep?.venta ?? dolares.ccl?.venta;
                        if (!usdtArs) continue;
                        const net = calculateNet(capital, cryptoLeg(data2, 'buy'), cryptoLeg(data1, 'sell'),
                            referenceFees.withdrawalUsdt * usdtArs / data1.bid, referenceFees.taxPct, 'horas de red');
                        const comisionTotal = net.fees.reduce((sum, fee) => sum + fee.amountArs, 0);
                        const rentabilidad = (data1.bid / data2.ask - 1) * 100;
                        const gananciaFinal = capital * rentabilidad / 100;
                        if (rentabilidad > 0.5) {
                            opportunities.push({
                                id: `${crypto.toLowerCase()}-${exchange2}-a-${exchange1}`, net,
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
        return opportunities.map(opportunity => ({ ...opportunity, source: 'estimado', isEstimated: true }));
    }
}

export default new ArbitrageService();
