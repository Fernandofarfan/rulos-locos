import { useState, useEffect, useCallback, useRef } from 'react';

interface SSEOptions {
    url: string;
    onMessage?: (data: any) => void;
    reconnectMs?: number;
    enabled?: boolean;
}

/**
 * useSSE — Server-Sent Events hook for real-time data.
 * Falls back gracefully if SSE endpoint not available.
 */
export function useSSE({ url, onMessage, reconnectMs = 5000, enabled = true }: SSEOptions) {
    const [connected, setConnected] = useState(false);
    const [lastData, setLastData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    const connect = useCallback(() => {
        if (!enabled || typeof EventSource === 'undefined') return;

        try {
            const es = new EventSource(url);
            eventSourceRef.current = es;

            es.onopen = () => {
                setConnected(true);
                setError(null);
            };

            es.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setLastData(data);
                    onMessage?.(data);
                } catch {
                    setLastData(event.data);
                }
            };

            es.onerror = () => {
                setConnected(false);
                es.close();
                eventSourceRef.current = null;
                // Reconnect after delay
                reconnectTimer.current = setTimeout(connect, reconnectMs);
            };
        } catch (err: any) {
            setError(err.message);
            setConnected(false);
        }
    }, [url, onMessage, reconnectMs, enabled]);

    useEffect(() => {
        connect();
        return () => {
            eventSourceRef.current?.close();
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        };
    }, [connect]);

    const disconnect = useCallback(() => {
        eventSourceRef.current?.close();
        eventSourceRef.current = null;
        setConnected(false);
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    }, []);

    return { connected, lastData, error, disconnect };
}
