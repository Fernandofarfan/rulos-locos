/**
 * Service Worker — Rulos Locos PWA
 * Estrategia:
 *   - Assets estáticos: cache-first (JS, CSS, imágenes, fuentes)
 *   - App shell (HTML): network-first, fallback cache
 *   - API datos clave: stale-while-revalidate con TTL de 5 minutos
 *     → Muestra el último valor conocido offline en lugar de error
 * Permite instalar la app desde el browser en mobile/desktop.
 */

const CACHE_NAME = 'rulos-locos-v2';
const API_CACHE_NAME = 'rulos-locos-api-v2';
const API_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// URLs del app shell para cache offline
const SHELL_URLS = ['/', '/index.html'];

// Endpoints de API que se cachean para uso offline
const CACHEABLE_API_PATHS = [
    '/api/rate',
    '/api/arbitrage',
    '/api/economics/dashboard',
    '/api/economics/rates',
    '/api/economics/reservas',
    '/api/economics/calendar',
    '/api/platforms',
    '/api/bonds',
];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_URLS))
    );
    self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k !== CACHE_NAME && k !== API_CACHE_NAME)
                    .map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Guarda una response en la caché de API junto con su timestamp. */
async function putApiCache(request, response) {
    const cache = await caches.open(API_CACHE_NAME);
    // Clonar e inyectar header de timestamp para TTL
    const headers = new Headers(response.headers);
    headers.set('x-sw-cached-at', Date.now().toString());
    const timestamped = new Response(await response.clone().arrayBuffer(), {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
    await cache.put(request, timestamped);
}

/** Devuelve la cache de API si existe y no ha expirado, null en caso contrario. */
async function getFreshApiCache(request) {
    const cache = await caches.open(API_CACHE_NAME);
    const cached = await cache.match(request);
    if (!cached) return null;
    const cachedAt = parseInt(cached.headers.get('x-sw-cached-at') || '0', 10);
    if (Date.now() - cachedAt > API_CACHE_TTL_MS) return null; // expirado
    return cached;
}

/** Devuelve la cache de API sin importar la edad (fallback offline). */
async function getStaleApiCache(request) {
    const cache = await caches.open(API_CACHE_NAME);
    return cache.match(request);
}

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Solo cachear GETs
    if (request.method !== 'GET') return;

    // ── API endpoints clave: stale-while-revalidate ──────────────────────────
    const isCacheableApi = CACHEABLE_API_PATHS.some(p => url.pathname === p || url.pathname.startsWith(p + '?'));
    if (isCacheableApi) {
        event.respondWith(
            (async () => {
                // Intentar red primero
                try {
                    const networkRes = await fetch(request.clone());
                    if (networkRes.ok) {
                        // Guardar en caché en background (no bloqueamos la respuesta)
                        event.waitUntil(putApiCache(request, networkRes.clone()));
                        return networkRes;
                    }
                } catch (_) { /* Sin conexión — caer al cache */ }

                // Fallback: cache fresca → stale → error
                const fresh = await getFreshApiCache(request);
                if (fresh) return fresh;

                const stale = await getStaleApiCache(request);
                if (stale) {
                    // Agregar header para que el frontend sepa que los datos son del cache
                    const headers = new Headers(stale.headers);
                    headers.set('x-sw-offline', 'true');
                    return new Response(await stale.arrayBuffer(), {
                        status: stale.status,
                        statusText: stale.statusText,
                        headers,
                    });
                }

                // Sin cache disponible — devolver error legible
                return new Response(JSON.stringify({ error: 'Sin conexión y sin datos en caché' }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json', 'x-sw-offline': 'true' },
                });
            })()
        );
        return;
    }

    // ── Assets estáticos: cache-first ─────────────────────────────────────────
    if (url.pathname.match(/\.(js|css|svg|png|webp|ico|woff2|woff|ttf)$/)) {
        event.respondWith(
            caches.match(request).then(cached => {
                if (cached) return cached;
                return fetch(request).then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(c => c.put(request, clone));
                    }
                    return response;
                });
            })
        );
        return;
    }

    // ── Navegación: network-first, fallback app shell offline ─────────────────
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => caches.match('/index.html'))
        );
    }
});

// ─── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
    let data = { title: 'Rulos Locos', body: 'Actualización de precio', url: '/', icon: '/icons/icon-192.png', badge: '/icons/icon-72.png' };
    if (event.data) {
        try { data = { ...data, ...JSON.parse(event.data.text()) }; } catch (_) { }
    }
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            badge: data.badge,
            data: { url: data.url },
            vibrate: [200, 100, 200],
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url ?? '/';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
            const existing = clients.find(c => c.url.includes(self.location.origin));
            if (existing) { existing.focus(); existing.navigate(url); }
            else self.clients.openWindow(url);
        })
    );
});

