import React, { useState, useMemo } from 'react';
import { LineChart } from 'lucide-react';

interface DataSeries {
    id: string;
    label: string;
    color: string;
    emoji: string;
    // Monthly returns (%) for last 12 months
    monthlyReturns: number[];
}

// Datos históricos estimados (últimos 12 meses 2024-2025)
const RAW_DATA: Omit<DataSeries, 'id'>[] = [
    {
        label: 'Inflación (INDEC)',
        color: '#ef4444',
        emoji: '🔥',
        monthlyReturns: [20.6, 13.2, 11.0, 8.8, 6.0, 4.6, 4.2, 3.5, 3.5, 2.4, 2.7, 3.0],
    },
    {
        label: 'Plazo Fijo TNA 110%',
        color: '#3b82f6',
        emoji: '🏦',
        monthlyReturns: Array(12).fill(110 / 12),
    },
    {
        label: 'Dólar MEP',
        color: '#10b981',
        emoji: '💵',
        monthlyReturns: [5.2, -2.1, 1.8, 3.4, -1.2, 2.0, 1.5, -0.5, 3.1, 2.2, -1.3, 4.1],
    },
    {
        label: 'Bitcoin (ARS)',
        color: '#f59e0b',
        emoji: '₿',
        monthlyReturns: [12.5, -8.3, 15.2, 22.1, -5.4, 18.6, 8.2, -12.1, 25.3, 14.7, -3.2, 30.1],
    },
    {
        label: 'Merval (ARS)',
        color: '#8b5cf6',
        emoji: '📈',
        monthlyReturns: [18.3, 5.2, 12.4, -4.2, 22.1, 8.5, -6.3, 14.2, 7.8, 19.4, -2.1, 11.3],
    },
];

const MONTHS = ['Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb'];

function cumulativeReturn(monthlyReturns: number[]): number[] {
    let acc = 100;
    return monthlyReturns.map(r => {
        acc = acc * (1 + r / 100);
        return parseFloat(acc.toFixed(2));
    });
}

function PolylineChart({ series, selected }: { series: DataSeries[]; selected: string[] }) {
    const W = 600; const H = 200;
    const visibleSeries = series.filter(s => selected.includes(s.id));
    if (!visibleSeries.length) return null;

    const allCumulative = visibleSeries.map(s => cumulativeReturn(s.monthlyReturns));
    const allValues = allCumulative.flat();
    const minV = Math.min(...allValues) * 0.99;
    const maxV = Math.max(...allValues) * 1.01;
    const xStep = W / (MONTHS.length - 1);

    const pts = (cumRet: number[]) =>
        cumRet.map((v, i) => {
            const x = i * xStep;
            const y = H - ((v - minV) / (maxV - minV)) * H;
            return `${x},${y}`;
        });

    return (
        <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" style={{ height: 160 }} preserveAspectRatio="none">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(f => {
                const y = H - f * H;
                return (
                    <g key={f}>
                        <line x1={0} y1={y} x2={W} y2={y} stroke="white" strokeOpacity={0.04} strokeWidth={1} />
                    </g>
                );
            })}
            {/* Baseline 100 */}
            {(() => {
                const y = H - ((100 - minV) / (maxV - minV)) * H;
                return <line x1={0} y1={y} x2={W} y2={y} stroke="white" strokeOpacity={0.15} strokeWidth={1} strokeDasharray="4,4" />;
            })()}
            {/* Series */}
            {visibleSeries.map((s, si) => {
                const cumRet = allCumulative[si];
                const path = `M ${pts(cumRet).join(' L ')}`;
                const lastPt = pts(cumRet)[cumRet.length - 1].split(',');
                return (
                    <g key={s.id}>
                        <path d={path} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx={lastPt[0]} cy={lastPt[1]} r="4" fill={s.color} />
                    </g>
                );
            })}
        </svg>
    );
}

export const RendimientoComparador: React.FC = () => {
    const series: DataSeries[] = RAW_DATA.map((s, i) => ({ ...s, id: String(i) }));
    const [selected, setSelected] = useState(series.map(s => s.id));

    const toggle = (id: string) =>
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const cumReturns = useMemo(() =>
        series.map(s => ({
            ...s,
            total: cumulativeReturn(s.monthlyReturns).at(-1)! - 100,
        })),
        [series]
    );

    return (
        <div className="glass-panel no-lift p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <LineChart size={14} className="text-cyan-400" />
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rendimientos vs Inflación — 12 meses</h3>
                </div>
                <span className="text-[9px] text-slate-600">base 100 = Mar 2024</span>
            </div>

            {/* Toggle chips */}
            <div className="flex flex-wrap gap-2 mb-4">
                {series.map(s => (
                    <button
                        key={s.id}
                        onClick={() => toggle(s.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${selected.includes(s.id) ? 'border-current opacity-100' : 'border-slate-800 text-slate-600 opacity-50'}`}
                        style={{ color: selected.includes(s.id) ? s.color : undefined }}
                    >
                        {s.emoji} {s.label}
                    </button>
                ))}
            </div>

            {/* Chart */}
            <PolylineChart series={series} selected={selected} />

            {/* Month labels */}
            <div className="flex justify-between mt-1 px-[2px]">
                {MONTHS.map(m => (
                    <span key={m} className="text-[8px] text-slate-700">{m}</span>
                ))}
            </div>

            {/* Summary table */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                {cumReturns.map(s => {
                    const isInflation = s.label.includes('Inflación');
                    const inflTotal = cumReturns.find(x => x.label.includes('Inflación'))?.total ?? 0;
                    const beatsInflation = s.total > inflTotal && !isInflation;
                    return (
                        <div
                            key={s.id}
                            className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${selected.includes(s.id) ? 'border-white/10 bg-white/5' : 'border-transparent opacity-40'}`}
                        >
                            <span style={{ color: s.color }} className="text-lg">{s.emoji}</span>
                            <div>
                                <div className="text-[9px] text-slate-500">{s.label}</div>
                                <div className={`text-sm font-bold font-mono ${s.total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {s.total >= 0 ? '+' : ''}{s.total.toFixed(1)}%
                                </div>
                                {beatsInflation && <span className="text-[7px] text-emerald-500 font-bold">✓ GANÓ</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
