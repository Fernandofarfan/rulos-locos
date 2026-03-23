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

export const useSocket = (options?: UseSocketOptions) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const onMarketUpdateRef = useRef(options?.onMarketUpdate);
    useEffect(() => {
        onMarketUpdateRef.current = options?.onMarketUpdate;
    }, [options?.onMarketUpdate]);

    useEffect(() => {
        const newSocket = io(SOCKET_URL, {
            reconnectionAttempts: maxReconnectAttempts,
            reconnectionDelay: 2000,
            timeout: 5000,
            autoConnect: true,
        });

        setSocket(newSocket);

        newSocket.on('connect', () => {
            setIsConnected(true);
            reconnectAttempts.current = 0;
        });

        newSocket.on('disconnect', () => {
            setIsConnected(false);
        });

        newSocket.on('connect_error', () => {
            reconnectAttempts.current += 1;
            if (reconnectAttempts.current >= maxReconnectAttempts) {
                newSocket.disconnect();
            }
        });

        // Recibir actualizaciones de mercado del marketWorker (cada 5 min)
        newSocket.on('market-update', (data: MarketPayload) => {
            onMarketUpdateRef.current?.(data);
        });

        return () => {
            newSocket.close();
        };
    }, []);

    return { socket, isConnected };
};

