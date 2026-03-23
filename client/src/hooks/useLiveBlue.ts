import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSoundAlert } from './useSoundAlert';
import { useVoiceAlert } from './useVoiceAlert';
import { fireToast } from './useToast';

interface LiveBlueData {
    price: number;
    prevPrice: number;
    change: number;
    changePct: number;
    timestamp: number;
    connected: boolean;
}

const DEFAULT: LiveBlueData = {
    price: 0, prevPrice: 0, change: 0, changePct: 0, timestamp: 0, connected: false,
};

interface UseLiveBlueOptions {
    alertThresholdPct?: number; // % change that triggers sound alert (default 1)
    soundEnabled?: boolean;
    voiceEnabled?: boolean;
}

export function useLiveBlue(opts: UseLiveBlueOptions = {}): LiveBlueData {
    const { alertThresholdPct = 1, soundEnabled = true, voiceEnabled = false } = opts;
    const [data, setData] = useState<LiveBlueData>(DEFAULT);
    const socketRef = useRef<Socket | null>(null);
    const prevPriceRef = useRef(0);
    const { play } = useSoundAlert();
    const { speakPriceChange } = useVoiceAlert();

    const handleArbitrageUpdate = useCallback((payload: {
        dolares?: { blue?: { venta?: number } }
    }) => {
        const price = payload?.dolares?.blue?.venta ?? 0;
        if (price <= 0) return;

        const prev = prevPriceRef.current;
        const change = prev > 0 ? price - prev : 0;
        const changePct = prev > 0 ? (change / prev) * 100 : 0;

        prevPriceRef.current = price;

        setData({
            price,
            prevPrice: prev,
            change,
            changePct,
            timestamp: Date.now(),
            connected: true,
        });

        // Sound + toast alerts if price moved significantly
        if (prev > 0 && Math.abs(changePct) >= alertThresholdPct) {
            if (changePct > 0) {
                if (soundEnabled) play('up');
                if (voiceEnabled) speakPriceChange('dólar blue', price, 'sube');
                fireToast({
                    type: 'price-up',
                    title: `Blue ▲ +${changePct.toFixed(1)}%`,
                    message: `El dólar blue sube a $${price.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`,
                    duration: 5000,
                });
            } else {
                if (soundEnabled) play('down');
                if (voiceEnabled) speakPriceChange('dólar blue', price, 'baja');
                fireToast({
                    type: 'price-down',
                    title: `Blue ▼ ${changePct.toFixed(1)}%`,
                    message: `El dólar blue baja a $${price.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`,
                    duration: 5000,
                });
            }
        }
    }, [alertThresholdPct, soundEnabled, voiceEnabled, play, speakPriceChange]);

    useEffect(() => {
        const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
        const socket = io(apiUrl, {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
            timeout: 10000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setData(prev => ({ ...prev, connected: true }));
        });
        socket.on('disconnect', () => {
            setData(prev => ({ ...prev, connected: false }));
        });
        socket.on('arbitrage-update', handleArbitrageUpdate);

        return () => {
            socket.off('arbitrage-update', handleArbitrageUpdate);
            socket.disconnect();
        };
    }, [handleArbitrageUpdate]);

    return data;
}
