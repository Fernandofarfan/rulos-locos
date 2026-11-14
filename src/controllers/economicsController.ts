import { Request, Response } from 'express';
import Parser from 'rss-parser';
import argentinaDatosService from '../services/argentinaDatosService';
import marketService from '../services/marketService';
import bcraService from '../services/bcraService';
import dolarApiService from '../services/dolarApiService';
import cache from '../utils/cache';
import logger from '../utils/logger';
import { carryTradeHistory } from '../utils/dateWindow';
import { filterByDateRange, type HistoricalRange } from '../utils/historicalRange';
import { annualRealRate } from '../utils/financial';

const parser = new Parser();

interface FallbackDashboard {
    macro: { inflation: { mensual: number; interanual: number; fecha: string; source?: string; isEstimated?: boolean }; risk: number; reserves: number; baseMonetaria: number; dolarEquilibrio: number; provenance?: Record<string, { source: string; isEstimated: boolean }> };
    market: { merval: unknown[]; cedears: unknown[]; bonds: unknown[] };
    global: unknown[];
    timestamp: string;
    isFallback: boolean;
    source: string;
    estimated: boolean;
    isEstimated: boolean;
}

function getFallbackDashboard(): FallbackDashboard {
    return {
        macro: {
            inflation: { mensual: 2.5, interanual: 115.0, fecha: new Date().toISOString().split('T')[0], source: 'estimado', isEstimated: true },
            risk: 640, reserves: 45305, baseMonetaria: 60500000000000, dolarEquilibrio: 1337,
            provenance: Object.fromEntries(['risk', 'reserves', 'baseMonetaria', 'dolarEquilibrio'].map(key => [key, { source: 'estimado', isEstimated: true }])),
        },
        market: {
            merval: [
                { ticker: 'YPFD', name: 'YPF S.A.', price: 55950, change: 3.5, vol: '300K' },
                { ticker: 'GGAL', name: 'Grupo Galicia', price: 6850, change: 6.4, vol: '512K' },
                { ticker: 'PAMP', name: 'Pampa Energía', price: 4230, change: 1.2, vol: '120K' },
                { ticker: 'BMA', name: 'Banco Macro', price: 9100, change: -0.5, vol: '80K' },
                { ticker: 'CEPU', name: 'Central Puerto', price: 1250, change: 0.8, vol: '200K' },
            ].map(item => ({ ...item, source: 'estimado', isEstimated: true })),
            cedears: [
                { ticker: 'AAPL', name: 'Apple Inc.', price: 22500, change: 1.2, ccl: 1180 },
                { ticker: 'MELI', name: 'MercadoLibre', price: 1850000, change: -0.5, ccl: 1190 },
                { ticker: 'TSLA', name: 'Tesla Inc.', price: 45000, change: 2.5, ccl: 1185 },
                { ticker: 'KO', name: 'Coca-Cola', price: 18000, change: 0.1, ccl: 1180 },
                { ticker: 'SPY', name: 'SPDR S&P 500', price: 65000, change: 0.8, ccl: 1182 },
            ].map(item => ({ ...item, source: 'estimado', isEstimated: true })),
            bonds: [
                { ticker: 'AL30', parity: 59.2, irr: 17.5, change: 1.2 },
                { ticker: 'GD30', parity: 64.5, irr: 15.8, change: 0.8 },
                { ticker: 'AL35', parity: 50.1, irr: 16.2, change: -0.5 },
                { ticker: 'AE38', parity: 53.8, irr: 16.5, change: 0.2 },
            ].map(item => ({ ...item, source: 'estimado', isEstimated: true })),
        },
        global: [],
        timestamp: new Date().toISOString(),
        isFallback: true,
        source: 'estimado',
        estimated: true, isEstimated: true,
    };
}

