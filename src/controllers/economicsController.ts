import { Request, Response } from 'express';
import Parser from 'rss-parser';
import argentinaDatosService from '../services/argentinaDatosService';
import marketService from '../services/marketService';
import bcraService from '../services/bcraService';
import dolarApiService from '../services/dolarApiService';
import cache from '../utils/cache';
import logger from '../utils/logger';

const parser = new Parser();

interface FallbackDashboard {
    macro: { inflation: { mensual: number; interanual: number; fecha: string }; risk: number; reserves: number; baseMonetaria: number; dolarEquilibrio: number };
    market: { merval: unknown[]; cedears: unknown[]; bonds: unknown[] };
    global: unknown[];
    timestamp: string;
    isFallback: boolean;
}

function getFallbackDashboard(): FallbackDashboard {
    return {
        macro: { inflation: { mensual: 2.5, interanual: 115.0, fecha: new Date().toISOString().split('T')[0] }, risk: 640, reserves: 45305, baseMonetaria: 60500000000000, dolarEquilibrio: 1337 },
        market: {
            merval: [
                { ticker: 'YPFD', name: 'YPF S.A.', price: 55950, change: 3.5, vol: '300K' },
                { ticker: 'GGAL', name: 'Grupo Galicia', price: 6850, change: 6.4, vol: '512K' },
                { ticker: 'PAMP', name: 'Pampa Energía', price: 4230, change: 1.2, vol: '120K' },
                { ticker: 'BMA', name: 'Banco Macro', price: 9100, change: -0.5, vol: '80K' },
                { ticker: 'CEPU', name: 'Central Puerto', price: 1250, change: 0.8, vol: '200K' },
            ],
            cedears: [
                { ticker: 'AAPL', name: 'Apple Inc.', price: 22500, change: 1.2, ccl: 1180 },
                { ticker: 'MELI', name: 'MercadoLibre', price: 1850000, change: -0.5, ccl: 1190 },
                { ticker: 'TSLA', name: 'Tesla Inc.', price: 45000, change: 2.5, ccl: 1185 },
                { ticker: 'KO', name: 'Coca-Cola', price: 18000, change: 0.1, ccl: 1180 },
                { ticker: 'SPY', name: 'SPDR S&P 500', price: 65000, change: 0.8, ccl: 1182 },
            ],
            bonds: [
                { ticker: 'AL30', parity: 59.2, irr: 17.5, change: 1.2 },
                { ticker: 'GD30', parity: 64.5, irr: 15.8, change: 0.8 },
                { ticker: 'AL35', parity: 50.1, irr: 16.2, change: -0.5 },
                { ticker: 'AE38', parity: 53.8, irr: 16.5, change: 0.2 },
            ],
        },
        global: [],
        timestamp: new Date().toISOString(),
        isFallback: true,
    };
}

