import fetch from 'node-fetch';
import logger from '../utils/logger';

interface StooqQuote {
    symbol: string;
    name: string;
    close: number;
}

interface StockResult {
    ticker: string;
    name: string;
    price: number;
    priceUSD?: number;
    change: number;
    vol: string;
    ccl?: number;
    source: string;
}

interface GlobalIndex {
    symbol: string;
    name: string;
    price: number;
    change: number;
    source: string;
}

interface CoinGeckoResponse {
    [id: string]: {
        usd: number;
        usd_24h_change?: number;
    };
}

const STOOQ_HEADERS = { 'User-Agent': 'Mozilla/5.0' };
const STOOQ_TIMEOUT = 7000;

async function getStooqQuote(symbol: string): Promise<StooqQuote | null> {
    try {
        const url = `https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2cn&h&e=csv`;
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), STOOQ_TIMEOUT);
        const r = await fetch(url, {
            headers: STOOQ_HEADERS,
            signal: controller.signal as unknown as AbortSignal,
        } as Parameters<typeof fetch>[1]);
        clearTimeout(tid);
        if (!r.ok) return null;
        const text = await r.text();
        const lines = text.trim().split('\n');
        if (lines.length < 2) return null;
        const parts = lines[1].split(',');
        const sym = parts[0], close = parts[2], name = parts[3];
        if (!close || close.trim() === 'N/D') return null;
        return { symbol: sym.trim(), name: name ? name.trim() : sym.trim(), close: parseFloat(close.trim()) };
    } catch {
        return null;
    }
}

