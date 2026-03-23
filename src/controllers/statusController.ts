import { Request, Response } from 'express';
import fetch from 'node-fetch';
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
    { name: 'BCRA Oficial', url: 'https://api.bcra.gob.ar/estadisticas/v3.0/monetarias/1' },
    { name: 'CriptoYa', url: 'https://criptoya.com/api/binancep2p/USDT/ARS/1' },
    { name: 'Stooq (Bonos)', url: 'https://stooq.com/q/d/l/?s=al30.ba&i=d&l=1' },
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
    const timeout = svc.timeout ?? 5000;
    try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), timeout);
        const res = await fetch(svc.url, {
            signal: controller.signal as unknown as AbortSignal,
            headers: { 'User-Agent': 'RulosLocos-StatusCheck/1.0' },
        });
        clearTimeout(t);
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
    }
}

export async function getApiStatus(_req: Request, res: Response): Promise<void> {
    const CACHE_KEY = 'api_status';
    const cached = cache.get<object>(CACHE_KEY);
    if (cached) { res.json(cached); return; }

    try {
        const results = await Promise.all(SERVICES.map(checkService));
        const hasDown = results.some(r => r.status === 'down');
        const hasDegraded = results.some(r => r.status === 'degraded');
        const overall: 'ok' | 'degraded' | 'down' = hasDown ? 'down' : hasDegraded ? 'degraded' : 'ok';

        const response = { overall, services: results, checkedAt: new Date().toISOString() };
        cache.set(CACHE_KEY, response, 25_000); // cache 25s para auto-refresh de 30s
        res.json(response);
    } catch (err) {
        logger.error('StatusController error:', err);
        res.status(500).json({ overall: 'down', services: [], checkedAt: new Date().toISOString() });
    }
}
