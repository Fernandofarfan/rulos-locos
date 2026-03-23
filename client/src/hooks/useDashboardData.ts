import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/api';
import { useSocket } from './useSocket';
import type { PriceData, ArbitrageOpportunity, SpreadHistoryPoint, DashboardData } from '../types';

interface DolarType {
    compra: number;
    venta: number;
}

interface ArbitrageState {
    opportunities: ArbitrageOpportunity[];
    history?: SpreadHistoryPoint[];
    dolares: {
        blue?: DolarType;
        mep?: DolarType;
        ccl?: DolarType;
        oficial?: DolarType;
        tarjeta?: DolarType;
        [key: string]: DolarType | undefined;
    };
}

export const useDashboardData = () => {
    const [rate, setRate] = useState<PriceData | null>(null);
    const [arbitrage, setArbitrage] = useState<ArbitrageState | null>(null);
    const [economics, setEconomics] = useState<DashboardData | null>(null);

    /** true SOLO en el primer fetch global (skeleton de página completa) */
    const [loading, setLoading] = useState(true);
    /** true en refetch silencioso (datos anteriores siguen visibles) */
    const [isRefreshing, setIsRefreshing] = useState(false);
    /** Loading individual por sección — permanece true hasta el primer dato */
    const [loadingRate, setLoadingRate] = useState(true);
    const [loadingArbitrage, setLoadingArbitrage] = useState(true);
    const [loadingEconomics, setLoadingEconomics] = useState(true);

    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    /** Variación % del ask respecto al valor anterior actualizado */
    const [rateChange, setRateChange] = useState<number>(0);
    const previousAskRef = useRef<number | null>(null);
    const hasDataRef = useRef(false);
    const { socket } = useSocket();

    const fetchData = useCallback(async () => {
        // Si ya tenemos datos, hacer refetch silencioso (stale-while-revalidate)
        if (hasDataRef.current) setIsRefreshing(true);

        const doFetchRate = async () => {
            try {
                const data = await apiService.getRate();
                // Calcular variación % respecto al valor anterior
                if (previousAskRef.current !== null && previousAskRef.current !== 0 && data?.ask) {
                    const pct = ((data.ask - previousAskRef.current) / previousAskRef.current) * 100;
                    setRateChange(Math.round(pct * 100) / 100);
                }
                if (data?.ask) previousAskRef.current = data.ask;
                setRate(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingRate(false);
            }
        };

        const doFetchArbitrage = async () => {
            try {
                const data = await apiService.getArbitrage();
                setArbitrage(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingArbitrage(false);
            }
        };

        const doFetchEconomics = async () => {
            try {
                const data = await apiService.getEconomics();
                setEconomics(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingEconomics(false);
            }
        };

        try {
            await Promise.allSettled([doFetchRate(), doFetchArbitrage(), doFetchEconomics()]);
            setLastUpdated(new Date());
            hasDataRef.current = true;
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        // Fetch initially, then let WebSockets handle all the updates
        fetchData();

        if (socket) {
            socket.on('arbitrage-update', (data: any) => {
                setArbitrage(data);
                if (data.rate) setRate(data.rate);
                setLastUpdated(new Date());
            });
        }

        return () => {
            if (socket) socket.off('arbitrage-update');
        };
    }, [fetchData, socket]);

    return {
        rate, arbitrage, economics,
        loading, isRefreshing,
        loadingRate, loadingArbitrage, loadingEconomics,
        lastUpdated, rateChange,
        refresh: fetchData,
    };
};
