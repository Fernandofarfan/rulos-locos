import { useEffect, useRef, useState } from 'react';
import type { ArbitrageOpportunity, SpreadHistoryPoint } from '../types';

export interface ArbitragePayload {
    opportunities: ArbitrageOpportunity[];
    history?: SpreadHistoryPoint[];
    timestamp?: string;
    dolares: {
        [key: string]: { compra: number; venta: number; fechaActualizacion?: string } | undefined;
    };
}

export interface MarketPayload {
    merval: unknown[];
    cedears: unknown[];
    bonds: unknown[];
    global: unknown[];
    timestamp: string;
}

type Listener<T> = (data: T | undefined, connected: boolean) => void;

class Poller<T> {
    private listeners = new Set<Listener<T>>();
    private timer: ReturnType<typeof setInterval> | undefined;
    private inflight: Promise<T> | undefined;
    private data: T | undefined;
    private connected = false;

    private endpoint: string;
    constructor(endpoint: string) { this.endpoint = endpoint; }

    private visibility = () => {
        if (!document.hidden && this.listeners.size) void this.poll().catch(() => {});
    };

    subscribe(listener: Listener<T>): () => void {
        this.listeners.add(listener);
        if (this.data !== undefined || this.connected) listener(this.data, this.connected);
        if (this.listeners.size === 1) {
            document.addEventListener('visibilitychange', this.visibility);
            this.timer = setInterval(() => {
                if (!document.hidden) void this.poll().catch(() => {});
            }, 60_000);
            if (!document.hidden) void this.poll().catch(() => {});
        }
        return () => {
            this.listeners.delete(listener);
            if (!this.listeners.size) {
                clearInterval(this.timer);
                this.timer = undefined;
                document.removeEventListener('visibilitychange', this.visibility);
            }
        };
    }

    poll(): Promise<T> {
        if (this.inflight) return this.inflight;
        this.inflight = fetch(`${import.meta.env.VITE_API_URL || '/api'}${this.endpoint}`, {
            signal: AbortSignal.timeout(15000),
        }).then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json() as Promise<T>;
        }).then(data => {
            this.data = data;
            this.connected = true;
            this.listeners.forEach(listener => listener(data, true));
            return data;
        }).catch(error => {
            this.connected = false;
            this.listeners.forEach(listener => listener(undefined, false));
            throw error;
        }).finally(() => { this.inflight = undefined; });
        return this.inflight;
    }
}

const arbitragePoller = new Poller<ArbitragePayload>('/arbitrage');
const marketPoller = new Poller<MarketPayload>('/market');
export const pollArbitrage = () => arbitragePoller.poll();

function useStream<T>(poller: Poller<T>, callback: (data: T) => void): { connected: boolean } {
    const callbackRef = useRef(callback);
    useEffect(() => { callbackRef.current = callback; }, [callback]);
    const [connected, setConnected] = useState(false);
    useEffect(() => poller.subscribe((data, success) => {
        setConnected(success);
        if (data !== undefined) callbackRef.current(data);
    }), [poller]);
    return { connected };
}

export function useArbitrageStream(callback: (data: ArbitragePayload) => void): { connected: boolean } {
    return useStream(arbitragePoller, callback);
}

export function useMarketStream(callback: (data: MarketPayload) => void): { connected: boolean } {
    return useStream(marketPoller, callback);
}
