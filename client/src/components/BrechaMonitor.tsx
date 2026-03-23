import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AlertTriangle, Activity, RefreshCw } from 'lucide-react';
import { createChart, type IChartApi } from 'lightweight-charts';
import { apiService } from '../services/api';

interface DolarData {
    blue?: { compra?: number; venta?: number };
    mep?: { compra?: number; venta?: number };
    ccl?: { compra?: number; venta?: number };
    oficial?: { compra?: number; venta?: number };
}

interface HistSeries {
    labels: string[];
    values: number[];
}

interface BrechaCard {
    label: string;
    pair: string;
    value: number;
    tipo: number;
    base: number;
}

const severity = (pct: number) => {
    if (pct < 30) return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Baja' };
    if (pct < 75) return { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Moderada' };
    if (pct < 130) return { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: 'Alta' };
    return { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', label: 'Crítica' };
};

export const BrechaMonitor: React.FC = () => {
    const [dolares, setDolares] = useState<DolarData | null>(null);
    const [histBlue,    setHistBlue]    = useState<HistSeries>({ labels: [], values: [] });
    const [histMep,     setHistMep]     = useState<HistSeries>({ labels: [], values: [] });
    const [histCcl,     setHistCcl]     = useState<HistSeries>({ labels: [], values: [] });
    const [histOficial, setHistOficial] = useState<HistSeries>({ labels: [], values: [] });
    const [loading, setLoading] = useState(true);
    const multiChartRef = useRef<HTMLDivElement>(null);
    const chartApiRef   = useRef<IChartApi | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const [arb, hBlue, hMep, hCcl, hOficial] = await Promise.allSettled([
                apiService.getArbitrage(),
                apiService.getHistorical('blue',    '1Y'),
                apiService.getHistorical('mep',     '1Y'),
                apiService.getHistorical('ccl',     '1Y'),
                apiService.getHistorical('oficial', '1Y'),
            ]);
            if (arb.status === 'fulfilled' && arb.value?.dolares) {
                setDolares(arb.value.dolares);
            }
            if (hBlue.status === 'fulfilled' && hBlue.value?.values?.length)
                setHistBlue({ labels: hBlue.value.labels, values: hBlue.value.values });
            if (hMep.status === 'fulfilled' && hMep.value?.values?.length)
                setHistMep({ labels: hMep.value.labels, values: hMep.value.values });
            if (hCcl.status === 'fulfilled' && hCcl.value?.values?.length)
                setHistCcl({ labels: hCcl.value.labels, values: hCcl.value.values });
            if (hOficial.status === 'fulfilled' && hOficial.value?.values?.length)
                setHistOficial({ labels: hOficial.value.labels, values: hOficial.value.values });
        } catch (e) {
            console.error('BrechaMonitor error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const oficial = dolares?.oficial?.venta ?? 0;
    const blue = dolares?.blue?.venta ?? 0;
    const mep  = dolares?.mep?.venta  ?? 0;
    const ccl  = dolares?.ccl?.venta  ?? 0;

    const cards: BrechaCard[] = oficial > 0 ? [
        { label: 'Blue / Oficial', pair: 'Blue vs Oficial', value: ((blue / oficial) - 1) * 100, tipo: blue, base: oficial },
        { label: 'MEP / Oficial',  pair: 'MEP vs Oficial',  value: ((mep  / oficial) - 1) * 100, tipo: mep,  base: oficial },
        { label: 'CCL / Oficial',  pair: 'CCL vs Oficial',  value: ((ccl  / oficial) - 1) * 100, tipo: ccl,  base: oficial },
        { label: 'CCL / Blue',     pair: 'CCL vs Blue',     value: blue > 0 ? ((ccl  / blue)   - 1) * 100 : 0, tipo: ccl, base: blue },
    ] : [];

    // Multi-series chart effect: Oficial + Blue + MEP + CCL histórico
    useEffect(() => {
        if (!multiChartRef.current) return;
        if (!histBlue.labels.length && !histMep.labels.length && !histCcl.labels.length && !histOficial.labels.length) return;

        chartApiRef.current?.remove();
        chartApiRef.current = null;

        const w = multiChartRef.current.clientWidth;
        const chart = createChart(multiChartRef.current, {
            width:  w,
            height: 150,
            layout: { background: { color: 'transparent' } as never, textColor: '#94a3b8', fontFamily: "'Inter', sans-serif", fontSize: 11 },
            grid: { vertLines: { color: 'rgba(255,255,255,0.03)' }, horzLines: { color: 'rgba(255,255,255,0.03)' } },
            crosshair: {
                vertLine: { color: 'rgba(255,255,255,0.2)', width: 1 as never, style: 3 as never, labelBackgroundColor: '#1e2535' },
                horzLine: { color: 'rgba(255,255,255,0.2)', width: 1 as never, style: 3 as never, labelBackgroundColor: '#1e2535' },
            },
            rightPriceScale: { borderColor: 'rgba(255,255,255,0.05)', textColor: '#64748b', visible: true },
            timeScale:        { borderColor: 'rgba(255,255,255,0.05)', fixLeftEdge: true, fixRightEdge: true },
            handleScroll: { mouseWheel: false, pressedMouseMove: false },
            handleScale:  { mouseWheel: false, pinch: false },
        });
        chartApiRef.current = chart;

        const seriesCfg = [
            { hist: histOficial, color: '#10b981', title: 'Oficial' },
            { hist: histBlue,    color: '#f97316', title: 'Blue'    },
            { hist: histMep,     color: '#3b82f6', title: 'MEP'     },
            { hist: histCcl,     color: '#a855f7', title: 'CCL'     },
        ];

        for (const { hist, color, title } of seriesCfg) {
            if (!hist.labels.length) continue;
            const s = chart.addLineSeries({ color, lineWidth: 1.5 as never, lastValueVisible: true, priceLineVisible: false, title });
            s.setData(hist.labels.map((d, i) => ({ time: d as never, value: parseFloat((hist.values[i] || 0).toFixed(0)) })));
        }
        chart.timeScale().fitContent();

        const ro = new ResizeObserver(() => {
            if (multiChartRef.current && chartApiRef.current)
                chartApiRef.current.applyOptions({ width: multiChartRef.current.clientWidth });
        });
        ro.observe(multiChartRef.current);
        return () => { ro.disconnect(); chartApiRef.current?.remove(); chartApiRef.current = null; };
    }, [histBlue, histMep, histCcl, histOficial]);

    if (loading) {
        return (
            <div className="glass-panel p-6 animate-pulse">
                <div className="h-4 w-48 bg-white/10 rounded mb-4" />
                <div className="grid grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white/5 rounded-xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel no-lift p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-xl border border-orange-500/20">
                        <Activity size={16} className="text-orange-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Monitor de Brecha Cambiaria</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                            Tipo de cambio oficial: <span className="text-white font-mono font-bold">${oficial.toFixed(0)}</span> · En tiempo real
                        </p>
                    </div>
                </div>
                <button onClick={fetchData} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors">
                    <RefreshCw size={13} />
                </button>
            </div>

            {/* Brecha Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {cards.map((card) => {
                    const sev = severity(card.value);
                    return (
                        <div key={card.label} className={`rounded-2xl p-4 border ${sev.bg} ${sev.border} space-y-2`}>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{card.label}</div>
                            <div className={`text-2xl font-black font-mono ${sev.color}`}>
                                {card.value >= 0 ? '+' : ''}{card.value.toFixed(1)}%
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="text-[10px] text-slate-500 font-mono">${card.tipo.toFixed(0)} / ${card.base.toFixed(0)}</div>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${sev.bg} ${sev.color}`}>{sev.label}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Historical Multi-Line Chart: Blue + MEP + CCL */}
            {(histBlue.labels.length > 0 || histMep.labels.length > 0) && (
                <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                        <AlertTriangle size={10} className="text-amber-400" />
                        Evolución histórica (1 año) — cotizaciones ARS
                        <div className="ml-auto flex items-center gap-3">
                            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-[#10b981] inline-block rounded" />Oficial</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-[#f97316] inline-block rounded" />Blue</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-[#3b82f6] inline-block rounded" />MEP</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-[#a855f7] inline-block rounded" />CCL</span>
                        </div>
                    </div>
                    <div ref={multiChartRef} className="w-full" />
                </div>
            )}

            {oficial === 0 && (
                <p className="text-center text-slate-600 text-sm py-4">Sin datos de tipo de cambio oficial disponibles</p>
            )}
        </div>
    );
};