class EconomicsController {
    async getDashboardData(_req: Request, res: Response): Promise<void> {
        try {
            const cached = cache.get<FallbackDashboard>('economics_dashboard');
            if (cached) { res.json({ ...cached }); return; }

            // Timeout global per request para evitar hangs infinitos (Vercel maxDuration)
            const GLOBAL_TIMEOUT_MS = 14000;
            let resolved = false;
            const globalTimeoutId = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    logger.warn('Dashboard: timeout global alcanzado, devolviendo fallback');
                    const fallback = getFallbackDashboard();
                    cache.set('economics_dashboard', fallback, 15000);
                    res.json(fallback);
                }
            }, GLOBAL_TIMEOUT_MS);

            const [inflationResult, riskResult, reservesResult, baseMonetariaResult, stocksResult, cedearsResult, globalResult, bondsResult, inflacionCategoriasResult] = await Promise.allSettled([
                argentinaDatosService.getInflation(),
                argentinaDatosService.getRisk(),
                bcraService.getReserves(),
                bcraService.getBaseMonetaria(),
                marketService.getMervalStocks(),
                marketService.getCedears(),
                marketService.getGlobalIndices(),
                marketService.getBonds(),
                argentinaDatosService.getInflacionCategorias(),
            ]);

            if (resolved) return;
            resolved = true;
            clearTimeout(globalTimeoutId);

            const bonds = bondsResult.status === 'fulfilled' ? bondsResult.value : [];
            const inflation = inflationResult.status === 'fulfilled' ? inflationResult.value : null;
            const risk = riskResult.status === 'fulfilled' ? riskResult.value : null;
            const reserves = reservesResult.status === 'fulfilled' ? reservesResult.value : null;
            const baseMonetaria = baseMonetariaResult.status === 'fulfilled' ? baseMonetariaResult.value : null;
            const stocks = stocksResult.status === 'fulfilled' ? stocksResult.value : [];
            const cedears = cedearsResult.status === 'fulfilled' ? cedearsResult.value : [];
            const inflacionCategorias = inflacionCategoriasResult?.status === 'fulfilled' ? inflacionCategoriasResult.value : null;

            const finalReserves = reserves || 45305;
            const finalBase = baseMonetaria || 60500000000000;
            const equilibrio = finalReserves > 0 ? finalBase / (finalReserves * 1000000) : 0;

            const dashboardData = {
                macro: {
                    inflation: { ...(inflation || { mensual: 2.5, interanual: 115.0, fecha: new Date().toISOString().split('T')[0] }), categorias: inflacionCategorias ?? null },
                    risk: risk !== null ? risk : 640,
                    reserves: finalReserves,
                    baseMonetaria: finalBase,
                    dolarEquilibrio: Math.round(equilibrio),
                },
                market: {
                    merval: stocks.slice(0, 5),
                    cedears: cedears.slice(0, 5),
                    bonds: bonds.length > 0 ? bonds : [
                        { ticker: 'AL30', parity: 59.2, irr: 17.5, change: 1.2 },
                        { ticker: 'GD30', parity: 64.5, irr: 15.8, change: 0.8 },
                        { ticker: 'AL35', parity: 50.1, irr: 16.2, change: -0.5 },
                        { ticker: 'AE38', parity: 53.8, irr: 16.5, change: 0.2 },
                    ],
                },
                global: globalResult?.status === 'fulfilled' ? globalResult.value : [],
                timestamp: new Date().toISOString(),
            };

            if (stocks.length === 0) logger.warn('Dashboard: Merval stocks empty');
            if (cedears.length === 0) logger.warn('Dashboard: Cedears empty');
            if (bonds.length === 0) logger.warn('Dashboard: Bonds empty (using fallback)');

            cache.set('economics_dashboard', dashboardData, 600000);
            res.json(dashboardData);
        } catch (error) {
            logger.error('Error crítico en Dashboard Controller: %s', (error as Error).stack);
            res.json(getFallbackDashboard());
        }
    }

    async getHistoricalData(req: Request, res: Response): Promise<void> {
        try {
            const { indicator } = req.params;

            const generateRobustMock = (baseValue: number, volatility: number, trend: 'up' | 'down' | 'neutral' = 'neutral') => {
                const labels: string[] = [];
                const values: number[] = [];
                let current = baseValue;
                const now = new Date();
                for (let i = 365; i >= 0; i--) {
                    const d = new Date(now);
                    d.setDate(d.getDate() - i);
                    labels.push(d.toISOString().split('T')[0]);
                    let change = (Math.random() - 0.5) * volatility;
                    if (trend === 'up') change += volatility * 0.1;
                    if (trend === 'down') change -= volatility * 0.1;
                    current = current * (1 + change);
                    values.push(parseFloat(current.toFixed(2)));
                }
                return { labels, values };
            };

            const getDataForIndicator = async (ind: string): Promise<{ labels: string[]; values: number[] }> => {
                try {
                    const timeout = (ms: number) => {
                        let id: ReturnType<typeof setTimeout> | undefined;
                        const prom = new Promise<never>((_, reject) => { id = setTimeout(() => reject(new Error('Timeout')), ms); });
                        return { prom, cancel: () => clearTimeout(id) };
                    };
                    const { prom: timeLimit, cancel } = timeout(7000);
                    let dataPromise: Promise<{ labels: string[]; values: number[] }>;

                    try {
                        switch (ind) {
                            case 'blue':
                            case 'dolar-blue':
                                dataPromise = argentinaDatosService.getHistoricalDollars().then(d =>
                                    (d.blue && d.blue.length > 10)
                                        ? { labels: d.blue.map((x: { fecha: string }) => x.fecha), values: d.blue.map((x: { valor: number }) => x.valor) }
                                        : Promise.reject(new Error('Empty Data'))
                                );
                                break;
                            case 'mep':
                            case 'dolar-mep':
                                dataPromise = argentinaDatosService.getHistoricalDollars().then(d =>
                                    (d.mep && d.mep.length > 10)
                                        ? { labels: d.mep.map((x: { fecha: string }) => x.fecha), values: d.mep.map((x: { valor: number }) => x.valor) }
                                        : (d.blue && d.blue.length > 10)
                                            ? { labels: d.blue.map((x: { fecha: string }) => x.fecha), values: d.blue.map((x: { valor: number }) => x.valor.valueOf() * 0.99) }
                                            : Promise.reject(new Error('Empty MEP Data'))
                                );
                                break;
                            case 'ccl':
                            case 'dolar-ccl':
                                dataPromise = argentinaDatosService.getHistoricalDollars().then(d =>
                                    (d.ccl && d.ccl.length > 10)
                                        ? { labels: d.ccl.map((x: { fecha: string }) => x.fecha), values: d.ccl.map((x: { valor: number }) => x.valor) }
                                        : (d.blue && d.blue.length > 10)
                                            ? { labels: d.blue.map((x: { fecha: string }) => x.fecha), values: d.blue.map((x: { valor: number }) => x.valor * 1.015) }
                                            : Promise.reject(new Error('Empty CCL Data'))
                                );
                                break;
                            case 'oficial':
                            case 'dolar-oficial':
                                dataPromise = argentinaDatosService.getHistoricalDollars().then(d =>
                                    (d.oficial && d.oficial.length > 10)
                                        ? { labels: d.oficial.map((x: { fecha: string }) => x.fecha), values: d.oficial.map((x: { valor: number }) => x.valor) }
                                        : Promise.reject(new Error('Empty Oficial Data'))
                                );
                                break;
                            case 'risk':
                            case 'riesgo':
                                dataPromise = argentinaDatosService.getCountryRiskData().then((data: { fecha: string; valor: number }[]) => {
                                    if (data && data.length > 0) return { labels: data.map(d => d.fecha), values: data.map(d => d.valor) };
                                    throw new Error('Empty Risk Data');
                                });
                                break;
                            case 'inflation':
                            case 'inflacion':
                                dataPromise = argentinaDatosService.getHistoricalInflation().then((data: { fecha: string; valor: number }[]) => {
                                    if (data && data.length > 0) return {
                                        // Normalize yyyy-MM to yyyy-MM-dd (inflation is monthly)
                                        labels: data.map(d => d.fecha.length === 7 ? d.fecha + '-01' : d.fecha),
                                        values: data.map(d => d.valor),
                                    };
                                    throw new Error('Empty Inflation Data');
                                });
                                break;
                            default:
                                throw new Error('Unknown indicator: ' + ind);
                        }
                        return await Promise.race([dataPromise, timeLimit]);
                    } finally {
                        cancel();
                    }
                } catch (e) {
                    logger.warn('Fallback activado para indicador %s: %s', ind, (e as Error).message);
                    switch (ind) {
                        case 'blue': return generateRobustMock(1150, 0.02, 'up');
                        case 'mep': return generateRobustMock(1120, 0.02, 'up');
                        case 'ccl': return generateRobustMock(1180, 0.02, 'up');
                        case 'oficial': return generateRobustMock(1090, 0.005, 'up');
                        case 'risk': return generateRobustMock(1400, 0.03, 'down');
                        case 'inflation': {
                            const m = generateRobustMock(3.5, 0.3);
                            m.values = m.values.map(v => Math.abs(v));
                            return m;
                        }
                        default: return generateRobustMock(100, 0.01);
                    }
                }
            };

            if (indicator) {
                let data = await getDataForIndicator(Array.isArray(indicator) ? indicator[0] : indicator);
                const { range } = req.query as { range?: string };
                if (range && data.labels && data.values) {
                    let days = 365;
                    if (range === '1M') days = 30;
                    else if (range === '3M') days = 90;
                    else if (range === '6M') days = 180;
                    else if (range === '1Y') days = 365;
                    else if (range === 'ALL') days = 0;
                    if (days > 0 && days < data.labels.length) {
                        data = { labels: data.labels.slice(-days), values: data.values.slice(-days) };
                    }
                }
                res.json(data);
                return;
            }

            const BULK_TIMEOUT_MS = 10_000;
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Bulk historical timeout')), BULK_TIMEOUT_MS)
            );
            const [inflation, poverty, dollars, indigence, unemployment, countryRisk] = await Promise.race([
                Promise.all([
                    argentinaDatosService.getHistoricalInflation(),
                    argentinaDatosService.getPovertyData(),
                    argentinaDatosService.getHistoricalDollars(),
                    argentinaDatosService.getIndigenceData(),
                    argentinaDatosService.getUnemploymentData(),
                    argentinaDatosService.getCountryRiskData(),
                ]),
                timeoutPromise,
            ]);
            res.json({ inflation, poverty, dollars, indigence, unemployment, countryRisk, timestamp: new Date().toISOString() });
        } catch (error) {
            logger.error('Error in EconomicsController.getHistoricalData: %s', (error as Error).stack);
            res.status(500).json({ labels: [], values: [] });
        }
    }

    async getMarketData(_req: Request, res: Response): Promise<void> {
        try {
            // Servir desde caché del marketWorker si está disponible (actualizado cada 5 min)
            const cached = cache.get<object>('market_data');
            if (cached) { res.json(cached); return; }

            const [merval, cedears, bonds, global] = await Promise.all([
                marketService.getMervalStocks(),
                marketService.getCedears(),
                marketService.getBonds(),
                marketService.getGlobalIndices(),
            ]);
            const payload = { merval, cedears, bonds, global, timestamp: new Date() };
            cache.set('market_data', payload, 6 * 60 * 1000);
            res.json(payload);
        } catch {
            res.status(500).json({ error: 'Error fetching market data' });
        }
    }

    async getNews(_req: Request, res: Response): Promise<void> {
        const cached = cache.get<object[]>('economics_news');
        if (cached) { res.json(cached); return; }

        const FEEDS = [
            { url: 'https://news.google.com/rss/search?q=economia+argentina+when:1d&hl=es-419&gl=AR&ceid=AR:es-419', defaultSource: 'Google News' },
            { url: 'https://www.ambito.com/rss/pages/economia.xml', defaultSource: 'Ámbito' },
            { url: 'https://www.cronista.com/rss/economia/', defaultSource: 'El Cronista' },
            { url: 'https://www.infobae.com/feeds/rss/economia/', defaultSource: 'Infobae' },
        ];

        interface NewsItem { id: number; title: string; source: string; publishedAt: string | null; url: string; category: string; }

        const fetchFeed = async (feed: { url: string; defaultSource: string }): Promise<NewsItem[]> => {
            try {
                const timeout = new Promise<never>((_, r) => setTimeout(() => r(new Error('Timeout')), 5000));
                const result = await Promise.race([parser.parseURL(feed.url), timeout]);
                return (result.items ?? []).slice(0, 8).map((item, i): NewsItem => {
                    const t = (item.title ?? '').toLowerCase();
                    let category = 'Economy';
                    if (t.includes('crypto') || t.includes('bitcoin') || t.includes('btc') || t.includes('eth')) category = 'Crypto';
                    else if (t.includes('gobierno') || t.includes('milei') || t.includes('decreto') || t.includes('ley')) category = 'Policy';
                    const rawTitle = item.title ?? 'Noticia sin título';
                    const cleanTitle = rawTitle.includes(' - ') ? rawTitle.split(' - ').slice(0, -1).join(' - ') : rawTitle;
                    let source = feed.defaultSource;
                    if (item.title?.includes(' - ')) { const p = item.title.split(' - '); source = p[p.length - 1] || feed.defaultSource; }
                    return { id: i, title: cleanTitle, source, publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : null, url: item.link ?? '#', category };
                });
            } catch { return []; }
        };

        try {
            const allFeeds = await Promise.all(FEEDS.map(fetchFeed));
            const flat = allFeeds.flat();
            const seen = new Set<string>();
            const deduped = flat.filter(n => {
                const key = n.title.toLowerCase().slice(0, 50);
                if (seen.has(key)) return false;
                seen.add(key); return true;
            });
            const sorted = deduped
                .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
                .slice(0, 20)
                .map((n, i) => ({ ...n, id: i + 1 }));

            if (sorted.length > 0) {
                cache.set('economics_news', sorted, 5 * 60_000);
                logger.info('Noticias multi-feed: %d items', sorted.length);
                res.json(sorted);
                return;
            }
            throw new Error('Sin noticias de ningún feed');
        } catch (error) {
            logger.warn('Error fetching news (multi-RSS): %s. Using fallback.', (error as Error).message);
            res.json([
                { id: 1, title: 'El mercado reacciona a los anuncios económicos', source: 'Ámbito', publishedAt: null, url: '#', category: 'Economy' },
                { id: 2, title: 'Bitcoin mantiene su tendencia alcista', source: 'CoinDesk', publishedAt: null, url: '#', category: 'Crypto' },
                { id: 3, title: 'Nuevas regulaciones para importaciones', source: 'Infobae', publishedAt: null, url: '#', category: 'Policy' },
            ]);
        }
    }

    async getRates(_req: Request, res: Response): Promise<void> {
        try {
            const cached = cache.get<unknown>('economics_rates');
            if (cached) { res.json(cached); return; }

            const [depositResult, inflationResult] = await Promise.allSettled([
                argentinaDatosService.getDepositRates(),
                argentinaDatosService.getInflation(),
            ]);
            const deposit = depositResult.status === 'fulfilled' ? depositResult.value : { valor: 34.0, fecha: new Date().toISOString().split('T')[0] };
            const inflation = inflationResult.status === 'fulfilled' ? inflationResult.value : { mensual: 2.5, interanual: 84.0, fecha: '' };

            const badlarTNA = (deposit as { valor: number; fecha: string }).valor;
            const badlarTEM = badlarTNA / 12;
            const badlarTEA = (Math.pow(1 + badlarTNA / 100 / 12, 12) - 1) * 100;
            const pfTNA = badlarTNA * 0.97;
            const pfTEM = pfTNA / 12;
            const pfTEA = (Math.pow(1 + pfTNA / 100 / 12, 12) - 1) * 100;
            const realRate = badlarTNA - ((inflation as { interanual?: number }).interanual || 0);

            const ratesData = {
                badlar: { tna: parseFloat(badlarTNA.toFixed(2)), tem: parseFloat(badlarTEM.toFixed(2)), tea: parseFloat(badlarTEA.toFixed(2)), fecha: (deposit as { valor: number; fecha: string }).fecha },
                plazoFijo: { tna: parseFloat(pfTNA.toFixed(2)), tem: parseFloat(pfTEM.toFixed(2)), tea: parseFloat(pfTEA.toFixed(2)) },
                inflation: { mensual: (inflation as { mensual: number }).mensual, interanual: (inflation as { interanual: number }).interanual, fecha: (inflation as { fecha: string }).fecha },
                realRate: parseFloat(realRate.toFixed(2)),
                timestamp: new Date().toISOString(),
            };
            cache.set('economics_rates', ratesData, 600000);
            res.json(ratesData);
        } catch (error) {
            logger.error('Error in getRates: %s', (error as Error).stack);
            res.json({ badlar: { tna: 34.0, tem: 2.83, tea: 40.5, fecha: '' }, plazoFijo: { tna: 33.0, tem: 2.75, tea: 39.1 }, inflation: { mensual: 2.5, interanual: 84.0, fecha: '' }, realRate: -50.0, timestamp: new Date().toISOString() });
        }
    }

    async getYieldCurve(_req: Request, res: Response): Promise<void> {
        try {
            const cached = cache.get<unknown>('economics_yield_curve');
            if (cached) { res.json(cached); return; }

            interface BondMeta { ticker: string; name: string; law: string; maturityYear: number; couponPct: number; durationYrs: number; faceValue: number }
            const BONDS: BondMeta[] = [
                { ticker: 'AL29.BA', name: 'AL29', law: 'ARG', maturityYear: 2029, couponPct: 3.625, durationYrs: 2.2, faceValue: 100 },
                { ticker: 'AL30.BA', name: 'AL30', law: 'ARG', maturityYear: 2030, couponPct: 4.0, durationYrs: 3.8, faceValue: 100 },
                { ticker: 'AL35.BA', name: 'AL35', law: 'ARG', maturityYear: 2035, couponPct: 3.625, durationYrs: 7.4, faceValue: 100 },
                { ticker: 'AL41.BA', name: 'AL41', law: 'ARG', maturityYear: 2041, couponPct: 4.625, durationYrs: 11.8, faceValue: 100 },
                { ticker: 'GD29.BA', name: 'GD29', law: 'NY', maturityYear: 2029, couponPct: 3.625, durationYrs: 2.2, faceValue: 100 },
                { ticker: 'GD30.BA', name: 'GD30', law: 'NY', maturityYear: 2030, couponPct: 4.0, durationYrs: 3.8, faceValue: 100 },
                { ticker: 'GD35.BA', name: 'GD35', law: 'NY', maturityYear: 2035, couponPct: 3.625, durationYrs: 7.4, faceValue: 100 },
                { ticker: 'GD41.BA', name: 'GD41', law: 'NY', maturityYear: 2041, couponPct: 4.625, durationYrs: 11.8, faceValue: 100 },
            ];

            let cclRate = 1200;
            try {
                const dolarData = await dolarApiService.getAllDollars();
                const ccl = dolarData.find(d => d.casa === 'contadoconliqui');
                const mep = dolarData.find(d => d.casa === 'bolsa');
                cclRate = ccl?.venta || mep?.venta || 1200;
            } catch { /* use fallback */ }

            const fallbackPrices: Record<string, number> = { 'AL29.BA': 62.5, 'AL30.BA': 61.8, 'AL35.BA': 54.2, 'AL41.BA': 52.8, 'GD29.BA': 65.5, 'GD30.BA': 64.2, 'GD35.BA': 56.8, 'GD41.BA': 55.4 };
            let fetchedQuotes: { symbol: string; regularMarketPrice: number }[] = [];
            try { fetchedQuotes = await marketService.getQuotesBatch(BONDS.map(b => b.ticker)); } catch { /* ignore */ }

            const points = BONDS.map(b => {
                const quote = fetchedQuotes.find(q => q.symbol === b.ticker);
                const priceARS = quote?.regularMarketPrice || fallbackPrices[b.ticker] || 50;
                if (!priceARS || priceARS <= 0) return null;
                const priceUSD = priceARS / cclRate;
                const C = b.faceValue * (b.couponPct / 100);
                const F = b.faceValue;
                const P = Math.min(priceUSD, F * 1.5);
                const n = b.durationYrs;
                const ytm = ((C + (F - P) / n) / ((F + P) / 2)) * 100;
                return { name: b.name, law: b.law, duration: b.durationYrs, ytm: parseFloat(ytm.toFixed(2)), priceUSD: parseFloat(priceUSD.toFixed(2)), priceARS: parseFloat(priceARS.toFixed(2)), coupon: b.couponPct, maturity: b.maturityYear };
            }).filter(Boolean).sort((a, b) => a!.duration - b!.duration);

            const data = { points, cclUsed: cclRate, timestamp: new Date().toISOString() };
            cache.set('economics_yield_curve', data, 300000);
            res.json(data);
        } catch (error) {
            logger.error('Error in getYieldCurve: %s', (error as Error).stack);
            res.json({ points: [], cclUsed: 0, timestamp: new Date().toISOString() });
        }
    }

    async getUVA(_req: Request, res: Response): Promise<void> {
        try {
            const cached = cache.get<unknown>('economics_uva');
            if (cached) { res.json(cached); return; }
            const uvaData = await argentinaDatosService.getUVAData();
            if (!uvaData || (uvaData as unknown[]).length === 0) { res.json({ data: argentinaDatosService.generateMockUVASeries(), source: 'fallback', timestamp: new Date().toISOString() }); return; }
            const data = { data: uvaData, latest: (uvaData as unknown[])[(uvaData as unknown[]).length - 1], source: 'argentinadatos', timestamp: new Date().toISOString() };
            cache.set('economics_uva', data, 3600000);
            res.json(data);
        } catch (error) {
            logger.error('Error in getUVA: %s', (error as Error).stack);
            res.json({ data: [], source: 'error', timestamp: new Date().toISOString() });
        }
    }

    async getReservas(_req: Request, res: Response): Promise<void> {
        try {
            const cached = cache.get<unknown>('economics_reservas');
            if (cached) { res.json(cached); return; }
            const raw = await argentinaDatosService.getReservasHistory();
            if (!raw || (raw as unknown[]).length === 0) { res.json({ data: [], source: 'unavailable', timestamp: new Date().toISOString() }); return; }
            type RawEntry = { fecha?: string; date?: string; d?: string; valor?: number; value?: number; v?: number };
            const data = (raw as RawEntry[]).map(entry => ({
                fecha: entry.fecha ?? entry.date ?? entry.d,
                valor: parseFloat(String(entry.valor ?? entry.value ?? entry.v ?? 0)),
            })).filter(e => e.fecha && !isNaN(e.valor) && e.valor > 0);
            const result = { data, source: 'argentinadatos', timestamp: new Date().toISOString() };
            cache.set('economics_reservas', result, 3600000);
            res.json(result);
        } catch (error) {
            logger.error('Error in getReservas: %s', (error as Error).stack);
            res.json({ data: [], source: 'error', timestamp: new Date().toISOString() });
        }
    }

    async getCarryTradeData(_req: Request, res: Response): Promise<void> {
        try {
            const cached = cache.get<unknown>('economics_carry_trade');
            if (cached) { res.json(cached); return; }
            const [dollars, rates] = await Promise.all([argentinaDatosService.getHistoricalDollars(), argentinaDatosService.getDepositRates()]);
            type BlueSeries = { fecha: string; valor: number }[];
            const blueSeries: BlueSeries = ((dollars as { blue?: BlueSeries }).blue ?? []).slice(-180);
            const currentTNA = ((rates as { valor?: number }).valor) || 34;
            const monthlyRate = currentTNA / 12 / 100;
            const history = blueSeries.map((d, i) => {
                const price = d.valor;
                const initialPrice = blueSeries[0].valor;
                const currentARS = (1000 * initialPrice) * Math.pow(1 + monthlyRate, i / 30);
                return { fecha: d.fecha, usdHold: 1000, arsTasaInUSD: parseFloat((currentARS / price).toFixed(2)), dolarPrice: price };
            });
            const result = { history, currentTNA, timestamp: new Date().toISOString() };
            cache.set('economics_carry_trade', result, 3600000);
            res.json(result);
        } catch (error) {
            logger.error('Error in getCarryTradeData: %s', (error as Error).stack);
            res.json({ history: [], error: true });
        }
    }

    async getEquilibriumDollar(_req: Request, res: Response): Promise<void> {
        try {
            const cached = cache.get<unknown>('economics_equilibrium');
            if (cached) { res.json(cached); return; }
            const [reserves, baseMonetaria] = await Promise.all([bcraService.getReserves(), bcraService.getBaseMonetaria()]);
            const finalReserves = reserves || 45305;
            const finalBase = baseMonetaria || 60500000000000;
            const equilibrium = finalBase / (finalReserves * 1000000);
            const result = { theoretical: parseFloat(equilibrium.toFixed(2)), reserves: finalReserves, baseMonetaria: finalBase, timestamp: new Date().toISOString() };
            cache.set('economics_equilibrium', result, 3600000);
            res.json(result);
        } catch (error) {
            logger.error('Error in getEquilibriumDollar: %s', (error as Error).message);
            res.json({ theoretical: 1337, reserves: 45305, baseMonetaria: 60500000000000, timestamp: new Date().toISOString() });
        }
    }

    async getHolidays(_req: Request, res: Response): Promise<void> {
        try {
            const cached = cache.get<unknown>('economics_holidays');
            if (cached) { res.json(cached); return; }
            const year = new Date().getFullYear();
            const [thisYear, nextYear] = await Promise.allSettled([argentinaDatosService.getHolidays(year), argentinaDatosService.getHolidays(year + 1)]);
            type Holiday = { fecha: string; nombre?: string };
            const thisYearData: Holiday[] = thisYear.status === 'fulfilled' && thisYear.value ? (thisYear.value as Holiday[]) : [];
            const nextYearData: Holiday[] = nextYear.status === 'fulfilled' && nextYear.value ? (nextYear.value as Holiday[]) : [];
            const todayStr = new Date().toISOString().split('T')[0];
            const all = [...thisYearData, ...nextYearData]
                .filter(h => { const d = new Date(h.fecha + 'T00:00:00'); return d >= new Date(todayStr); })
                .sort((a, b) => a.fecha.localeCompare(b.fecha))
                .slice(0, 20);
            const result = { holidays: all, timestamp: new Date().toISOString() };
            cache.set('economics_holidays', result, 86400000);
            res.json(result);
        } catch (error) {
            logger.error('getHolidays error: %s', (error as Error).message);
            res.json({ holidays: [], timestamp: new Date().toISOString() });
        }
    }

    async getPlazoFijo(_req: Request, res: Response): Promise<void> {
        try {
            const cached = cache.get<unknown>('economics_plazo_fijo');
            if (cached) { res.json(cached); return; }
            const data = await argentinaDatosService.getPlazoFijoBancos();
            if (!data) { res.json({ bancos: [], timestamp: new Date().toISOString(), isFallback: true }); return; }
            const result = { bancos: (data as unknown[]).slice(0, 20), timestamp: new Date().toISOString() };
            cache.set('economics_plazo_fijo', result, 3600000);
            res.json(result);
        } catch (error) {
            logger.error('getPlazoFijo error: %s', (error as Error).message);
            res.json({ bancos: [], timestamp: new Date().toISOString() });
        }
    }

    async getFCI(_req: Request, res: Response): Promise<void> {
        try {
            const cached = cache.get<unknown>('economics_fci');
            if (cached) { res.json(cached); return; }
            const data = await argentinaDatosService.getFCIMoneyMarket();
            const result = { fondos: data || [], timestamp: new Date().toISOString() };
            cache.set('economics_fci', result, 3600000);
            res.json(result);
        } catch (error) {
            logger.error('getFCI error: %s', (error as Error).message);
            res.json({ fondos: [], timestamp: new Date().toISOString() });
        }
    }

    async getCalendarEvents(_req: Request, res: Response): Promise<void> {
        try {
            const cached = cache.get<unknown>('economics_calendar');
            if (cached) { res.json(cached); return; }

            const KNOWN_EVENTS = [
                { fecha: '2026-02-27', title: 'EMAE Diciembre 2025 — Actividad Económica', impact: 'medium', tipo: 'INDEC' },
                { fecha: '2026-03-12', title: 'IPC Febrero 2026 — Inflación Mensual', impact: 'high', tipo: 'INDEC' },
                { fecha: '2026-03-27', title: 'EMAE Enero 2026 — Actividad Económica', impact: 'medium', tipo: 'INDEC' },
                { fecha: '2026-04-14', title: 'IPC Marzo 2026 — Inflación Mensual', impact: 'high', tipo: 'INDEC' },
                { fecha: '2026-04-24', title: 'EMAE Febrero 2026 — Actividad Económica', impact: 'medium', tipo: 'INDEC' },
                { fecha: '2026-05-14', title: 'IPC Abril 2026 — Inflación Mensual', impact: 'high', tipo: 'INDEC' },
                { fecha: '2026-05-29', title: 'EMAE Marzo 2026 — Actividad Económica', impact: 'medium', tipo: 'INDEC' },
                { fecha: '2026-06-11', title: 'IPC Mayo 2026 — Inflación Mensual', impact: 'high', tipo: 'INDEC' },
                { fecha: '2026-06-26', title: 'EMAE Abril 2026 — Actividad Económica', impact: 'medium', tipo: 'INDEC' },
                { fecha: '2026-07-09', title: 'IPC Junio 2026 — Inflación Mensual', impact: 'high', tipo: 'INDEC' },
                { fecha: '2026-07-31', title: 'EMAE Mayo 2026 — Actividad Económica', impact: 'medium', tipo: 'INDEC' },
                { fecha: '2026-08-13', title: 'IPC Julio 2026 — Inflación Mensual', impact: 'high', tipo: 'INDEC' },
                { fecha: '2026-09-10', title: 'IPC Agosto 2026 — Inflación Mensual', impact: 'high', tipo: 'INDEC' },
                { fecha: '2026-10-08', title: 'IPC Septiembre 2026 — Inflación Mensual', impact: 'high', tipo: 'INDEC' },
                { fecha: '2026-11-12', title: 'IPC Octubre 2026 — Inflación Mensual', impact: 'high', tipo: 'INDEC' },
                { fecha: '2026-12-10', title: 'IPC Noviembre 2026 — Inflación Mensual', impact: 'high', tipo: 'INDEC' },
            ];

            const today = new Date(); today.setHours(0, 0, 0, 0);
            const bcraEvents = [];
            for (let mOffset = 0; mOffset <= 5; mOffset++) {
                const d = new Date(today.getFullYear(), today.getMonth() + mOffset, 1);
                while (d.getDay() !== 2) d.setDate(d.getDate() + 1);
                bcraEvents.push({ fecha: d.toISOString().split('T')[0], title: 'Licitación de Letras BCRA', impact: 'high', tipo: 'BCRA' });
            }

            type HolidayRaw = { fecha?: string; nombre?: string; tipo?: string };
            let holidayEvents: { fecha: string; title: string; impact: string; tipo: string; id: string }[] = [];
            try {
                const year = today.getFullYear();
                const [thisYear, nextYear] = await Promise.allSettled([argentinaDatosService.getHolidays(year), argentinaDatosService.getHolidays(year + 1)]);
                const todayStr = today.toISOString().split('T')[0];
                const raw: HolidayRaw[] = [
                    ...(thisYear.status === 'fulfilled' ? ((thisYear.value ?? []) as HolidayRaw[]) : []),
                    ...(nextYear.status === 'fulfilled' ? ((nextYear.value ?? []) as HolidayRaw[]) : []),
                ];
                holidayEvents = raw.filter(h => h?.fecha && h.fecha >= todayStr).map((h, i) => ({ fecha: h.fecha!, title: h.nombre || 'Feriado Nacional', impact: 'low', tipo: h.tipo || 'Feriado', id: `holiday-${i}` }));
            } catch (e) { logger.warn('getCalendarEvents: no se pudieron obtener feriados: %s', (e as Error).message); }

            const todayStr = today.toISOString().split('T')[0];
            const allRaw = [
                ...KNOWN_EVENTS.map((e, i) => ({ ...e, id: `known-${i}` })),
                ...bcraEvents.map((e, i) => ({ ...e, id: `bcra-${i}` })),
                ...holidayEvents,
            ];
            const seen = new Set<string>();
            const events = allRaw
                .filter(e => e.fecha >= todayStr)
                .sort((a, b) => a.fecha.localeCompare(b.fecha))
                .filter(e => { const key = `${e.fecha}|${e.title}`; if (seen.has(key)) return false; seen.add(key); return true; })
                .slice(0, 20);

            const result = { events, sources: ['INDEC (indec.gob.ar)', 'BCRA (bcra.gob.ar)', 'ArgentinaDatos'], timestamp: new Date().toISOString() };
            cache.set('economics_calendar', result, 6 * 3600 * 1000);
            res.json(result);
        } catch (error) {
            logger.error('getCalendarEvents error: %s', (error as Error).message);
            res.json({ events: [], sources: [], timestamp: new Date().toISOString() });
        }
    }
}

export default new EconomicsController();
