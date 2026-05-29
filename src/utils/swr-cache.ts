/**
 * swr-cache.ts
 * Middleware Stale-While-Revalidate para rutas GET del API.
 * Incluye request coalescing: la primera request en frio ejecuta el fetch,
 * las concurrentes esperan la promesa y comparten el resultado.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import logger from './logger';

interface CacheEntry {
    data: unknown;
    timestamp: number;
    revalidating: boolean;
}

const CACHE = new Map<string, CacheEntry>();
const INFLIGHT = new Map<string, Promise<unknown>>();
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
const DEFAULT_MAX_TTL_MS = 30 * 60 * 1000;

const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of CACHE) {
        if (now - entry.timestamp > DEFAULT_MAX_TTL_MS) {
            CACHE.delete(key);
            logger.debug('SWR: evicted stale entry %s', key);
        }
    }
}, CLEANUP_INTERVAL_MS);

if (cleanupTimer.unref) cleanupTimer.unref();

interface SWROptions {
    staleTTL: number;
    maxTTL: number;
}

export function swrCache(opts: SWROptions): RequestHandler {
    const { staleTTL, maxTTL } = opts;

    return function swrMiddleware(req: Request, res: Response, next: NextFunction): void {
        if (req.method !== 'GET') { next(); return; }

        const key = req.originalUrl;
        const entry = CACHE.get(key);
        const now = Date.now();

        function setCache(body: unknown) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                CACHE.set(key, { data: body, timestamp: Date.now(), revalidating: false });
            }
        }

        function patchAndNext() {
            const originalJson = res.json.bind(res);
            res.json = function (body: unknown) {
                setCache(body);
                return originalJson(body);
            };
            next();
        }

        if (!entry) {
            // Cold cache: request coalescing
            const inflight = INFLIGHT.get(key);
            if (inflight) {
                logger.debug('SWR: coalescing request for %s', key);
                inflight.then((data) => res.json(data)).catch(() => { patchAndNext(); });
                return;
            }

            // First request in cold state: execute controller and share result
            let resolveInflight: (data: unknown) => void;
            const promise = new Promise<unknown>((resolve) => { resolveInflight = resolve; });
            INFLIGHT.set(key, promise);

            const originalJson2 = res.json.bind(res);
            res.json = function (body: unknown) {
                setCache(body);
                resolveInflight!(body);
                INFLIGHT.delete(key);
                return originalJson2(body);
            };
            next();
            return;
        }

        const age = now - entry.timestamp;

        if (age < staleTTL) {
            res.setHeader('X-Cache', 'HIT');
            res.setHeader('X-Cache-Age', String(Math.floor(age / 1000)));
            res.json(entry.data);
            return;
        }

        if (age < maxTTL) {
            res.setHeader('X-Cache', 'STALE');
            res.setHeader('X-Cache-Age', String(Math.floor(age / 1000)));
            res.json(entry.data);

            if (!entry.revalidating) {
                entry.revalidating = true;
                logger.debug('SWR: revalidating %s in background', key);
                
                const r = res as any;
                const noop = () => r;
                r.json = (body: any) => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        CACHE.set(key, { data: body, timestamp: Date.now(), revalidating: false });
                    }
                    return r;
                };
                r.status = noop; r.send = noop; r.end = noop; r.setHeader = noop;
                r.header = noop; r.type = noop; r.format = noop; r.vary = noop;
                
                next();
            }
            return;
        }

        patchAndNext();
    };
}

export function invalidateCache(key?: string) {
    if (key) CACHE.delete(key);
    else CACHE.clear();
    INFLIGHT.clear();
    logger.debug('SWR: cache invalidated %s', key ?? 'ALL');
}

export function getCacheStats() {
    const entries = [...CACHE.entries()].map(([key, e]) => ({
        key,
        age: Math.floor((Date.now() - e.timestamp) / 1000),
        revalidating: e.revalidating,
    }));
    return { count: entries.length, inflight: INFLIGHT.size, entries };
}