async function getCoinGeckoPrices(ids: string[]): Promise<CoinGeckoResponse> {
    try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 7000);
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`;
        const r = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
            signal: controller.signal as unknown as AbortSignal,
        } as Parameters<typeof fetch>[1]);
        clearTimeout(tid);
        if (!r.ok) throw new Error(`CoinGecko HTTP ${r.status}`);
        return (await r.json()) as CoinGeckoResponse;
    } catch (err) {
        logger.warn('CoinGecko API error:', (err as Error).message);
        return {};
    }
}

async function getCCLRate(): Promise<number | null> {
    try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 5000);
        const r = await fetch('https://dolarapi.com/v1/dolares/contadoconliqui', {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
            signal: controller.signal as unknown as AbortSignal,
        } as Parameters<typeof fetch>[1]);
        clearTimeout(tid);
        if (!r.ok) throw new Error(`DolarAPI CCL HTTP ${r.status}`);
        const data = await r.json() as { compra?: string | number; venta?: string | number };
        const compra = parseFloat(String(data.compra)) || 0;
        const venta = parseFloat(String(data.venta)) || 0;
        if (!compra && !venta) throw new Error('CCL sin valores');
        return compra && venta ? (compra + venta) / 2 : (compra || venta);
    } catch {
        return null;
    }
}

class MarketService {
    async getMervalStocks(): Promise<StockResult[]> {
        const adrMap = [
            { adr: 'ypf.us', ticker: 'YPFD', name: 'YPF S.A.' },
            { adr: 'ggal.us', ticker: 'GGAL', name: 'Grupo Galicia' },
            { adr: 'pam.us', ticker: 'PAMP', name: 'Pampa Energía' },
            { adr: 'bma.us', ticker: 'BMA', name: 'Banco Macro' },
            { adr: 'cepu.us', ticker: 'CEPU', name: 'Central Puerto' },
        ];
        const fallbacks: StockResult[] = [
            { ticker: 'YPFD', name: 'YPF S.A.', price: 55950, change: 0, vol: '-', source: 'fallback' },
            { ticker: 'GGAL', name: 'Grupo Galicia', price: 6850, change: 0, vol: '-', source: 'fallback' },
            { ticker: 'PAMP', name: 'Pampa Energía', price: 4230, change: 0, vol: '-', source: 'fallback' },
            { ticker: 'BMA', name: 'Banco Macro', price: 9100, change: 0, vol: '-', source: 'fallback' },
            { ticker: 'CEPU', name: 'Central Puerto', price: 1250, change: 0, vol: '-', source: 'fallback' },
        ];
        try {
            const cclRate = await getCCLRate();
            if (!cclRate) throw new Error('Sin CCL');
            const results = await Promise.allSettled(adrMap.map(item => getStooqQuote(item.adr)));
            const data: StockResult[] = results.map((r, i) => {
                const f = fallbacks.find(x => x.ticker === adrMap[i].ticker) || fallbacks[i];
                if (r.status !== 'fulfilled' || !r.value) return f;
                return {
                    ticker: adrMap[i].ticker, name: adrMap[i].name,
                    price: Math.round(r.value.close * cclRate), priceUSD: r.value.close,
                    change: 0, vol: '-', ccl: Math.round(cclRate), source: 'stooq_adr',
                };
            });
            return data;
        } catch {
            return fallbacks;
        }
    }

    async getCedears(): Promise<StockResult[]> {
        const stockMap = [
            { ticker: 'aapl.us', symbol: 'AAPL', name: 'Apple Inc.' },
            { ticker: 'meli.us', symbol: 'MELI', name: 'MercadoLibre' },
            { ticker: 'tsla.us', symbol: 'TSLA', name: 'Tesla Inc.' },
            { ticker: 'ko.us', symbol: 'KO', name: 'Coca-Cola Co.' },
            { ticker: 'spy.us', symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
            { ticker: 'nvda.us', symbol: 'NVDA', name: 'NVIDIA Corp.' },
            { ticker: 'amzn.us', symbol: 'AMZN', name: 'Amazon.com Inc.' },
        ];
        const fallbacks: StockResult[] = [
            { ticker: 'AAPL', name: 'Apple Inc.', price: 22500, change: 0, vol: '-', ccl: 1180, source: 'fallback' },
            { ticker: 'MELI', name: 'MercadoLibre', price: 1850000, change: 0, vol: '-', ccl: 1190, source: 'fallback' },
            { ticker: 'TSLA', name: 'Tesla Inc.', price: 45000, change: 0, vol: '-', ccl: 1185, source: 'fallback' },
            { ticker: 'KO', name: 'Coca-Cola Co.', price: 18000, change: 0, vol: '-', ccl: 1180, source: 'fallback' },
            { ticker: 'SPY', name: 'SPDR S&P 500 ETF', price: 65000, change: 0, vol: '-', ccl: 1182, source: 'fallback' },
            { ticker: 'NVDA', name: 'NVIDIA Corp.', price: 150000, change: 0, vol: '-', ccl: 1182, source: 'fallback' },
            { ticker: 'AMZN', name: 'Amazon.com Inc.', price: 20000, change: 0, vol: '-', ccl: 1182, source: 'fallback' },
        ];
        try {
            const cclRate = await getCCLRate();
            if (!cclRate) throw new Error('Sin CCL');
            const results = await Promise.allSettled(stockMap.map(item => getStooqQuote(item.ticker)));
            const data: StockResult[] = results.map((r, i) => {
                const f = fallbacks.find(x => x.ticker === stockMap[i].symbol) || fallbacks[i % fallbacks.length];
                if (r.status !== 'fulfilled' || !r.value) return f;
                return {
                    ticker: stockMap[i].symbol, name: stockMap[i].name,
                    price: Math.round(r.value.close * cclRate), priceUSD: r.value.close,
                    change: 0, vol: '-', ccl: Math.round(cclRate), source: 'stooq',
                };
            });
            return data;
        } catch {
            return fallbacks.slice(0, stockMap.length);
        }
    }

    async getGlobalIndices(): Promise<GlobalIndex[]> {
        const fallbacks: Record<string, GlobalIndex> = {
            '^GSPC': { symbol: '^GSPC', name: 'S&P 500', price: 5900, change: 0.5, source: 'fallback' },
            '^IXIC': { symbol: '^IXIC', name: 'Nasdaq', price: 19200, change: 0.8, source: 'fallback' },
            'BTC-USD': { symbol: 'BTC-USD', name: 'Bitcoin', price: 97500, change: 1.2, source: 'fallback' },
            'GC=F': { symbol: 'GC=F', name: 'Gold', price: 2900, change: 0.3, source: 'fallback' },
            'CL=F': { symbol: 'CL=F', name: 'WTI Oil', price: 73, change: -0.5, source: 'fallback' },
        };
        try {
            const stooqMap = [
                { stooq: '^spx', symbol: '^GSPC', name: 'S&P 500' },
                { stooq: '^ndx', symbol: '^IXIC', name: 'Nasdaq 100' },
                { stooq: 'gc.f', symbol: 'GC=F', name: 'Gold (oz)' },
                { stooq: 'cl.f', symbol: 'CL=F', name: 'WTI Oil' },
            ];
            const [stooqResults, coinGeckoData] = await Promise.all([
                Promise.allSettled(stooqMap.map(item => getStooqQuote(item.stooq))),
                getCoinGeckoPrices(['bitcoin', 'ethereum']),
            ]);
            
            const data: GlobalIndex[] = [];
            stooqResults.forEach((r, i) => {
                const sym = stooqMap[i].symbol;
                if (r.status === 'fulfilled' && r.value) {
                    data.push({ symbol: sym, name: stooqMap[i].name, price: r.value.close, change: 0, source: 'stooq' });
                } else {
                    data.push(fallbacks[sym]);
                }
            });

            if (coinGeckoData?.bitcoin?.usd) {
                data.push({ symbol: 'BTC-USD', name: 'Bitcoin', price: coinGeckoData.bitcoin.usd, change: parseFloat((coinGeckoData.bitcoin.usd_24h_change ?? 0).toFixed(2)), source: 'coingecko' });
            } else {
                data.push(fallbacks['BTC-USD']);
            }
            if (coinGeckoData?.ethereum?.usd) {
                data.push({ symbol: 'ETH-USD', name: 'Ethereum', price: coinGeckoData.ethereum.usd, change: parseFloat((coinGeckoData.ethereum.usd_24h_change ?? 0).toFixed(2)), source: 'coingecko' });
            }
            return data;
        } catch {
            return Object.values(fallbacks);
        }
    }

    async getBonds(): Promise<{ ticker: string; parity: number; irr: number; change: number; priceARS: number; priceUSD: number; source: string }[]> {
        const BOND_META = [
            { ticker: 'AL30', stooq: 'al30.ba', couponPct: 4.0, duration: 3.8 },
            { ticker: 'GD30', stooq: 'gd30.ba', couponPct: 4.0, duration: 3.8 },
            { ticker: 'AL35', stooq: 'al35.ba', couponPct: 3.625, duration: 7.4 },
            { ticker: 'GD35', stooq: 'gd35.ba', couponPct: 3.625, duration: 7.4 },
        ];
        const FALLBACKS = [
            { ticker: 'AL30', parity: 59.2, irr: 17.5, change: 1.2, priceARS: 0, priceUSD: 59.2, source: 'fallback' },
            { ticker: 'GD30', parity: 64.5, irr: 15.8, change: 0.8, priceARS: 0, priceUSD: 64.5, source: 'fallback' },
            { ticker: 'AL35', parity: 50.1, irr: 16.2, change: -0.5, priceARS: 0, priceUSD: 50.1, source: 'fallback' },
            { ticker: 'GD35', parity: 56.5, irr: 14.6, change: 0.1, priceARS: 0, priceUSD: 56.5, source: 'fallback' },
        ];
        try {
            const cclRate = await getCCLRate();
            if (!cclRate) throw new Error('Sin CCL');
            const results = await Promise.allSettled(BOND_META.map(b => getStooqQuote(b.stooq)));
            const data = results.map((r, i) => {
                const f = FALLBACKS[i];
                if (r.status !== 'fulfilled' || !r.value) return f;
                const meta = BOND_META[i];
                const priceARS = r.value.close;
                const priceUSD = priceARS / cclRate;
                const F = 100, C = F * (meta.couponPct / 100), n = meta.duration;
                const P = Math.min(priceUSD, F * 1.5);
                const ytm = ((C + (F - P) / n) / ((F + P) / 2)) * 100;
                return {
                    ticker: meta.ticker,
                    parity: parseFloat(priceUSD.toFixed(1)),
                    irr: parseFloat(ytm.toFixed(2)),
                    change: 0,
                    priceARS: parseFloat(priceARS.toFixed(2)),
                    priceUSD: parseFloat(priceUSD.toFixed(2)),
                    source: 'stooq',
                };
            });
            return data;
        } catch {
            return FALLBACKS;
        }
    }

    async getQuotesBatch(tickers: string[]): Promise<{ symbol: string; regularMarketPrice: number }[]> {
        // Obtiene precios de múltiples tickers en paralelo usando Stooq
        // Los tickers deben estar en formato Stooq (ej: 'al30.ba', 'gd30.ba')
        const results = await Promise.allSettled(tickers.map(async (ticker) => {
            const stooqTicker = ticker.toLowerCase().replace('.ba', '.ba');
            const quote = await getStooqQuote(stooqTicker);
            if (!quote) return null;
            return { symbol: ticker, regularMarketPrice: quote.close };
        }));
        return results
            .filter((r): r is PromiseFulfilledResult<{ symbol: string; regularMarketPrice: number }> =>
                r.status === 'fulfilled' && r.value !== null)
            .map(r => r.value);
    }
}

export default new MarketService();
