import logger from '../utils/logger';
import cache from '../utils/cache';

interface MarketQuote {
    symbol: string;
    name: string;
    close: number;
    source: string;
    change?: number;
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
    estimated?: boolean;
}

interface GlobalIndex {
    symbol: string;
    name: string;
    price: number;
    change: number;
    source: string;
    estimated?: boolean;
}

interface CoinGeckoResponse {
    [id: string]: {
        usd: number;
        usd_24h_change?: number;
    };
}

interface BondQuote { symbol: string; c: number; pct_change?: number }
let bondsRequest: Promise<BondQuote[]> | null = null;
async function getArgentineBondQuotes(): Promise<BondQuote[]> {
    const cached = await cache.get<BondQuote[]>('data912_bonds');
    if (cached) return cached;
    if (!bondsRequest) {
        bondsRequest = (async () => {
            try {
                const response = await fetch('https://data912.com/live/arg_bonds', {
                    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
                    signal: AbortSignal.timeout(5000),
                });
                if (!response.ok) throw new Error(`Data912 HTTP ${response.status}`);
                const data = await response.json() as BondQuote[];
                if (!Array.isArray(data)) throw new Error('Invalid Data912 response');
                const valid = data.filter(quote => typeof quote.symbol === 'string' && Number.isFinite(quote.c) && quote.c > 0);
                if (valid.length) cache.set('data912_bonds', valid, 60_000);
                return valid;
            } catch (error) {
                logger.warn('Data912 bond data unavailable: %s', (error as Error).message);
                return [];
            }
        })().finally(() => { bondsRequest = null; });
    }
    return bondsRequest;
}

async function getYahooQuote(symbol: string): Promise<MarketQuote | null> {
    try {
        const aliases: Record<string, string> = { '^spx': '^GSPC', '^ndx': '^NDX', 'gc.f': 'GC=F', 'cl.f': 'CL=F' };
        const ticker = aliases[symbol.toLowerCase()] ?? symbol.replace(/\.us$/i, '').toUpperCase();
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d`;
        const r = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
            signal: AbortSignal.timeout(5000),
        } as Parameters<typeof fetch>[1]);
        if (!r.ok) return null;
        const json = await r.json() as { chart?: { result?: Array<{ meta?: { symbol?: string; shortName?: string; regularMarketPrice?: number; previousClose?: number; chartPreviousClose?: number } }> } };
        const meta = json.chart?.result?.[0]?.meta;
        if (!meta?.regularMarketPrice || !Number.isFinite(meta.regularMarketPrice)) return null;
        const previous = meta.previousClose ?? meta.chartPreviousClose;
        const change = previous && previous > 0 ? (meta.regularMarketPrice / previous - 1) * 100 : undefined;
        return { symbol: meta.symbol ?? ticker, name: meta.shortName ?? ticker, close: meta.regularMarketPrice, source: 'Yahoo Finance', change };
    } catch {
        return null;
    }
}

async function getStooqQuote(symbol: string): Promise<MarketQuote | null> {
    try {
        const response = await fetch(`https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2cn&h&e=csv`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) return null;
        const lines = (await response.text()).trim().split('\n');
        if (lines.length < 2) return null;
        const [ticker, , close, name] = lines[1].split(',');
        const price = Number(close);
        return Number.isFinite(price) && price > 0
            ? { symbol: ticker.trim(), name: name?.trim() || ticker.trim(), close: price, source: 'Stooq' }
            : null;
    } catch {
        return null;
    }
}

async function getMarketQuote(symbol: string): Promise<MarketQuote | null> {
    return await getYahooQuote(symbol) ?? await getStooqQuote(symbol);
}

async function getCoinGeckoPrices(ids: string[]): Promise<CoinGeckoResponse> {
    try {
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`;
        const r = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
            signal: AbortSignal.timeout(7000),
        } as Parameters<typeof fetch>[1]);
        if (!r.ok) throw new Error(`CoinGecko HTTP ${r.status}`);
        return (await r.json()) as CoinGeckoResponse;
    } catch (err) {
        logger.warn('CoinGecko API error:', (err as Error).message);
        return {};
    }
}

