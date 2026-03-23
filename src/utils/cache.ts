/**
 * Redis-aware cache — Rulos Locos
 *
 * Cuando la variable de entorno REDIS_URL está definida, usa Redis (ioredis).
 * En caso contrario (dev local, Vercel sin KV) usa el Map en memoria como antes.
 *
 * La API pública es idéntica a la del cache in-memory original:
 *   cache.get<T>(key)        → T | null
 *   cache.set<T>(key, data, ttlMs?)  → void
 *   cache.del(key)           → void
 *   cache.clear()            → void
 */

import logger from './logger';

interface CacheItem<T> {
    data: T;
    expiresAt: number; // epoch ms
}

// ─── In-memory backend ────────────────────────────────────────────────────────
class MemoryCache {
    private store = new Map<string, CacheItem<unknown>>();
    private readonly defaultTtl: number;

    constructor(ttl = 30_000) {
        this.defaultTtl = ttl;
    }

    get<T>(key: string): T | null {
        const item = this.store.get(key) as CacheItem<T> | undefined;
        if (!item) return null;
        if (Date.now() > item.expiresAt) { this.store.delete(key); return null; }
        return item.data;
    }

    set<T>(key: string, data: T, ttl?: number): void {
        this.store.set(key, { data, expiresAt: Date.now() + (ttl ?? this.defaultTtl) });
    }

    del(key: string): void { this.store.delete(key); }
    clear(): void { this.store.clear(); }
}

// ─── Redis backend (lazy-loaded to avoid crash when not configured) ───────────
let redisClient: import('ioredis').Redis | null = null;
let redisAvailable = false;

async function getRedisClient(): Promise<import('ioredis').Redis | null> {
    if (!process.env['REDIS_URL']) return null;
    if (redisClient) return redisClient;
    try {
        // Dynamic import so the module resolves at runtime — if ioredis is not
        // installed (dev without Redis) the import will throw and we fall back.
        const { default: Redis } = await import('ioredis') as { default: typeof import('ioredis').Redis };
        redisClient = new (Redis as unknown as new (url: string, opts: object) => import('ioredis').Redis)(
            process.env['REDIS_URL'],
            { maxRetriesPerRequest: 1, enableOfflineQueue: false, lazyConnect: true },
        );
        await (redisClient as unknown as { connect(): Promise<void> }).connect();
        redisAvailable = true;
        logger.info('✅ Redis conectado: %s', process.env['REDIS_URL'].replace(/:\/\/.*@/, '://***@'));
        return redisClient;
    } catch (e) {
        logger.warn('⚠️  Redis no disponible, usando caché en memoria: %s', (e as Error).message);
        redisClient = null;
        return null;
    }
}

// ─── Unified cache class ──────────────────────────────────────────────────────
class UnifiedCache {
    private mem = new MemoryCache();
    private readonly defaultTtl: number;

    constructor(ttl = 30_000) {
        this.defaultTtl = ttl;
        // Intentar conectar Redis en startup (no bloqueante)
        void getRedisClient();
    }

    get<T>(key: string): T | null {
        // Sync path: siempre retornar desde memoria primero (copia local caliente)
        return this.mem.get<T>(key);
    }

    set<T>(key: string, data: T, ttl?: number): void {
        const ttlMs = ttl ?? this.defaultTtl;
        // Guardar en memoria siempre (respuesta inmediata)
        this.mem.set(key, data, ttlMs);
        // Guardar en Redis en background cuando esté disponible
        if (redisAvailable && redisClient) {
            const ttlSec = Math.ceil(ttlMs / 1000);
            const serialized = JSON.stringify(data);
            (redisClient as unknown as { setex(k: string, t: number, v: string): void })
                .setex(key, ttlSec, serialized);
        }
    }

    del(key: string): void {
        this.mem.del(key);
        if (redisAvailable && redisClient) {
            (redisClient as unknown as { del(k: string): void }).del(key);
        }
    }

    clear(): void {
        this.mem.clear();
        if (redisAvailable && redisClient) {
            (redisClient as unknown as { flushdb(): void }).flushdb();
        }
    }

    /** Precalentamiento: lee desde Redis al arrancar si la memoria está vacía. */
    async warmUp(key: string): Promise<void> {
        if (this.mem.get(key) !== null) return; // ya en memoria
        const redis = await getRedisClient();
        if (!redis) return;
        try {
            const raw = await (redis as unknown as { get(k: string): Promise<string | null> }).get(key);
            if (raw) {
                const parsed = JSON.parse(raw) as unknown;
                // Usar TTL restante desde Redis
                const pttl = await (redis as unknown as { pttl(k: string): Promise<number> }).pttl(key);
                this.mem.set(key, parsed, pttl > 0 ? pttl : this.defaultTtl);
                logger.info('♨️  Cache warm-up desde Redis: %s (%dms restantes)', key, pttl);
            }
        } catch (e) {
            logger.warn('warmUp error para %s: %s', key, (e as Error).message);
        }
    }
}

export default new UnifiedCache();
