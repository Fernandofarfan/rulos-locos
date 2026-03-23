import React, { useEffect, useState, useCallback } from 'react';
import { Grid, RefreshCw, Info } from 'lucide-react';
import { apiService } from '../services/api';

const ASSETS = [
    { key: 'blue',     label: 'Blue',    color: '#3b82f6' },
    { key: 'mep',      label: 'MEP',     color: '#8b5cf6' },
    { key: 'ccl',      label: 'CCL',     color: '#06b6d4' },
    { key: 'oficial',  label: 'Oficial', color: '#10b981' },
    { key: 'risk',     label: 'Riesgo País', color: '#ef4444' },
    { key: 'inflation',label: 'Inflación',   color: '#f59e0b' },
];

/** Pearson correlation coefficient */
function pearson(a: number[], b: number[]): number {
    const n = Math.min(a.length, b.length);
    if (n < 3) return 0;
    const slice_a = a.slice(a.length - n);
    const slice_b = b.slice(b.length - n);
    const meanA = slice_a.reduce((s, x) => s + x, 0) / n;
    const meanB = slice_b.reduce((s, x) => s + x, 0) / n;
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < n; i++) {
        const xa = slice_a[i] - meanA;
        const xb = slice_b[i] - meanB;
        num += xa * xb;
        da += xa * xa;
        db += xb * xb;
    }
    const denom = Math.sqrt(da * db);
    return denom < 1e-10 ? 0 : parseFloat((num / denom).toFixed(3));
}

/** Color from r ∈ [-1, 1] */
function rColor(r: number): string {
    if (r >= 0.7) return '#10b981'; // strong positive
    if (r >= 0.3) return '#34d399'; // moderate positive
    if (r >= -0.3) return '#94a3b8'; // neutral
    if (r >= -0.7) return '#f97316'; // moderate negative
    return '#ef4444'; // strong negative
}

function rLabel(r: number): string {
    const abs = Math.abs(r);
    if (abs >= 0.7) return r > 0 ? 'Fuerte +' : 'Fuerte -';
    if (abs >= 0.3) return r > 0 ? 'Moderada +' : 'Moderada -';
    return 'Sin correl.';
}

type Range = '3M' | '6M' | '1Y';

const RANGE_POINTS: Record<Range, number> = { '3M': 90, '6M': 180, '1Y': 365 };

export const CorrelationHeatmap: React.FC = () => {
    const [series, setSeries] = useState<Record<string, number[]>>({});
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState<Range>('1Y');
    const [tooltip, setTooltip] = useState<{ i: number; j: number; r: number } | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const results = await Promise.allSettled(
            ASSETS.map(a => apiService.getHistorical(a.key, '1Y'))
        );
        const newSeries: Record<string, number[]> = {};
        results.forEach((res, idx) => {
            if (res.status === 'fulfilled' && res.value?.values?.length) {
                newSeries[ASSETS[idx].key] = res.value.values as number[];
            }
        });
        setSeries(newSeries);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Slice each series to the range length then take last N
    const N = RANGE_POINTS[range];
    const sliced: Record<string, number[]> = {};
    ASSETS.forEach(a => {
        const s = series[a.key] ?? [];
        sliced[a.key] = s.slice(-N);
    });

    // Build correlation matrix
    const matrix: number[][] = ASSETS.map((a, i) =>
        ASSETS.map((b, j) => {
            if (i === j) return 1;
            return pearson(sliced[a.key] ?? [], sliced[b.key] ?? []);
        })
    );

    const RANGES: Range[] = ['3M', '6M', '1Y'];

    return (
        <div className="glass-panel no-lift p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                        <Grid size={16} className="text-cyan-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Correlaciones entre Activos</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">Coeficiente de Pearson · Período: {range}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
                        {RANGES.map(r => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${range === r ? 'bg-white/15 text-white' : 'text-slate-500 hover:text-white'}`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                    <button onClick={fetchAll} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors">
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* Legend */}
                    <div className="flex items-center gap-4 text-[10px] font-bold">
                        <span className="text-slate-500 uppercase tracking-wider">Correlación:</span>
                        {[
                            { r: 1.0, label: '+1 Perfecta' },
                            { r: 0.5, label: '+0.5 Moderada' },
                            { r: 0, label: '0 Neutral' },
                            { r: -0.5, label: '-0.5 Inversa' },
                            { r: -1, label: '-1 Negativa' },
                        ].map(({ r, label }) => (
                            <span key={r} className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: rColor(r) }} />
                                <span className="text-slate-400">{label}</span>
                            </span>
                        ))}
                    </div>

                    {/* Matrix */}
                    <div className="overflow-x-auto">
                        <table className="mx-auto border-separate border-spacing-1">
                            <thead>
                                <tr>
                                    <th className="w-20" />
                                    {ASSETS.map(a => (
                                        <th key={a.key} className="text-[10px] font-bold pb-2 px-1" style={{ color: a.color }}>
                                            {a.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {ASSETS.map((a, i) => (
                                    <tr key={a.key}>
                                        <td className="text-[10px] font-bold pr-2 text-right" style={{ color: a.color }}>
                                            {a.label}
                                        </td>
                                        {ASSETS.map((b, j) => {
                                            const r = matrix[i][j];
                                            const isHovered = tooltip?.i === i && tooltip?.j === j;
                                            return (
                                                <td
                                                    key={b.key}
                                                    className="relative"
                                                    onMouseEnter={() => setTooltip({ i, j, r })}
                                                    onMouseLeave={() => setTooltip(null)}
                                                >
                                                    <div
                                                        className="w-14 h-12 md:w-16 md:h-14 rounded-lg flex flex-col items-center justify-center cursor-default transition-all text-center"
                                                        style={{
                                                            background: i === j
                                                                ? 'rgba(255,255,255,0.08)'
                                                                : `${rColor(r)}${Math.round(Math.abs(r) * 40 + 15).toString(16).padStart(2, '0')}`,
                                                            border: isHovered ? `1px solid ${rColor(r)}80` : '1px solid transparent',
                                                            transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                                                        }}
                                                    >
                                                        <span
                                                            className="font-mono font-black text-xs"
                                                            style={{ color: i === j ? '#fff' : rColor(r) }}
                                                        >
                                                            {i === j ? '—' : r > 0 ? `+${r.toFixed(2)}` : r.toFixed(2)}
                                                        </span>
                                                    </div>
                                                    {/* Tooltip */}
                                                    {isHovered && i !== j && (
                                                        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 whitespace-nowrap shadow-2xl pointer-events-none">
                                                            <div className="text-[11px] font-bold text-white">{a.label} × {b.label}</div>
                                                            <div className="text-[10px] mt-0.5" style={{ color: rColor(r) }}>
                                                                r = {r > 0 ? '+' : ''}{r.toFixed(3)} · {rLabel(r)}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-start gap-1.5 text-[10px] text-slate-600 italic">
                        <Info size={10} className="mt-0.5 shrink-0" />
                        Correlación de Pearson calculada sobre los últimos {N} puntos de datos históricos disponibles. No implica causalidad.
                    </div>
                </>
            )}
        </div>
    );
};