async function getCCLRate(): Promise<number | null> {
    try {
        const r = await fetch('https://dolarapi.com/v1/dolares/contadoconliqui', {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
            signal: AbortSignal.timeout(5000),
        } as Parameters<typeof fetch>[1]);
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
            { ticker: 'YPFD', name: 'YPF S.A.', price: 55950, change: 0, vol: '-', source: 'estimado', estimated: true },
            { ticker: 'GGAL', name: 'Grupo Galicia', price: 6850, change: 0, vol: '-', source: 'estimado', estimated: true },
            { ticker: 'PAMP', name: 'Pampa Energía', price: 4230, change: 0, vol: '-', source: 'estimado', estimated: true },
            { ticker: 'BMA', name: 'Banco Macro', price: 9100, change: 0, vol: '-', source: 'estimado', estimated: true },
            { ticker: 'CEPU', name: 'Central Puerto', price: 1250, change: 0, vol: '-', source: 'estimado', estimated: true },
        ];
        try {
            const cclRate = await getCCLRate();
            if (!cclRate) throw new Error('Sin CCL');
            const results = await Promise.allSettled(adrMap.map(item => getMarketQuote(item.adr)));
            const data: StockResult[] = results.map((r, i) => {
                const f = fallbacks.find(x => x.ticker === adrMap[i].ticker) || fallbacks[i];
                if (r.status !== 'fulfilled' || !r.value) return f;
                return {
                    ticker: adrMap[i].ticker, name: adrMap[i].name,
                    price: Math.round(r.value.close * cclRate), priceUSD: r.value.close,
                    change: 0, vol: '-', ccl: Math.round(cclRate), source: 'estimado', estimated: true,
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
            { ticker: 'AAPL', name: 'Apple Inc.', price: 22500, change: 0, vol: '-', ccl: 1180, source: 'estimado', estimated: true },
            { ticker: 'MELI', name: 'MercadoLibre', price: 1850000, change: 0, vol: '-', ccl: 1190, source: 'estimado', estimated: true },
            { ticker: 'TSLA', name: 'Tesla Inc.', price: 45000, change: 0, vol: '-', ccl: 1185, source: 'estimado', estimated: true },
            { ticker: 'KO', name: 'Coca-Cola Co.', price: 18000, change: 0, vol: '-', ccl: 1180, source: 'estimado', estimated: true },
            { ticker: 'SPY', name: 'SPDR S&P 500 ETF', price: 65000, change: 0, vol: '-', ccl: 1182, source: 'estimado', estimated: true },
            { ticker: 'NVDA', name: 'NVIDIA Corp.', price: 150000, change: 0, vol: '-', ccl: 1182, source: 'estimado', estimated: true },
            { ticker: 'AMZN', name: 'Amazon.com Inc.', price: 20000, change: 0, vol: '-', ccl: 1182, source: 'estimado', estimated: true },
        ];
        try {
            const cclRate = await getCCLRate();
            if (!cclRate) throw new Error('Sin CCL');
            const results = await Promise.allSettled(stockMap.map(item => getMarketQuote(item.ticker)));
            const data: StockResult[] = results.map((r, i) => {
                const f = fallbacks.find(x => x.ticker === stockMap[i].symbol) || fallbacks[i % fallbacks.length];
                if (r.status !== 'fulfilled' || !r.value) return f;
                return {
                    ticker: stockMap[i].symbol, name: stockMap[i].name,
                    price: Math.round(r.value.close * cclRate), priceUSD: r.value.close,
                    change: 0, vol: '-', ccl: Math.round(cclRate), source: 'estimado', estimated: true,
                };
            });
            return data;
        } catch {
            return fallbacks.slice(0, stockMap.length);
        }
    }

    async getGlobalIndices(): Promise<GlobalIndex[]> {
        const fallbacks: Record<string, GlobalIndex> = {
            '^GSPC': { symbol: '^GSPC', name: 'S&P 500', price: 5900, change: 0.5, source: 'estimado', estimated: true },
            '^NDX': { symbol: '^NDX', name: 'Nasdaq 100', price: 19200, change: 0.8, source: 'estimado', estimated: true },
            'BTC-USD': { symbol: 'BTC-USD', name: 'Bitcoin', price: 97500, change: 1.2, source: 'estimado', estimated: true },
            'GC=F': { symbol: 'GC=F', name: 'Gold', price: 2900, change: 0.3, source: 'estimado', estimated: true },
            'CL=F': { symbol: 'CL=F', name: 'WTI Oil', price: 73, change: -0.5, source: 'estimado', estimated: true },
        };
        try {
            const yahooMap = [
                { ticker: '^spx', symbol: '^GSPC', name: 'S&P 500' },
                { ticker: '^ndx', symbol: '^NDX', name: 'Nasdaq 100' },
                { ticker: 'gc.f', symbol: 'GC=F', name: 'Gold (oz)' },
                { ticker: 'cl.f', symbol: 'CL=F', name: 'WTI Oil' },
            ];
            const [yahooResults, coinGeckoData] = await Promise.all([
                Promise.allSettled(yahooMap.map(item => getMarketQuote(item.ticker))),
                getCoinGeckoPrices(['bitcoin', 'ethereum']),
            ]);
            
            const data: GlobalIndex[] = [];
            yahooResults.forEach((r, i) => {
                const sym = yahooMap[i].symbol;
                if (r.status === 'fulfilled' && r.value) {
                    const estimated = r.value.change === undefined;
                    data.push({ symbol: sym, name: yahooMap[i].name, price: r.value.close, change: r.value.change ?? 0, source: estimated ? 'estimado' : r.value.source, estimated });
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

    async getBonds(): Promise<{ ticker: string; parity: number; irr: number; change: number; priceARS: number; priceUSD: number; source: string; estimated: boolean }[]> {
        const BOND_META = [
            { ticker: 'AL30', couponPct: 4.0, duration: 3.8 },
            { ticker: 'GD30', couponPct: 4.0, duration: 3.8 },
            { ticker: 'AL35', couponPct: 3.625, duration: 7.4 },
            { ticker: 'GD35', couponPct: 3.625, duration: 7.4 },
        ];
        const FALLBACKS = [
            { ticker: 'AL30', parity: 59.2, irr: 17.5, change: 1.2, priceARS: 0, priceUSD: 59.2, source: 'estimado', estimated: true },
            { ticker: 'GD30', parity: 64.5, irr: 15.8, change: 0.8, priceARS: 0, priceUSD: 64.5, source: 'estimado', estimated: true },
            { ticker: 'AL35', parity: 50.1, irr: 16.2, change: -0.5, priceARS: 0, priceUSD: 50.1, source: 'estimado', estimated: true },
            { ticker: 'GD35', parity: 56.5, irr: 14.6, change: 0.1, priceARS: 0, priceUSD: 56.5, source: 'estimado', estimated: true },
        ];
        try {
            const cclRate = await getCCLRate();
            if (!cclRate) throw new Error('Sin CCL');
            const quotes = await getArgentineBondQuotes();
            const data = BOND_META.map((meta, i) => {
                const f = FALLBACKS[i];
                const pesoQuote = quotes.find(quote => quote.symbol === meta.ticker);
                const dollarQuote = quotes.find(quote => quote.symbol === `${meta.ticker}D`);
                if (!pesoQuote) return f;
                const priceARS = pesoQuote.c;
                const priceUSD = dollarQuote?.c ?? priceARS / cclRate;
                const F = 100, C = F * (meta.couponPct / 100), n = meta.duration;
                const P = Math.min(priceUSD, F * 1.5);
                const ytm = ((C + (F - P) / n) / ((F + P) / 2)) * 100;
                return {
                    ticker: meta.ticker,
                    parity: parseFloat(priceUSD.toFixed(1)),
                    irr: parseFloat(ytm.toFixed(2)),
                    change: pesoQuote.pct_change ?? 0,
                    priceARS: parseFloat(priceARS.toFixed(2)),
                    priceUSD: parseFloat(priceUSD.toFixed(2)),
                    source: 'estimado', estimated: true,
                };
            });
            return data;
        } catch {
            return FALLBACKS;
        }
    }

    async getQuotesBatch(tickers: string[]): Promise<{ symbol: string; regularMarketPrice: number }[]> {
        const quotes = await getArgentineBondQuotes();
        return tickers.flatMap(ticker => {
            const quote = quotes.find(item => item.symbol === ticker.replace(/\.BA$/i, '').toUpperCase());
            return quote ? [{ symbol: ticker, regularMarketPrice: quote.c }] : [];
        });
    }
}

export default new MarketService();
