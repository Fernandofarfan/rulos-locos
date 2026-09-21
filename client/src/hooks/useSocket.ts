import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || '';

interface MarketPayload {
    merval: unknown[];
    cedears: unknown[];
    bonds: unknown[];
    global: unknown[];
    timestamp: string;
}

interface UseSocketOptions {
    onMarketUpdate?: (data: MarketPayload) => void;
}

// ─── Singleton socket ─────────────────────────────────────────────────────────
// Una sola conexión WebSocket compartida por toda la app evita abrir N
// conexiones (una por componente) y el consecuente consumo de recursos.
let sharedSocket: Socket | null = null;

export function getSharedSocket(): Socket {
    if (!sharedSocket) {
        sharedSocket = io(SOCKET_URL, {
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
            timeout: 5000,
            autoConnect: true,
        });
    }
    return sharedSocket;
}

export const useSocket = (options?: UseSocketOptions) => {
    const socket = getSharedSocket();
    const [isConnected, setIsConnected] = useState(socket.connected);
    const onMarketUpdateRef = useRef(options?.onMarketUpdate);

    useEffect(() => {
        onMarketUpdateRef.current = options?.onMarketUpdate;
    }, [options?.onMarketUpdate]);

    useEffect(() => {
        const handleConnect = () => setIsConnected(true);
        const handleDisconnect = () => setIsConnected(false);
        const handleMarket = (data: MarketPayload) => onMarketUpdateRef.current?.(data);

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('market-update', handleMarket);

        return () => {
            // Solo se quitan los listeners propios; el socket compartido sigue vivo
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('market-update', handleMarket);
        };
    }, [socket]);

    return { socket, isConnected };
};