class EconomicsController {
    async getDashboardData(_req: Request, res: Response): Promise<void> {
        try {
            const cached = await cache.get<FallbackDashboard>('economics_dashboard');
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
                bcraService.getReservesWithSource(),
                bcraService.getBaseMonetariaWithSource(),
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
            const reservesData = reservesResult.status === 'fulfilled' ? reservesResult.value : null;
            const baseData = baseMonetariaResult.status === 'fulfilled' ? baseMonetariaResult.value : null;
            const reserves = reservesData?.value ?? null;
            const baseMonetaria = baseData?.value ?? null;
            const stocks = stocksResult.status === 'fulfilled' ? stocksResult.value : [];
            const cedears = cedearsResult.status === 'fulfilled' ? cedearsResult.value : [];
            const inflacionCategorias = inflacionCategoriasResult?.status === 'fulfilled' ? inflacionCategoriasResult.value : null;

            const finalReserves = reserves || 45305;
            const finalBase = baseMonetaria || 60500000000000;
            const equilibrio = finalReserves > 0 ? finalBase / (finalReserves * 1000000) : 0;
            const estimated = !inflation || inflation.estimated || risk === null || risk.estimated || !reserves || !baseMonetaria || !inflacionCategorias || !bonds.length ||
                [...stocks, ...cedears, ...bonds, ...(globalResult.status === 'fulfilled' ? globalResult.value : [])].some(item => item.estimated);

            const dashboardData = {
                macro: {
                    inflation: { ...(inflation || { mensual: 2.5, interanual: 115.0, fecha: new Date().toISOString().split('T')[0], source: 'estimado', isEstimated: true }), categorias: inflacionCategorias ?? null, categoriasIsEstimated: !inflacionCategorias, categoriasSource: inflacionCategorias ? 'argentinadatos' : 'estimado' },
                    risk: risk !== null ? risk.valor : 640,
                    reserves: finalReserves,
                    baseMonetaria: finalBase,
                    dolarEquilibrio: Math.round(equilibrio),
                    provenance: {
                        risk: { source: risk && !risk.estimated ? 'argentinadatos' : 'estimado', isEstimated: !risk || risk.estimated },
                        reserves: { source: reserves ? reservesData!.source : 'estimado', isEstimated: !reserves },
                        baseMonetaria: { source: baseMonetaria ? baseData!.source : 'estimado', isEstimated: !baseMonetaria },
                        dolarEquilibrio: { source: reserves && baseMonetaria ? [...new Set([reservesData!.source, baseData!.source])].join(', ') : 'estimado', isEstimated: !reserves || !baseMonetaria },
                    },
                },
                market: {
                    merval: stocks.slice(0, 5),
                    cedears: cedears.slice(0, 5),
                    bonds: bonds.length > 0 ? bonds : [
                        { ticker: 'AL30', parity: 59.2, irr: 17.5, change: 1.2 },
                        { ticker: 'GD30', parity: 64.5, irr: 15.8, change: 0.8 },
                        { ticker: 'AL35', parity: 50.1, irr: 16.2, change: -0.5 },
                        { ticker: 'AE38', parity: 53.8, irr: 16.5, change: 0.2 },
                    ].map(bond => ({ ...bond, source: 'estimado', isEstimated: true })),
                },
                global: globalResult?.status === 'fulfilled' ? globalResult.value : [],
                timestamp: new Date().toISOString(),
                estimated,
                source: estimated ? 'estimado' : [...new Set([
                    inflation!.source, 'argentinadatos', reservesData!.source, baseData!.source,
                    ...stocks.map(item => item.source), ...cedears.map(item => item.source),
                    ...bonds.map(item => item.source), ...(globalResult.status === 'fulfilled' ? globalResult.value.map(item => item.source) : []),
                ])].join(', '),
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
                return { labels, values, estimated: true, isEstimated: true, source: 'estimado' };
            };

            const fromSeries = (series: { fecha: string; valor: number }[], multiplier = 1) => {
                const estimated = multiplier !== 1 || argentinaDatosService.isEstimated(series);
                return {
                    labels: series.map(point => point.fecha.length === 7 ? `${point.fecha}-01` : point.fecha),
                    values: series.map(point => point.valor * multiplier),
                    estimated, isEstimated: estimated, source: estimated ? 'estimado' : 'argentinadatos',
                };
            };
            type HistoricalData = { labels: string[]; values: number[]; estimated: boolean; isEstimated: boolean; source: string };
            const getDataForIndicator = async (ind: string): Promise<HistoricalData> => {
                try {
                    const timeout = (ms: number) => {
                        let id: ReturnType<typeof setTimeout> | undefined;
                        const prom = new Promise<never>((_, reject) => { id = setTimeout(() => reject(new Error('Timeout')), ms); });
                        return { prom, cancel: () => clearTimeout(id) };
                    };
                    const { prom: timeLimit, cancel } = timeout(7000);
                    let dataPromise: Promise<HistoricalData>;

                    try {
                        switch (ind) {
                            case 'blue':
                            case 'dolar-blue':
                                dataPromise = argentinaDatosService.getHistoricalDollars().then(d =>
                                    (d.blue && d.blue.length > 10)
                                        ? fromSeries(d.blue)
                                        : Promise.reject(new Error('Empty Data'))
                                );
                                break;
                            case 'mep':
                            case 'dolar-mep':
                                dataPromise = argentinaDatosService.getHistoricalDollars().then(d =>
                                    (d.mep && d.mep.length > 10)
                                        ? fromSeries(d.mep)
                                        : (d.blue && d.blue.length > 10)
                                            ? fromSeries(d.blue, 0.99)
                                            : Promise.reject(new Error('Empty MEP Data'))
                                );
                                break;
                            case 'ccl':
                            case 'dolar-ccl':
                                dataPromise = argentinaDatosService.getHistoricalDollars().then(d =>
                                    (d.ccl && d.ccl.length > 10)
                                        ? fromSeries(d.ccl)
                                        : (d.blue && d.blue.length > 10)
                                            ? fromSeries(d.blue, 1.015)
                                            : Promise.reject(new Error('Empty CCL Data'))
                                );
                                break;
                            case 'oficial':
                            case 'dolar-oficial':
                                dataPromise = argentinaDatosService.getHistoricalDollars().then(d =>
                                    (d.oficial && d.oficial.length > 10)
                                        ? fromSeries(d.oficial)
                                        : Promise.reject(new Error('Empty Oficial Data'))
                                );
                                break;
                            case 'risk':
                            case 'riesgo':
                                dataPromise = argentinaDatosService.getCountryRiskData().then((data: { fecha: string; valor: number }[]) => {
                                    if (data && data.length > 0) return fromSeries(data);
                                    throw new Error('Empty Risk Data');
                                });
                                break;
                            case 'inflation':
                            case 'inflacion':
                                dataPromise = argentinaDatosService.getHistoricalInflation().then((data: { fecha: string; valor: number }[]) => {
                                    if (data && data.length > 0) return fromSeries(data);
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
                const { range } = req.query as { range?: HistoricalRange };
                if (range) data = { ...data, ...filterByDateRange(data.labels, data.values, range) };
                res.json({ ...data, timestamp: new Date().toISOString() });
                return;
            }

            const BULK_TIMEOUT_MS = 10_000;
            const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
                return new Promise((resolve, reject) => {
                    const timer = setTimeout(() => reject(new Error('Timeout')), ms);
                    promise.then(
                        (v) => { clearTimeout(timer); resolve(v); },
                        (e) => { clearTimeout(timer); reject(e); },
                    );
                });
            };

            const results = await Promise.allSettled([
                withTimeout(argentinaDatosService.getHistoricalInflation(), BULK_TIMEOUT_MS),
                withTimeout(Promise.resolve(argentinaDatosService.getPovertyData()), BULK_TIMEOUT_MS),
                withTimeout(argentinaDatosService.getHistoricalDollars(), BULK_TIMEOUT_MS),
                withTimeout(Promise.resolve(argentinaDatosService.getIndigenceData()), BULK_TIMEOUT_MS),
                withTimeout(Promise.resolve(argentinaDatosService.getUnemploymentData()), BULK_TIMEOUT_MS),
                withTimeout(argentinaDatosService.getCountryRiskData(), BULK_TIMEOUT_MS),
            ]);

            const range = (req.query as { range?: HistoricalRange }).range ?? 'ALL';
            const filterItems = <T extends { fecha: string }>(items: T[], isEstimated: boolean, source: string) =>
                filterByDateRange(items.map(item => item.fecha), items, range).values
                    .map(item => ({ ...item, isEstimated, source: isEstimated ? 'estimado' : source }));
            const [inflationResult, povertyResult, dollarsResult, indigenceResult, unemploymentResult, riskResult] = results;
            const inflationRows = inflationResult.status === 'fulfilled' ? inflationResult.value : [];
            const povertyRows = povertyResult.status === 'fulfilled' ? povertyResult.value : [];
            const dollarRows = dollarsResult.status === 'fulfilled' ? dollarsResult.value : { blue: [], mep: [], ccl: [], oficial: [] };
            const indigenceRows = indigenceResult.status === 'fulfilled' ? indigenceResult.value : [];
            const unemploymentRows = unemploymentResult.status === 'fulfilled' ? unemploymentResult.value : [];
            const riskRows = riskResult.status === 'fulfilled' ? riskResult.value : [];
            const inflation = filterItems(inflationRows, argentinaDatosService.isEstimated(inflationRows), 'argentinadatos');
            const poverty = filterItems(povertyRows, true, 'estimado');
            const dollars = {
                blue: filterItems(dollarRows.blue, argentinaDatosService.isEstimated(dollarRows.blue), 'argentinadatos'),
                mep: filterItems(dollarRows.mep, argentinaDatosService.isEstimated(dollarRows.mep), 'argentinadatos'),
                ccl: filterItems(dollarRows.ccl, argentinaDatosService.isEstimated(dollarRows.ccl), 'argentinadatos'),
                oficial: filterItems(dollarRows.oficial, argentinaDatosService.isEstimated(dollarRows.oficial), 'argentinadatos'),
            };
            const indigence = filterItems(indigenceRows, true, 'estimado');
            const unemployment = filterItems(unemploymentRows, true, 'estimado');
            const countryRisk = filterItems(riskRows, argentinaDatosService.isEstimated(riskRows), 'argentinadatos');
            res.json({ inflation, poverty, dollars, indigence, unemployment, countryRisk, timestamp: new Date().toISOString(), estimated: true, source: 'estimado' });
        } catch (error) {
            logger.error('Error in EconomicsController.getHistoricalData: %s', (error as Error).stack);
            res.status(500).json({ labels: [], values: [] });
        }
    }

    async getMarketData(_req: Request, res: Response): Promise<void> {
        try {
            // Servir desde caché del marketWorker si está disponible (actualizado cada 5 min)
            const cached = await cache.get<object>('market_data');
            if (cached) { res.json(cached); return; }

            const [merval, cedears, bonds, global] = await Promise.all([
                marketService.getMervalStocks(),
                marketService.getCedears(),
                marketService.getBonds(),
                marketService.getGlobalIndices(),
            ]);
            const estimated = [...merval, ...cedears, ...bonds, ...global].some(item => item.estimated);
            const payload = { merval, cedears, bonds, global, timestamp: new Date(), estimated, source: estimated ? 'estimado' : [...new Set([...merval, ...cedears, ...bonds, ...global].map(item => item.source))].join(', ') };
            cache.set('market_data', payload, 6 * 60 * 1000);
            res.json(payload);
        } catch {
            res.status(500).json({ error: 'Error fetching market data' });
        }
    }

    async getNews(_req: Request, res: Response): Promise<void> {
        const cached = await cache.get<object[]>('economics_news');
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
                { id: 1, title: 'El mercado reacciona a los anuncios económicos', source: 'estimado', estimated: true, publishedAt: null, url: '#', category: 'Economy' },
                { id: 2, title: 'Bitcoin mantiene su tendencia alcista', source: 'estimado', estimated: true, publishedAt: null, url: '#', category: 'Crypto' },
                { id: 3, title: 'Nuevas regulaciones para importaciones', source: 'estimado', estimated: true, publishedAt: null, url: '#', category: 'Policy' },
            ]);
        }
    }

    async getRates(_req: Request, res: Response): Promise<void> {
        try {
            const cached = await cache.get<unknown>('economics_rates');
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
            const realRate = annualRealRate(badlarTNA, inflation.interanual || 0);

            const ratesData = {
                badlar: { tna: parseFloat(badlarTNA.toFixed(2)), tem: parseFloat(badlarTEM.toFixed(2)), tea: parseFloat(badlarTEA.toFixed(2)), fecha: (deposit as { valor: number; fecha: string }).fecha },
                plazoFijo: { tna: parseFloat(pfTNA.toFixed(2)), tem: parseFloat(pfTEM.toFixed(2)), tea: parseFloat(pfTEA.toFixed(2)) },
                inflation: { mensual: (inflation as { mensual: number }).mensual, interanual: (inflation as { interanual: number }).interanual, fecha: (inflation as { fecha: string }).fecha },
                realRate: parseFloat(realRate.toFixed(2)),
                timestamp: new Date().toISOString(),
                estimated: true,
                source: 'estimado',
            };
            cache.set('economics_rates', ratesData, 600000);
            res.json(ratesData);
        } catch (error) {
            logger.error('Error in getRates: %s', (error as Error).stack);
            res.json({ badlar: { tna: 34.0, tem: 2.83, tea: 40.5, fecha: '' }, plazoFijo: { tna: 33.0, tem: 2.75, tea: 39.1 }, inflation: { mensual: 2.5, interanual: 84.0, fecha: '' }, realRate: Number(annualRealRate(34, 84).toFixed(2)), timestamp: new Date().toISOString(), estimated: true, source: 'estimado' });
        }
    }

    async getYieldCurve(_req: Request, res: Response): Promise<void> {
        try {
            const cached = await cache.get<unknown>('economics_yield_curve');
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
            let estimatedRate = true;
            try {
                const dolarData = await dolarApiService.getAllDollars();
                const ccl = dolarData.find(d => d.casa === 'contadoconliqui');
                const mep = dolarData.find(d => d.casa === 'bolsa');
                cclRate = ccl?.venta || mep?.venta || 1200;
                estimatedRate = !(ccl?.venta || mep?.venta);
            } catch { /* use fallback */ }

            const fallbackPrices: Record<string, number> = { 'AL29.BA': 62.5, 'AL30.BA': 61.8, 'AL35.BA': 54.2, 'AL41.BA': 52.8, 'GD29.BA': 65.5, 'GD30.BA': 64.2, 'GD35.BA': 56.8, 'GD41.BA': 55.4 };
            let fetchedQuotes: { symbol: string; regularMarketPrice: number }[] = [];
            try { fetchedQuotes = await marketService.getQuotesBatch(BONDS.map(b => b.ticker)); } catch { /* ignore */ }

            const points = BONDS.map(b => {
                const quote = fetchedQuotes.find(q => q.symbol === b.ticker);
                const estimated = !quote || estimatedRate;
                const priceARS = quote?.regularMarketPrice || (fallbackPrices[b.ticker] || 50) * cclRate;
                if (!priceARS || priceARS <= 0) return null;
                const priceUSD = priceARS / cclRate;
                const C = b.faceValue * (b.couponPct / 100);
                const F = b.faceValue;
                const P = Math.min(priceUSD, F * 1.5);
                const n = b.durationYrs;
                const ytm = ((C + (F - P) / n) / ((F + P) / 2)) * 100;
                if (!Number.isFinite(priceUSD) || !Number.isFinite(ytm) || priceUSD < 5 || priceUSD > 200 || ytm < -5 || ytm > 60) {
                    logger.warn('Yield curve: descartando %s precio USD=%s TIR=%s', b.ticker, priceUSD, ytm);
                    return null;
                }
                return { name: b.name, law: b.law, duration: b.durationYrs, ytm: parseFloat(ytm.toFixed(2)), priceUSD: parseFloat(priceUSD.toFixed(2)), priceARS: parseFloat(priceARS.toFixed(2)), coupon: b.couponPct, maturity: b.maturityYear, estimated: true, isEstimated: true, source: 'estimado', priceSource: estimated ? 'estimado' : 'Data912' };
            }).filter(Boolean).sort((a, b) => a!.duration - b!.duration);

            const estimated = points.length === 0 || points.some(point => point?.estimated);
            const data = { points, cclUsed: cclRate, timestamp: new Date().toISOString(), estimated, isEstimated: estimated, source: estimated ? 'estimado' : 'Data912' };
            cache.set('economics_yield_curve', data, 300000);
            res.json(data);
        } catch (error) {
            logger.error('Error in getYieldCurve: %s', (error as Error).stack);
            res.json({ points: [], cclUsed: 0, timestamp: new Date().toISOString(), estimated: true, source: 'estimado' });
        }
    }

    async getUVA(_req: Request, res: Response): Promise<void> {
        try {
            const cached = await cache.get<unknown>('economics_uva');
            if (cached) { res.json(cached); return; }
            const uva = await argentinaDatosService.getUVAData();
            const data = { ...uva, latest: uva.data[uva.data.length - 1], timestamp: new Date().toISOString() };
            cache.set('economics_uva', data, 3600000);
            res.json(data);
        } catch (error) {
            logger.error('Error in getUVA: %s', (error as Error).stack);
            res.json({ data: [], source: 'estimado', estimated: true, timestamp: new Date().toISOString() });
        }
    }

    async getReservas(_req: Request, res: Response): Promise<void> {
        try {
            const cached = await cache.get<unknown>('economics_reservas');
            if (cached) { res.json(cached); return; }
            const history = await argentinaDatosService.getReservasHistory();
            const raw = history.data;
            if (!raw.length) { res.json({ data: [], source: 'estimado', estimated: true, timestamp: new Date().toISOString() }); return; }
            type RawEntry = { fecha?: string; date?: string; d?: string; valor?: number; value?: number; v?: number };
            const data = (raw as RawEntry[]).map(entry => ({
                fecha: entry.fecha ?? entry.date ?? entry.d,
                valor: parseFloat(String(entry.valor ?? entry.value ?? entry.v ?? 0)),
            })).filter(e => e.fecha && !isNaN(e.valor) && e.valor > 0);
            const result = { data, source: history.source, estimated: history.estimated, isEstimated: history.estimated, timestamp: new Date().toISOString() };
            cache.set('economics_reservas', result, 3600000);
            res.json(result);
        } catch (error) {
            logger.error('Error in getReservas: %s', (error as Error).stack);
            res.json({ data: [], source: 'estimado', estimated: true, timestamp: new Date().toISOString() });
        }
    }

    async getCarryTradeData(_req: Request, res: Response): Promise<void> {
        try {
            const cached = await cache.get<unknown>('economics_carry_trade');
            if (cached) { res.json(cached); return; }
            const [dollars, rates] = await Promise.all([argentinaDatosService.getHistoricalDollars(), argentinaDatosService.getDepositRates()]);
            type BlueSeries = { fecha: string; valor: number }[];
            const allBlue = (dollars as { blue?: BlueSeries }).blue ?? [];
            const blueSeries = filterByDateRange(allBlue.map(point => point.fecha), allBlue, '6M').values;
            const currentTNA = ((rates as { valor?: number }).valor) || 34;
            const history = carryTradeHistory(blueSeries, currentTNA);
            const result = { history, currentTNA, timestamp: new Date().toISOString(), source: 'estimado', isEstimated: true, estimated: true };
            cache.set('economics_carry_trade', result, 3600000);
            res.json(result);
        } catch (error) {
            logger.error('Error in getCarryTradeData: %s', (error as Error).stack);
            res.json({ history: [], error: true });
        }
    }

    async getEquilibriumDollar(_req: Request, res: Response): Promise<void> {
        try {
            const cached = await cache.get<unknown>('economics_equilibrium');
            if (cached) { res.json(cached); return; }
            const [reservesData, baseData] = await Promise.all([bcraService.getReservesWithSource(), bcraService.getBaseMonetariaWithSource()]);
            const reserves = reservesData?.value ?? null;
            const baseMonetaria = baseData?.value ?? null;
            const finalReserves = reserves || 45305;
            const finalBase = baseMonetaria || 60500000000000;
            const equilibrium = finalBase / (finalReserves * 1000000);
            const estimated = !reserves || !baseMonetaria;
            const result = { theoretical: parseFloat(equilibrium.toFixed(2)), reserves: finalReserves, baseMonetaria: finalBase, timestamp: new Date().toISOString(), estimated, source: estimated ? 'estimado' : [...new Set([reservesData!.source, baseData!.source])].join(', ') };
            cache.set('economics_equilibrium', result, 3600000);
            res.json(result);
        } catch (error) {
            logger.error('Error in getEquilibriumDollar: %s', (error as Error).message);
            res.json({ theoretical: 1337, reserves: 45305, baseMonetaria: 60500000000000, timestamp: new Date().toISOString(), estimated: true, source: 'estimado' });
        }
    }

    async getHolidays(_req: Request, res: Response): Promise<void> {
        try {
            const cached = await cache.get<unknown>('economics_holidays');
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
            const cached = await cache.get<unknown>('economics_plazo_fijo');
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
            const cached = await cache.get<unknown>('economics_fci');
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
            const todayStr = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit',
            }).format(new Date());
            const cached = await cache.get<{ events: { fecha: string }[]; sources: string[]; timestamp: string }>('economics_calendar');
            if (cached) { res.json({ ...cached, events: cached.events.filter(event => event.fecha >= todayStr) }); return; }

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

            const today = new Date(`${todayStr}T00:00:00Z`);
            const bcraEvents = [];
            for (let mOffset = 0; mOffset <= 5; mOffset++) {
                const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + mOffset, 1));
                while (d.getUTCDay() !== 2) d.setUTCDate(d.getUTCDate() + 1);
                bcraEvents.push({ fecha: d.toISOString().split('T')[0], title: 'Licitación de Letras BCRA', impact: 'high', tipo: 'BCRA' });
            }

            type HolidayRaw = { fecha?: string; nombre?: string; tipo?: string };
            let holidayEvents: { fecha: string; title: string; impact: string; tipo: string; id: string }[] = [];
            try {
                const year = today.getUTCFullYear();
                const [thisYear, nextYear] = await Promise.allSettled([argentinaDatosService.getHolidays(year), argentinaDatosService.getHolidays(year + 1)]);
                const raw: HolidayRaw[] = [
                    ...(thisYear.status === 'fulfilled' ? ((thisYear.value ?? []) as HolidayRaw[]) : []),
                    ...(nextYear.status === 'fulfilled' ? ((nextYear.value ?? []) as HolidayRaw[]) : []),
                ];
                holidayEvents = raw.filter(h => h?.fecha && h.fecha >= todayStr).map((h, i) => ({ fecha: h.fecha!, title: h.nombre || 'Feriado Nacional', impact: 'low', tipo: h.tipo || 'Feriado', id: `holiday-${i}` }));
            } catch (e) { logger.warn('getCalendarEvents: no se pudieron obtener feriados: %s', (e as Error).message); }

            const allRaw = [
                ...KNOWN_EVENTS.map((e, i) => ({ ...e, id: `known-${i}`, source: 'referencia', isEstimated: true })),
                ...bcraEvents.map((e, i) => ({ ...e, id: `bcra-${i}`, source: 'estimado', isEstimated: true })),
                ...holidayEvents.map(e => ({ ...e, source: 'ArgentinaDatos', isEstimated: false })),
            ];
            const seen = new Set<string>();
            const events = allRaw
                .filter(e => e.fecha >= todayStr)
                .sort((a, b) => a.fecha.localeCompare(b.fecha))
                .filter(e => { const key = `${e.fecha}|${e.title}`; if (seen.has(key)) return false; seen.add(key); return true; })
                .slice(0, 20);

            const result = { events, sources: ['referencia', 'ArgentinaDatos'], source: 'estimado', isEstimated: true, timestamp: new Date().toISOString() };
            cache.set('economics_calendar', result, 6 * 3600 * 1000);
            res.json(result);
        } catch (error) {
            logger.error('getCalendarEvents error: %s', (error as Error).message);
            res.json({ events: [], sources: [], timestamp: new Date().toISOString() });
        }
    }
}

export default new EconomicsController();
