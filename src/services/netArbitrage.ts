import { referenceFees, type FeeOverride, type Fees } from '../config/fees';
import type { ArbitrageResult } from './arbitrageService';

export interface NetFee { step: string; label: string; amountArs: number }
export interface NetCalculation {
    capitalArs: number; grossArs: number; grossPct: number; fees: NetFee[];
    taxesArs: number; netArs: number; netPct: number; breakEvenCapitalArs: number | null;
    settlement: string;
}

export interface NetLeg {
    price: number;
    fees: { label: string; pct: number }[];
}

export function calculateNet(
    capital: number, buy: NetLeg, sell: NetLeg, withdrawalUnits: number, taxPct: number, settlement: string,
): NetCalculation {
    if (!Number.isFinite(capital) || capital <= 0 || !Number.isFinite(buy.price) || buy.price <= 0 ||
        !Number.isFinite(sell.price) || sell.price <= 0 || !Number.isFinite(withdrawalUnits) || withdrawalUnits < 0 ||
        !Number.isFinite(taxPct) || taxPct < 0 || [...buy.fees, ...sell.fees].some(f => !Number.isFinite(f.pct) || f.pct < 0) ||
        sell.fees.reduce((sum, fee) => sum + fee.pct, 0) > 100) throw new Error('Datos inválidos');
    const buyRate = buy.fees.reduce((sum, fee) => sum + fee.pct, 0) / 100;
    const sellRate = sell.fees.reduce((sum, fee) => sum + fee.pct, 0) / 100;
    const grossProceeds = capital / buy.price * sell.price;
    const units = capital / (buy.price * (1 + buyRate));
    const buyFeeArs = units * buy.price * buyRate;
    const transferred = Math.max(0, units - withdrawalUnits);
    const fixedFee = (units - transferred) * sell.price;
    const sellProceeds = transferred * sell.price;
    const fees: NetFee[] = [
        ...buy.fees.map(fee => ({ step: 'compra', label: fee.label, amountArs: buyRate ? buyFeeArs * fee.pct / (buyRate * 100) : 0 })),
        { step: 'transferencia', label: 'Retiro de red', amountArs: fixedFee },
        ...sell.fees.map(fee => ({ step: 'venta', label: fee.label, amountArs: sellProceeds * fee.pct / 100 })),
    ];
    const taxesArs = capital * taxPct / 100;
    const grossArs = grossProceeds - capital;
    const netArs = sellProceeds * (1 - sellRate) - capital - taxesArs;
    const margin = sell.price / (buy.price * (1 + buyRate)) * (1 - sellRate) - 1 - taxPct / 100;
    const breakEvenCapitalArs = margin > 0 ? withdrawalUnits * sell.price * (1 - sellRate) / margin : null;
    return { capitalArs: capital, grossArs, grossPct: grossArs / capital * 100, fees, taxesArs,
        netArs, netPct: netArs / capital * 100, breakEvenCapitalArs, settlement };
}

export const DOLLAR_KINDS = ['oficial', 'blue', 'mep', 'ccl'] as const;
export const ROUTE_IDS = [
    ...DOLLAR_KINDS.flatMap(from => DOLLAR_KINDS.filter(to => to !== from).map(to => `${from}-${to}`)),
    ...DOLLAR_KINDS.flatMap(kind => [`${kind}-usdt`, `usdt-${kind}`]),
] as readonly string[];

interface Quote { buy: number; sell: number; source: string; estimated: boolean; updatedAt?: string; exchange?: string; inclusiveBuy?: boolean; inclusiveSell?: boolean }

function dollarLeg(kind: typeof DOLLAR_KINDS[number], quote: Quote, side: 'buy' | 'sell', fees: Fees): NetLeg {
    const items = kind === 'mep' || kind === 'ccl'
        ? [{ label: 'Comisión bróker', pct: side === 'buy' ? fees.brokerBuyPct : fees.brokerSellPct }, { label: 'Derechos de mercado', pct: fees.marketRightsPct }]
        : [{ label: 'Transferencia bancaria', pct: fees.bankTransferPct }];
    return { price: side === 'buy' ? quote.buy : quote.sell, fees: items };
}

