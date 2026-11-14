import { Request, Response } from 'express';
import prisma from '../utils/db';
import cache from '../utils/cache';
import argentinaDatosService from '../services/argentinaDatosService';
import dolarApiService from '../services/dolarApiService';
import marketService from '../services/marketService';
import arbitrageService, { type ArbitrageResult } from '../services/arbitrageService';
import { valuePosition } from '../services/portfolioValuation';

const coinIds: Record<string, string> = {
    BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', XRP: 'ripple', ADA: 'cardano',
    DOGE: 'dogecoin', BNB: 'binancecoin', USDC: 'usd-coin', DAI: 'dai',
};
interface Price { price: number; source: string; quoteSource?: string; isEstimated: boolean; updatedAt?: string }

export async function getPortfolioValuation(req: Request & { user?: { id: string } }, res: Response): Promise<void> {
    if (!req.user?.id) { res.sendStatus(401); return; }
    if (!prisma) { res.status(503).json({ error: 'Base de datos no disponible' }); return; }
    try {
        const positions = await prisma.portfolioPosition.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
        if (!positions.length) {
            res.json({ positions: [], totals: null, source: 'estimado', isEstimated: true }); return;
        }
        const assets = new Set(positions.map(position => position.asset.toUpperCase()));
        const cryptoIds = [...assets].map(asset => coinIds[asset === 'CRYPTO' ? 'BTC' : asset]).filter(Boolean);
        const needsMarket = [...assets].some(asset => !coinIds[asset] && !['USD', 'USDT', 'ARS', 'BLUE', 'MEP', 'CCL', 'OFICIAL', 'CRYPTO'].includes(asset));
        const needsUsdt = assets.has('USDT');
        const [dollars, inflation, historicalDollars, stocks, cedears, arbitrage, crypto] = await Promise.all([
            dolarApiService.getAllDollars(), argentinaDatosService.getHistoricalInflation(), argentinaDatosService.getHistoricalDollars(),
            needsMarket ? marketService.getMervalStocks() : [], needsMarket ? marketService.getCedears() : [],
            needsUsdt ? cache.get<ArbitrageResult>('arbitrage_data').then(result => result ?? arbitrageService.calculateArbitrage()) : null,
            cryptoIds.length ? fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(cryptoIds.join(','))}&vs_currencies=usd`, { signal: AbortSignal.timeout(5000) })
                .then(async response => response.ok ? await response.json() as Record<string, { usd?: number }> : {}).catch(() => ({} as Record<string, { usd?: number }>)) : {} as Record<string, { usd?: number }>,
        ]);
        const dollar = (kind: string) => dollars.find(item => item.casa === kind);
        const mep = dollar('bolsa'), ccl = dollar('contadoconliqui'), blue = dollar('blue');
        const mepPrice = mep?.venta && mep.venta > 0 ? mep.venta : null;
        const quotes = new Map<string, Price>();
        if (mepPrice) {
            quotes.set('USD', { price: mepPrice, source: mep?.source ?? 'DolarAPI', isEstimated: !!mep?.isEstimated, updatedAt: mep?.fechaActualizacion });
            quotes.set('MEP', quotes.get('USD')!);
        }
        if (blue?.venta) quotes.set('BLUE', { price: blue.venta, source: blue.source ?? 'DolarAPI', isEstimated: !!blue.isEstimated, updatedAt: blue.fechaActualizacion });
        if (ccl?.venta) quotes.set('CCL', { price: ccl.venta, source: ccl.source ?? 'DolarAPI', isEstimated: !!ccl.isEstimated, updatedAt: ccl.fechaActualizacion });
        const oficial = dollar('oficial');
        if (oficial?.venta) quotes.set('OFICIAL', { price: oficial.venta, source: oficial.source ?? 'DolarAPI', isEstimated: !!oficial.isEstimated, updatedAt: oficial.fechaActualizacion });
        quotes.set('ARS', { price: 1, source: 'referencia', isEstimated: false });
        for (const stock of [...stocks, ...cedears]) if (stock.price > 0) quotes.set(stock.ticker.toUpperCase(), { price: stock.price, source: stock.source, isEstimated: !!stock.estimated });
        for (const [symbol, id] of Object.entries(coinIds)) {
            const usd = crypto[id]?.usd;
            if (usd && mepPrice) quotes.set(symbol, { price: usd * mepPrice, source: 'estimado', quoteSource: 'CoinGecko + MEP (DolarAPI)', isEstimated: true });
        }
        if (quotes.has('BTC')) quotes.set('CRYPTO', quotes.get('BTC')!);
        const unresolved = [...assets].filter(asset => !quotes.has(asset) && /^[A-Z0-9-]{2,20}$/.test(asset));
        if (mepPrice && unresolved.length) {
            try {
                const response = await fetch('https://api.coingecko.com/api/v3/coins/list', { signal: AbortSignal.timeout(5000) });
                if (!response.ok) throw new Error('Sin catálogo');
                const catalog = await response.json() as Array<{ id: string; symbol: string }>;
                const ids = new Map<string, string>();
                for (const asset of unresolved) {
                    const exact = catalog.find(coin => coin.id.toUpperCase() === asset);
                    const matches = catalog.filter(coin => coin.symbol.toUpperCase() === asset);
                    if (exact || matches.length === 1) ids.set(asset, (exact ?? matches[0]).id);
                }
                if (ids.size) {
                    const pricesResponse = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent([...ids.values()].join(','))}&vs_currencies=usd`, { signal: AbortSignal.timeout(5000) });
                    if (pricesResponse.ok) {
                        const prices = await pricesResponse.json() as Record<string, { usd?: number }>;
                        for (const [asset, id] of ids) if (prices[id]?.usd) quotes.set(asset, {
                            price: prices[id].usd! * mepPrice, source: 'estimado', quoteSource: 'CoinGecko + MEP (DolarAPI)', isEstimated: true,
                        });
                    }
                }
            } catch { /* Los activos sin precio quedan disponibles para carga manual. */ }
        }
        const usdtQuote = Object.values(arbitrage?.cryptos.USDT ?? {}).filter(item => item.available && item.bid && item.bid > 0)
            .sort((a, b) => (b.totalBid ?? b.bid ?? 0) - (a.totalBid ?? a.bid ?? 0))[0];
        if (usdtQuote) quotes.set('USDT', { price: usdtQuote.totalBid ?? usdtQuote.bid!, source: 'CriptoYa', isEstimated: false, updatedAt: usdtQuote.timestamp });

        const rows = positions.map(position => {
            const quote = quotes.get(position.asset.toUpperCase());
            const date = position.date.toISOString().slice(0, 10);
            const historicalQuote = historicalDollars.mep.filter(item => item.fecha.slice(0, 10) <= date && item.valor > 0)
                .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
            const historicalMep = historicalQuote?.valor ?? null;
            const oldHistoricalQuote = !!historicalQuote && position.date.getTime() - new Date(historicalQuote.fecha).getTime() > 7 * 86400_000;
            const valuation = valuePosition({ amount: Number(position.amount), buyPrice: Number(position.buyPrice), date,
                currentPrice: quote?.price ?? null, mep: mepPrice, historicalMep, inflation,
                inflationEstimated: argentinaDatosService.isEstimated(inflation) || argentinaDatosService.isEstimated(historicalDollars.mep) || oldHistoricalQuote });
            const isEstimated = valuation.isEstimated || !quote || quote.isEstimated || !!mep?.isEstimated;
            return { id: position.id, asset: position.asset, amount: Number(position.amount), buyPrice: Number(position.buyPrice), date,
                currentPrice: quote?.price ?? null, quoteSource: quote?.quoteSource ?? quote?.source ?? 'precio manual',
                updatedAt: quote?.updatedAt, ...valuation, source: isEstimated ? 'estimado' : quote?.source, isEstimated };
        });
        const sum = (key: 'valueArs' | 'valueUsd' | 'nominalPnlArs' | 'pnlUsd' | 'realPnlArs') =>
            rows.reduce((total, row) => total + (row[key] ?? 0), 0);
        res.json({ positions: rows, rates: { mep: mepPrice, ccl: ccl?.venta ?? null, blue: blue?.venta ?? null },
            totals: { valueArs: sum('valueArs'), valueUsd: sum('valueUsd'), nominalPnlArs: sum('nominalPnlArs'), pnlUsd: sum('pnlUsd'),
                realPnlArs: sum('realPnlArs'), partial: rows.some(row => row.valueArs === null || row.valueUsd === null || row.pnlUsd === null || row.realPnlArs === null) },
            source: rows.some(row => row.isEstimated) ? 'estimado' : 'fuentes de mercado', isEstimated: rows.some(row => row.isEstimated),
            updatedAt: new Date().toISOString() });
    } catch {
        res.status(503).json({ error: 'No se pudo valuar la cartera' });
    }
}
