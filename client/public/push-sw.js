/**
 * push-sw.js — Handlers de Web Push para Rulos Locos.
 *
 * IMPORTANTE: este archivo NO debe llamarse `sw.js` porque VitePWA
 * (generateSW) genera y sobrescribe `dist/sw.js`. Workbox lo importa
 * en runtime mediante `workbox.importScripts: ['/push-sw.js']`, así
 * conservamos los handlers de push/notificationclick.
 */

self.addEventListener('push', (event) => {
    let data = {
        title: 'Rulos Locos',
        body: 'Actualización de precio',
        url: '/',
        icon: '/icons/icon-192.svg',
        badge: '/icons/icon-192.svg',
    };
    if (event.data) {
        try { data = { ...data, ...JSON.parse(event.data.text()) }; } catch (_) { /* ignore */ }
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
