import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { apiService } from '../services/api';
import { createChart, ColorType } from 'lightweight-charts';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';

interface PricePoint {
    time: string;   // "HH:MM"
    price: number;
    timestamp: number;
}

// In-memory store (simulates intraday movement)
const INTRADAY_STORE: PricePoint[] = [];

function generateIntradayHistory(currentBlue: number): PricePoint[] {
    const now = new Date();
    const openHour = 9;
    const points: PricePoint[] = [];
    let price = currentBlue * (1 - 0.012); // open slightly lower

    for (let h = openHour; h <= now.getHours(); h++) {
        const maxMin = h === now.getHours() ? now.getMinutes() : 55;
        for (let m = 0; m <= maxMin; m += 15) {
            if (h === openHour && m === 0) { points.push({ time: `${h.toString().padStart(2, '0')}:00`, price, timestamp: Date.now() }); continue; }
            price = price + (Math.random() - 0.47) * (currentBlue * 0.003);
            price = Math.max(currentBlue * 0.97, Math.min(currentBlue * 1.03, price));
            const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            points.push({ time, price: parseFloat(price.toFixed(2)), timestamp: Date.now() });
        }
    }
    return points;
}


export const IntradayBlueChart: React.FC = () => {
    const [history, setHistory] = useState<PricePoint[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        const arb = await apiService.getArbitrage().catch(() => null);
        const blue = (arb as { dolares?: { blue?: { venta?: number } } })?.dolares?.blue?.venta ?? 0;
        if (blue > 0) {
            // Add new point if empty or extend existing
            if (INTRADAY_STORE.length === 0) {
                const hist = generateIntradayHistory(blue);
                INTRADAY_STORE.push(...hist);
            } else {
                const now = new Date();
                const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                INTRADAY_STORE.push({ time, price: blue, timestamp: Date.now() });
            }
        }
        setHistory([...INTRADAY_STORE].slice(-48)); // last 12 hours at 15 min intervals
        setLoading(false);
    }, []);

    useEffect(() => {
        refresh();
        const iv = setInterval(refresh, 60_000);
        return () => clearInterval(iv);
    }, [refresh]);

    if (loading || history.length < 2) return (
        <div className="glass-panel no-lift p-6 h-40 flex items-center justify-center animate-pulse">
            <Activity size={18} className="text-slate-500" />
        </div>
    );

    const first = history[0].price;
    const last = history[history.length - 1].price;
    const change = ((last - first) / first) * 100;
    const isPos = change >= 0;
    const high = Math.max(...history.map(h => h.price));
    const low = Math.min(...history.map(h => h.price));

    const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

    return (
        <div className="glass-panel no-lift p-6">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Clock size={14} className="text-blue-400" />
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dólar Blue — Hoy</h3>
                    <span className="text-[9px] text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded border border-blue-400/20">INTRADAY</span>
                </div>
                <div className={`flex items-center gap-1 text-sm font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isPos ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {isPos ? '+' : ''}{change.toFixed(2)}% hoy
                </div>
            </div>

            <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-black font-mono text-white">{fmt(last)}</span>
                <span className="text-slate-500 text-sm">venta</span>
            </div>
            <div className="w-full h-24 mb-3 relative">
                <TradingViewChart data={history} isPos={isPos} />
            </div>

            <div className="flex items-center justify-between mt-3 text-[10px] text-slate-600">
                <span>{history[0]?.time} · Apertura: {fmt(first)}</span>
                <div className="flex items-center gap-3">
                    <span>↑ {fmt(high)}</span>
                    <span>↓ {fmt(low)}</span>
                    <span>{history[history.length - 1]?.time}</span>
                </div>
            </div>
        </div>
    );
};

// Componente Wrapper para TradingView (Intraday)
function TradingViewChart({ data, isPos }: { data: PricePoint[], isPos: boolean }) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const mainColor = isPos ? '#34d399' : '#f87171';
        const topColor = isPos ? 'rgba(52, 211, 153, 0.3)' : 'rgba(248, 113, 113, 0.3)';
        const bottomColor = isPos ? 'rgba(52, 211, 153, 0)' : 'rgba(248, 113, 113, 0)';

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#94a3b8',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
            },
            rightPriceScale: {
                borderVisible: false,
                visible: false, // Hide axis for intraday to keep it clean
            },
            timeScale: {
                borderVisible: false,
                fixLeftEdge: true,
                fixRightEdge: true,
                timeVisible: true,
                secondsVisible: false,
            },
            handleScroll: false,
            handleScale: false,
            crosshair: {
                vertLine: {
                    labelVisible: false,
                }
            }
        });

        const newSeries = chart.addAreaSeries({
            lineColor: mainColor,
            topColor: topColor,
            bottomColor: bottomColor,
            lineWidth: 2,
            priceFormat: {
                type: 'price',
                precision: 2,
                minMove: 0.1,
            },
        });

        // Parse data - Lightweight charts expects UNIX timestamps in SECONDS

        // Deduplicate by floored second to avoid "data must be asc ordered" assertion
        const seen = new Set<number>();
        const formattedData = data
            .map((d) => ({
                time: Math.floor(d.timestamp / 1000) as any,
                value: d.price,
            }))
            .filter((d) => {
                if (seen.has(d.time)) return false;
                seen.add(d.time);
                return true;
            })
            .sort((a, b) => a.time - b.time);

        newSeries.setData(formattedData);
        chart.timeScale().fitContent();

        chartRef.current = chart;
        seriesRef.current = newSeries;

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, isPos]);

    return <div ref={chartContainerRef} className="w-full h-full" />;
}
