import React, { useState, useMemo } from 'react';
import { Wand2, TrendingUp, TrendingDown, AlertTriangle, Download } from 'lucide-react';
import { useExportCSV } from '../hooks/useExportCSV';

interface Scenario {
    id: string;
    label: string;
    emoji: string;
    // Annualized return for the period (simplified historical)
    // Based on approximate 2024 performance
    annualReturn: number;
    color: string;
    risk: 'bajo' | 'medio' | 'alto' | 'muy alto';
}

const SCENARIOS: Scenario[] = [
    { id: 'pf', label: 'Plazo Fijo', emoji: '🏦', annualReturn: 118, color: 'text-blue-400', risk: 'bajo' },
    { id: 'mep', label: 'Dólar MEP', emoji: '💵', annualReturn: 22, color: 'text-emerald-400', risk: 'bajo' },
    { id: 'btc', label: 'Bitcoin', emoji: '₿', annualReturn: 150, color: 'text-orange-400', risk: 'muy alto' },
    { id: 'eth', label: 'Ethereum', emoji: 'Ξ', annualReturn: 60, color: 'text-violet-400', risk: 'muy alto' },
    { id: 'merval', label: 'Merval (ARS)', emoji: '📈', annualReturn: 195, color: 'text-pink-400', risk: 'alto' },
    { id: 'cedear', label: 'CEDEARs (AAPL)', emoji: '📊', annualReturn: 85, color: 'text-sky-400', risk: 'medio' },
    { id: 'oro', label: 'Oro (USD)', emoji: '🥇', annualReturn: 28, color: 'text-yellow-400', risk: 'bajo' },
    { id: 'inflacion', label: 'Inflación (ARS)', emoji: '🔥', annualReturn: 145, color: 'text-rose-400', risk: 'bajo' },
];

const MONTHS_BACK_OPTIONS = [
    { label: '3 meses', months: 3 },
    { label: '6 meses', months: 6 },
    { label: '1 año', months: 12 },
    { label: '2 años', months: 24 },
    { label: '3 años', months: 36 },
];

const RISK_COLOR = {
    'bajo': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    'medio': 'text-amber-400   bg-amber-400/10   border-amber-400/20',
    'alto': 'text-orange-400  bg-orange-400/10  border-orange-400/20',
    'muy alto': 'text-rose-400    bg-rose-400/10    border-rose-400/20',
};

function compoundGrowth(initial: number, annualReturn: number, months: number): number {
    const monthly = annualReturn / 100 / 12;
    return initial * Math.pow(1 + monthly, months);
}

export const WhatIfSimulator: React.FC = () => {
    const { exportToCSV } = useExportCSV();
    const [amount, setAmount] = useState('1000000');
    const [months, setMonths] = useState(12);
    const [selected, setSelected] = useState<string[]>(['pf', 'mep', 'btc', 'merval', 'inflacion']);

    const initial = parseFloat(amount.replace(/\D/g, '')) || 0;

    const results = useMemo(() =>
        SCENARIOS
            .filter(s => selected.includes(s.id))
            .map(s => ({
                ...s,
                final: compoundGrowth(initial, s.annualReturn, months),
                gain: compoundGrowth(initial, s.annualReturn, months) - initial,
                pct: ((compoundGrowth(initial, s.annualReturn, months) - initial) / (initial || 1)) * 100,
            }))
            .sort((a, b) => b.final - a.final),
        [initial, months, selected]
    );

    const inflationResult = results.find(r => r.id === 'inflacion');
    const fmt = (n: number) =>
        new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

    const maxFinal = Math.max(...results.map(r => r.final));

    return (
        <div className="glass-panel no-lift p-6">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <Wand2 size={14} className="text-purple-400" />
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">¿Si Hubiese Invertido...?</h3>
                    <span className="text-[9px] bg-purple-400/10 text-purple-300 border border-purple-400/20 px-1.5 py-0.5 rounded font-bold">SIMULADOR HISTÓRICO</span>
                </div>
                <button
                    onClick={() => exportToCSV(results.map(r => ({
                        Instrumento: r.label,
                        Final_ARS: parseFloat(r.final.toFixed(2)),
                        Ganancia_ARS: parseFloat(r.gain.toFixed(2)),
                        Variacion_Pct: parseFloat(r.pct.toFixed(2)),
                        Riesgo: r.risk
                    })), `rulos-simulador-${months}m`)}
                    title="Exportar Resultados"
                    className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                    <Download size={14} />
                </button>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Si hubiese invertido (ARS)</label>
                    <input
                        type="text"
                        value={new Intl.NumberFormat('es-AR').format(initial)}
                        onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-purple-400/40 transition-colors"
                    />
                </div>
                <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Hace...</label>
                    <div className="flex gap-1">
                        {MONTHS_BACK_OPTIONS.map(o => (
                            <button
                                key={o.months}
                                onClick={() => setMonths(o.months)}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${months === o.months ? 'bg-purple-400/15 text-purple-300 border border-purple-400/25' : 'bg-white/5 text-slate-500 hover:text-white border border-transparent'}`}
                            >
                                {o.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Toggle instruments */}
            <div className="flex flex-wrap gap-1.5 mb-5">
                {SCENARIOS.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setSelected(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border transition-all ${selected.includes(s.id) ? `${s.color} border-current bg-current/10 opacity-100` : 'text-slate-600 border-slate-800 opacity-50'}`}
                    >
                        {s.emoji} {s.label}
                    </button>
                ))}
            </div>

            {/* Results */}
            <div className="space-y-2">
                {results.map((r, idx) => {
                    const isInfl = r.id === 'inflacion';
                    const beatsInfl = inflationResult ? r.final > inflationResult.final && !isInfl : false;
                    const barW = maxFinal > 0 ? (r.final / maxFinal) * 100 : 0;

                    return (
                        <div key={r.id} className={`p-3 rounded-xl border transition-all ${idx === 0 && !isInfl ? 'border-white/15 bg-white/5' : 'border-white/5 bg-white/2'}`}>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-base">{r.emoji}</span>
                                <div className="flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-xs font-bold ${r.color}`}>{r.label}</span>
                                        <span className={`text-[8px] px-1 py-0.5 rounded border font-bold ${RISK_COLOR[r.risk]}`}>
                                            riesgo {r.risk}
                                        </span>
                                        {beatsInfl && <span className="text-[8px] px-1 py-0.5 bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 rounded font-bold">✓ GANÓ</span>}
                                        {idx === 0 && !isInfl && <span className="text-[8px] px-1 py-0.5 bg-amber-400/10 border border-amber-400/20 text-amber-300 rounded font-bold">⭐ MEJOR</span>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono font-bold text-sm text-white">{fmt(r.final)}</div>
                                    <div className={`text-[10px] flex items-center justify-end gap-0.5 ${r.pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {r.pct >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                                        {r.pct >= 0 ? '+' : ''}{r.pct.toFixed(0)}%
                                    </div>
                                </div>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${barW}%`, backgroundColor: `currentColor` }}
                                // hack: use inline bg color via CSS var
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center gap-1 mt-3 text-[9px] text-slate-700">
                <AlertTriangle size={9} />
                Rendimientos basados en promedios históricos. No garantizan resultados futuros.
            </div>
        </div>
    );
};
