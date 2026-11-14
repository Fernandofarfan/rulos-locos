import { Request, Response } from 'express';
import cache from '../utils/cache';
import logger from '../utils/logger';

interface ServiceCheck {
    name: string;
    url: string;
    timeout?: number;
}

const SERVICES: ServiceCheck[] = [
    { name: 'DolarApi.com', url: 'https://dolarapi.com/v1/dolares' },
    { name: 'ArgentinaDatos', url: 'https://api.argentinadatos.com/v1/finanzas/indices/inflacion' },
    { name: 'BCRA Oficial', url: 'https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/1?limit=10' },
    { name: 'CriptoYa', url: 'https://criptoya.com/api/binancep2p/USDT/ARS/1' },
    { name: 'Yahoo Finance', url: 'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?range=1d&interval=1d' },
    { name: 'Data912 (Bonos)', url: 'https://data912.com/live/arg_bonds' },
    { name: 'CoinGecko (Crypto)', url: 'https://api.coingecko.com/api/v3/ping' },
    { name: 'EstadísticasBCRA', url: 'https://api.estadisticasbcra.com/usd_of' },
];

async function checkService(svc: ServiceCheck): Promise<{
    name: string;
    status: 'ok' | 'degraded' | 'down';
    latencyMs: number | null;
    lastCheck: string;
    errorMsg?: string;
}> {
    const start = Date.now();
    const timeout = svc.timeout ?? 2000;
    let t: ReturnType<typeof setTimeout> | undefined;
    try {
        const controller = new AbortController();
        t = setTimeout(() => controller.abort(), timeout);
        const res = await fetch(svc.url, {
            signal: controller.signal as unknown as AbortSignal,
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
        });
        const latencyMs = Date.now() - start;
        if (!res.ok) {
            return { name: svc.name, status: 'degraded', latencyMs, lastCheck: new Date().toISOString(), errorMsg: `HTTP ${res.status}` };
        }
        return {
            name: svc.name,
            status: latencyMs < 1500 ? 'ok' : 'degraded',
            latencyMs,
            lastCheck: new Date().toISOString(),
        };
    } catch (err: any) {
        return {
            name: svc.name,
            status: 'down',
            latencyMs: null,
            lastCheck: new Date().toISOString(),
            errorMsg: err?.name === 'AbortError' ? 'Timeout' : err?.message?.slice(0, 60) ?? 'Error',
        };
    } finally {
        if (t) clearTimeout(t);
    }
}

export async function getApiStatus(_req: Request, res: Response): Promise<void> {
    const CACHE_KEY = 'api_status';
    const cached = await cache.get<object>(CACHE_KEY);
    if (cached) { res.json(cached); return; }

    try {
        const results = await Promise.all(SERVICES.map(checkService));
        const hasDown = results.some(r => r.status === 'down');
        const hasDegraded = results.some(r => r.status === 'degraded');
        const overall: 'ok' | 'degraded' | 'down' = hasDown ? 'down' : hasDegraded ? 'degraded' : 'ok';

        const response = { overall, services: results, checkedAt: new Date().toISOString() };
        cache.set(CACHE_KEY, response, 30_000);
        res.json(response);
    } catch (err) {
        logger.error('StatusController error:', err);
        res.status(500).json({ overall: 'down', services: [], checkedAt: new Date().toISOString() });
    }
}
