import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_URL ?? '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

/**
 * Hook para gestionar suscripciones a Push Notifications.
 *
 * Uso:
 *   const { supported, permission, subscribed, subscribe, unsubscribe } = usePushNotifications();
 */
export function usePushNotifications() {
    const [supported] = useState(() => 'serviceWorker' in navigator && 'PushManager' in window);
    const [permission, setPermission] = useState<NotificationPermission>(() =>
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );
    const [subscribed, setSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Verificar si ya hay una suscripción activa al montar
    useEffect(() => {
        if (!supported) return;
        void (async () => {
            const reg = await navigator.serviceWorker.ready;
            const existing = await reg.pushManager.getSubscription();
            setSubscribed(!!existing);
        })();
    }, [supported]);

    const subscribe = useCallback(async () => {
        if (!supported) return;
        setLoading(true);
        setError(null);
        try {
            // 1. Pedir permiso
            const perm = await Notification.requestPermission();
            setPermission(perm);
            if (perm !== 'granted') throw new Error('Permiso denegado por el usuario');

            // 2. Obtener VAPID public key del backend
            const { data } = await axios.get(`${API_BASE}/api/push/vapid-public-key`);
            const publicKey = data.publicKey;

            // 3. Suscribir al push manager
            const reg = await navigator.serviceWorker.ready;
            const pushSub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
            });

            // 4. Registrar en el backend
            await axios.post(`${API_BASE}/api/push/subscribe`, pushSub.toJSON());

            setSubscribed(true);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, [supported]);

    const unsubscribe = useCallback(async () => {
        setLoading(true);
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
                await axios.delete(`${API_BASE}/api/push/unsubscribe`, {
                    data: { endpoint: sub.endpoint }
                });
                await sub.unsubscribe();
            }
            setSubscribed(false);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    return { supported, permission, subscribed, loading, error, subscribe, unsubscribe };
}
