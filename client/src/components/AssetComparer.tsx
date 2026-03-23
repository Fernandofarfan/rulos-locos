import React, { useState, useEffect, useCallback } from 'react';
import { GitCompare, RefreshCw, TrendingUp } from 'lucide-react';
import { createChart } from 'lightweight-charts';
import { useRef } from 'react';
import { apiService } from '../services/api';

const ASSETS = [
    { key: 'blue',     label: 'Dólar Blue',    color: '#3b82f6' },
    { key: 'mep',      label: 'Dólar MEP',     color: '#8b5cf6' },
    { key: 'ccl',      label: 'Dólar CCL',     color: '#06b6d4' },
    { key: 'oficial',  label: 'Dólar Oficial', color: '#10b981' },
    { key: 'risk',     label: 'Riesgo País',   color: '#ef4444' },
    { key: 'inflation',label: 'Inflación',     color: '#f59e0b' },
];

type Range = '3M' | '6M' | '1Y';
const RANGE_SLICE: Record<Range, number> = { '3M': 90, '6M': 180, '1Y': 365 };

const normalize = (values: number[]): number[] => {
    const base = values[0];
    return base > 0 ? values.map(v => parseFloat(((v / base) * 100).toFixed(3))) : values;
};

export const AssetComparer: React.FC = () => {
    const [assetA, setAssetA] = useState('blue');
    const [assetB, setAssetB] = useState('risk');
    const [range, setRange] = useState<Range>('1Y');
    const [dataA, setDataA] = useState<{ labels: string[]; values: number[] } | null>(null);
    const [dataB, setDataB] = useState<{ labels: string[]; values: number[] } | null>(null);
    const [loading, setLoading] = useState(false);
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<any>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [resA, resB] = await Promise.allSettled([
            apiService.getHistorical(assetA, '1Y'),
            apiService.getHistorical(assetB, '1Y'),
        ]);
        if (resA.status === 'fulfilled') setDataA(resA.value);
        if (resB.status === 'fulfilled') setDataB(resB.value);
        setLoading(false);
    }, [assetA, assetB]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Build chart
    useEffect(() => {
        if (!chartRef.current || !dataA?.values?.length || !dataB?.values?.length) return;

        if (chartInstanceRef.current) { chartInstanceRef.current.remove(); chartInstanceRef.current = null; }

        const N = RANGE_SLICE[range];
        const sliceA = dataA.values.slice(-N);
        const labelsA = dataA.labels.slice(-N);
        const sliceB = dataB.values.slice(-N);
        const labelsB = dataB.labels.slice(-N);

        const normA = normalize(sliceA);
        const normB = normalize(sliceB);

        const chart = createChart(chartRef.current, {
            width: chartRef.current.clientWidth,
            height: 220,
            layout: { background: { color: 'transparent' } as any, textColor: '#94a3b8', fontSize: 11 },
            grid: { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
            crosshair: { vertLine: { labelBackgroundColor: '#1e2535' }, horzLine: { labelBackgroundColor: '#1e2535' } },
            rightPriceScale: { borderColor: 'rgba(255,255,255,0.05)' },
            timeScale: { borderColor: 'rgba(255,255,255,0.05)' },
            handleScroll: false, handleScale: false,
        });
        chartInstanceRef.current = chart;

        const metaA = ASSETS.find(a => a.key === assetA)!;
        const metaB = ASSETS.find(a => a.key === assetB)!;

        const sA = chart.addLineSeries({ color: metaA.color, lineWidth: 2, title: metaA.label });
        sA.setData(labelsA.map((t, i) => ({ time: t as any, value: normA[i] })));

        const sB = chart.addLineSeries({ color: metaB.color, lineWidth: 2, lineStyle: 1, title: metaB.label });
        sB.setData(labelsB.map((t, i) => ({ time: t as any, value: normB[i] })));

        // Baseline at 100
        const baselineSeries = chart.addLineSeries({ color: 'rgba(255,255,255,0.15)', lineWidth: 1, lineStyle: 2 });
        baselineSeries.setData(labelsA.map(t => ({ time: t as any, value: 100 })));

        chart.timeScale().fitContent();

        const ro = new ResizeObserver(() => {
            if (chartRef.current && chartInstanceRef.current)
                chartInstanceRef.current.applyOptions({ width: chartRef.current.clientWidth });
        });
        ro.observe(chartRef.current);
        return () => { ro.disconnect(); if (chartInstanceRef.current) { chartInstanceRef.current.remove(); chartInstanceRef.current = null; } };
    }, [dataA, dataB, assetA, assetB, range]);

    // Stats
    const N = RANGE_SLICE[range];
    const sliceA = dataA?.values.slice(-N) ?? [];
    const sliceB = dataB?.values.slice(-N) ?? [];
    const perfA = sliceA.length > 1 ? ((sliceA[sliceA.length - 1] / sliceA[0]) - 1) * 100 : 0;
    const perfB = sliceB.length > 1 ? ((sliceB[sliceB.length - 1] / sliceB[0]) - 1) * 100 : 0;
    const winner = perfA > perfB ? assetA : assetB;
    const metaA = ASSETS.find(a => a.key === assetA)!;
    const metaB = ASSETS.find(a => a.key === assetB)!;
    const RANGES: Range[] = ['3M', '6M', '1Y'];

    return (
        <div className="glass-panel no-lift p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/10 rounded-xl border border-violet-500/20">
                        <GitCompare size={16} className="text-violet-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Comparador de Activos</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">Performance relativa · Base 100</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Asset A */}
                    <select value={assetA} onChange={e => setAssetA(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white font-bold focus:outline-none focus:border-violet-500/50 transition-all">
                        {ASSETS.filter(a => a.key !== assetB).map(a => (
                            <option key={a.key} value={a.key}>{a.label}</option>
                        ))}
                    </select>
                    <span className="text-slate-500 text-xs font-bold">vs</span>
                    <select value={assetB} onChange={e => setAssetB(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white font-bold focus:outline-none focus:border-violet-500/50 transition-all">
                        {ASSETS.filter(a => a.key !== assetA).map(a => (
                            <option key={a.key} value={a.key}>{a.label}</option>
                        ))}
                    </select>
                    <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
                        {RANGES.map(r => (
                            <button key={r} onClick={() => setRange(r)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${range === r ? 'bg-white/15 text-white' : 'text-slate-500 hover:text-white'}`}>
                                {r}
                            </button>
                        ))}
                    </div>
                    <button onClick={fetchData} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors">
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 rounded inline-block" style={{ background: metaA.color }} />
                    <span style={{ color: metaA.color }}>{metaA.label}</span>
                    <span className={`ml-1 ${perfA >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {perfA >= 0 ? '+' : ''}{perfA.toFixed(1)}%
                    </span>
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 rounded inline-block border-dashed" style={{ background: metaB.color }} />
                    <span style={{ color: metaB.color }}>{metaB.label}</span>
                    <span className={`ml-1 ${perfB >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {perfB >= 0 ? '+' : ''}{perfB.toFixed(1)}%
                    </span>
                </span>
            </div>

            <div className="relative w-full min-h-[220px] rounded-xl overflow-hidden">
                {(loading || !dataA || !dataB) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/5 rounded-xl gap-2">
                        {loading ? (
                            <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
                        ) : (
                            <span className="text-slate-500 text-sm">Sin datos disponibles</span>
                        )}
                    </div>
                )}
                <div ref={chartRef} className="w-full" />
            </div>

            {/* Winner card */}
            {(sliceA.length > 1 && sliceB.length > 1) && (
                <div className={`rounded-xl p-3 border flex items-center gap-3 ${winner === assetA ? `border-slate-700 bg-${metaA.color}/5` : `border-slate-700 bg-${metaB.color}/5`}`}
                    style={{ background: `${(winner === assetA ? metaA : metaB).color}10`, borderColor: `${(winner === assetA ? metaA : metaB).color}30` }}>
                    <TrendingUp size={16} style={{ color: (winner === assetA ? metaA : metaB).color }} />
                    <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Mejor performance en {range}</span>
                        <div className="font-bold text-sm text-white">
                            {(winner === assetA ? metaA : metaB).label}
                            <span className="ml-2 text-xs font-mono" style={{ color: (winner === assetA ? metaA : metaB).color }}>
                                +{Math.max(perfA, perfB).toFixed(1)}% vs {Math.min(perfA, perfB).toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
