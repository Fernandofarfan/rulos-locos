import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, TrendingDown, TrendingUp, RefreshCw, AlertTriangle } from 'lucide-react';
import { createChart } from 'lightweight-charts';
import { apiService } from '../services/api';

interface ReservaEntry { fecha: string; valor: number; }

const fmt = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })} M`;

// Simple linear regression for trend projection
function linearTrend(values: number[], daysAhead: number): number[] {
    const n = values.length;
    const xs = Array.from({ length: n }, (_, i) => i);
    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = values.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += (xs[i] - meanX) * (values[i] - meanY); den += (xs[i] - meanX) ** 2; }
    const slope = den !== 0 ? num / den : 0;
    const intercept = meanY - slope * meanX;
    return Array.from({ length: daysAhead }, (_, i) => intercept + slope * (n + i));
}

export const ReservasBCRA: React.FC = () => {
    const [data, setData] = useState<ReservaEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<any>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const resp = await apiService.getReservas();
            if (resp.data?.length) setData(resp.data);
        } catch (e) { console.error('ReservasBCRA error:', e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (!chartRef.current || !data.length) return;
        if (chartInstanceRef.current) { chartInstanceRef.current.remove(); chartInstanceRef.current = null; }

        const chart = createChart(chartRef.current, {
            width: chartRef.current.clientWidth,
            height: 220,
            layout: { background: { color: 'transparent' } as any, textColor: '#94a3b8', fontSize: 11 },
            grid: { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
            crosshair: { vertLine: { labelBackgroundColor: '#1e2535' }, horzLine: { labelBackgroundColor: '#1e2535' } },
            rightPriceScale: { borderColor: 'rgba(255,255,255,0.05)' },
            timeScale: { borderColor: 'rgba(255,255,255,0.05)', timeVisible: true },
            handleScroll: false, handleScale: false,
        });
        chartInstanceRef.current = chart;

        // Last 2 years
        const slice = data.slice(-730);
        const values = slice.map(d => d.valor);

        // Brutas (blue line)
        const brutasSeries = chart.addLineSeries({
            color: '#3b82f6', lineWidth: 2, title: 'Brutas',
            crosshairMarkerVisible: true, crosshairMarkerRadius: 4,
        });
        brutasSeries.setData(slice.map(d => ({ time: d.fecha as any, value: d.valor })));

        // Netas estimation (proxy: brutas × ~0.5 historically in Argentina)
        const netasSeries = chart.addLineSeries({
            color: '#f97316', lineWidth: 2, lineStyle: 1, title: 'Netas (est.)',
        });
        netasSeries.setData(slice.map(d => ({ time: d.fecha as any, value: d.valor * 0.5 })));

        // 30-day trend projection
        const projected = linearTrend(values.slice(-60), 30);
        const lastDate = new Date(slice[slice.length - 1].fecha);
        const projSeries = chart.addLineSeries({
            color: 'rgba(59,130,246,0.4)', lineWidth: 1, lineStyle: 2, title: 'Proyección',
        });
        const projData = projected.map((v, i) => {
            const d = new Date(lastDate);
            d.setDate(d.getDate() + i + 1);
            return { time: d.toISOString().split('T')[0] as any, value: Math.max(0, v) };
        });
        // Connect with last real point
        projSeries.setData([
            { time: slice[slice.length - 1].fecha as any, value: values[values.length - 1] },
            ...projData,
        ]);

        chart.timeScale().fitContent();

        const ro = new ResizeObserver(() => {
            if (chartRef.current && chartInstanceRef.current)
                chartInstanceRef.current.applyOptions({ width: chartRef.current.clientWidth });
        });
        ro.observe(chartRef.current);
        return () => {
            ro.disconnect();
            if (chartInstanceRef.current) { chartInstanceRef.current.remove(); chartInstanceRef.current = null; }
        };
    }, [data]);

    const latest = data[data.length - 1];
    const ago30 = data[Math.max(0, data.length - 31)];
    const change30 = latest && ago30 ? latest.valor - ago30.valor : 0;
    const projected30 = data.length > 60
        ? linearTrend(data.slice(-60).map(d => d.valor), 30)[29]
        : latest?.valor ?? 0;

    if (loading) {
        return (
            <div className="glass-panel p-6 animate-pulse space-y-4">
                <div className="h-4 w-48 bg-white/10 rounded" />
                <div className="h-56 bg-white/5 rounded-xl" />
            </div>
        );
    }

    return (
        <div className="glass-panel p-6 space-y-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                        <Shield size={16} className="text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Reservas BCRA</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                            Brutas (azul) · Netas estimadas (naranja) · Proyección 30d (punteado)
                        </p>
                    </div>
                </div>
                <button onClick={fetchData} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors">
                    <RefreshCw size={13} />
                </button>
            </div>

            {/* Cards */}
            {latest && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-blue-500/10 rounded-xl p-3 border border-blue-500/20">
                        <div className="text-[9px] text-blue-400 uppercase font-bold tracking-wider mb-1">Reservas Brutas</div>
                        <div className="text-base font-black font-mono text-white">{fmt(latest.valor)}</div>
                        <div className="text-[9px] text-slate-500 mt-1">{latest.fecha}</div>
                    </div>
                    <div className="bg-orange-500/10 rounded-xl p-3 border border-orange-500/20">
                        <div className="text-[9px] text-orange-400 uppercase font-bold tracking-wider mb-1">Netas (estimadas)</div>
                        <div className="text-base font-black font-mono text-white">{fmt(latest.valor * 0.5)}</div>
                        <div className="text-[9px] text-slate-600 mt-1">Brutas × 0.5 (proxy)</div>
                    </div>
                    <div className={`rounded-xl p-3 border ${change30 >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                        <div className="text-[9px] uppercase font-bold tracking-wider mb-1 text-slate-400">Variación 30d</div>
                        <div className={`text-base font-black font-mono flex items-center gap-1 ${change30 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {change30 >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {change30 >= 0 ? '+' : ''}{fmt(change30)}
                        </div>
                        <div className="text-[9px] text-slate-600 mt-1">{Math.abs(((change30 / ago30.valor) * 100)).toFixed(1)}% mensual</div>
                    </div>
                    <div className={`rounded-xl p-3 border ${projected30 >= latest.valor ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                        <div className="text-[9px] uppercase font-bold tracking-wider mb-1 text-amber-400 flex items-center gap-1">
                            <AlertTriangle size={9} /> Proyección 30d
                        </div>
                        <div className={`text-base font-black font-mono ${projected30 >= latest.valor ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {fmt(Math.max(0, projected30))}
                        </div>
                        <div className="text-[9px] text-slate-600 mt-1">Tendencia lineal</div>
                    </div>
                </div>
            )}

            <div ref={chartRef} className="w-full rounded-xl overflow-hidden" />

            {!data.length && (
                <p className="text-center text-slate-500 text-sm py-6">Datos de reservas no disponibles en este momento</p>
            )}
        </div>
    );
};