function cryptoLeg(quote: Quote, side: 'buy' | 'sell', fees: Fees): NetLeg {
    const inclusive = side === 'buy' ? quote.inclusiveBuy : quote.inclusiveSell;
    const pct = inclusive ? 0 : quote.exchange === 'binancep2p' ? fees.p2pPct : fees.exchangeTradePct;
    return { price: side === 'buy' ? quote.buy : quote.sell, fees: [{ label: inclusive ? 'Comisión incluida en cotización' : 'Comisión cripto', pct }] };
}

export function calculateRoutes(result: ArbitrageResult, capital: number, overrides: FeeOverride = {}) {
    const fees: Fees = { ...referenceFees, ...overrides };
    const dollars = new Map<typeof DOLLAR_KINDS[number], Quote>();
    for (const kind of DOLLAR_KINDS) {
        const d = result.dolares[kind];
        if (d && d.venta > 0 && d.compra > 0) dollars.set(kind, {
            buy: d.venta, sell: d.compra, source: d.source ?? 'DolarAPI',
            estimated: !!d.isEstimated, updatedAt: d.fechaActualizacion,
        });
    }
    const cryptos: Quote[] = Object.values(result.cryptos.USDT ?? {}).filter(d => d.available && d.ask && d.bid).map(d => ({
        buy: d.totalAsk && d.totalAsk > 0 ? d.totalAsk : d.ask!,
        sell: d.totalBid && d.totalBid > 0 ? d.totalBid : d.bid!,
        source: 'CriptoYa', estimated: false, exchange: d.exchange, updatedAt: d.timestamp,
        inclusiveBuy: !!(d.totalAsk && d.totalAsk > 0), inclusiveSell: !!(d.totalBid && d.totalBid > 0),
    }));
    type RouteRow = { id: string; description: string; source: string; isEstimated: boolean; updatedAt: string; net: NetCalculation;
        quoteSources: { side: 'compra' | 'venta'; source: string; updatedAt?: string; isEstimated: boolean }[] };
    const sources = (buy: Quote, sell: Quote): RouteRow['quoteSources'] => [
        { side: 'compra', source: buy.source, updatedAt: buy.updatedAt, isEstimated: buy.estimated },
        { side: 'venta', source: sell.source, updatedAt: sell.updatedAt, isEstimated: sell.estimated },
    ];
    const rows: RouteRow[] = [];
    for (const [from, buyQuote] of dollars) {
        for (const [to, sellQuote] of dollars) {
            if (from === to) continue;
            const net = calculateNet(capital, dollarLeg(from, buyQuote, 'buy', fees), dollarLeg(to, sellQuote, 'sell', fees), 0, fees.taxPct, 'T+0 a T+1; puede variar');
            rows.push({ id: `${from}-${to}`, description: `${from.toUpperCase()} → ${to.toUpperCase()}`,
                source: 'estimado', isEstimated: true, updatedAt: result.timestamp, net, quoteSources: sources(buyQuote, sellQuote) });
        }
        for (const crypto of cryptos) {
            const buyCrypto = calculateNet(capital, dollarLeg(from, buyQuote, 'buy', fees), cryptoLeg(crypto, 'sell', fees), fees.withdrawalUsdt, fees.taxPct, 'T+0 a T+1 y horas de red');
            const sellCrypto = calculateNet(capital, cryptoLeg(crypto, 'buy', fees), dollarLeg(from, buyQuote, 'sell', fees), fees.withdrawalUsdt, fees.taxPct, 'T+0 a T+1 y horas de red');
            for (const [id, description, net, quoteSources] of [
                [`${from}-usdt`, `${from.toUpperCase()} → USDT (${crypto.exchange})`, buyCrypto, sources(buyQuote, crypto)],
                [`usdt-${from}`, `USDT (${crypto.exchange}) → ${from.toUpperCase()}`, sellCrypto, sources(crypto, buyQuote)],
            ] as const) {
                const existing = rows.findIndex(row => row.id === id);
                const row: RouteRow = { id, description, source: 'estimado', isEstimated: true, updatedAt: result.timestamp, net, quoteSources };
                if (existing < 0) rows.push(row);
                else if (rows[existing].net.netArs < net.netArs) rows[existing] = row;
            }
        }
    }
    return rows.sort((a, b) => b.net.netPct - a.net.netPct);
}
