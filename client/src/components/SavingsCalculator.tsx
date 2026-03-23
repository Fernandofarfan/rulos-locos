import React, { useState, useMemo } from 'react';
import { Calculator, TrendingUp, TrendingDown } from 'lucide-react';

interface Instrument {
    id: string;
    label: string;
    emoji: string;
    color: string;
    annualReturn: number; // % anual nominal
    description: string;
}

const INSTRUMENTS: Instrument[] = [
    { id: 'pf', label: 'Plazo Fijo', emoji: '🏦', color: 'text-blue-400', annualReturn: 110, description: 'TNA BADLAR ~110%' },
    { id: 'mep', label: 'Dólar MEP', emoji: '💵', color: 'text-emerald-400', annualReturn: 15, description: '~15% anual en USD' },
    { id: 'usdt', label: 'USDT/Cripto', emoji: '⚡', color: 'text-amber-400', annualReturn: 12, description: 'Stablecoins ~12% APY' },
    { id: 'btc', label: 'Bitcoin', emoji: '₿', color: 'text-orange-400', annualReturn: 80, description: 'Historial: ~80% anual' },
    { id: 'merval', label: 'Merval (ARS)', emoji: '📈', color: 'text-violet-400', annualReturn: 180, description: 'Promedio últimos 3 años' },
    { id: 'inflation', label: 'Inflación', emoji: '🔥', color: 'text-rose-400', annualReturn: 145, description: 'Inflación proyectada 2025' },
];

const MONTHS_OPTIONS = [3, 6, 12, 24, 36];

function project(amount: number, annualRate: number, months: number, monthly: number): number {
    const r = annualRate / 100 / 12;
    let acc = amount;
    for (let i = 0; i < months; i++) {
        acc = acc * (1 + r) + monthly;
    }
    return acc;
}

export const SavingsCalculator: React.FC = () => {
    const [amount, setAmount] = useState('1000000');
    const [monthly, setMonthly] = useState('0');
    const [months, setMonths] = useState(12);
    const [selected, setSelected] = useState<string[]>(['pf', 'mep', 'btc', 'inflation']);

    const initial = Math.max(0, parseFloat(amount.replace(/\D/g, '')) || 0);
    const monthlyDeposit = Math.max(0, parseFloat(monthly.replace(/\D/g, '')) || 0);

    const results = useMemo(() =>
        INSTRUMENTS
            .filter(i => selected.includes(i.id))
            .map(i => ({
                ...i,
                final: project(initial, i.annualReturn, months, monthlyDeposit),
                gain: project(initial, i.annualReturn, months, monthlyDeposit) - initial - monthlyDeposit * months,
            }))
            .sort((a, b) => b.final - a.final),
        [initial, monthlyDeposit, months, selected]
    );

    const inflation = INSTRUMENTS.find(i => i.id === 'inflation')!;
    const inflationFinal = project(initial, inflation.annualReturn, months, monthlyDeposit);

    const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

    return (
        <div className="glass-panel no-lift p-6">
            <div className="flex items-center gap-2 mb-5">
                <Calculator size={14} className="text-cyan-400" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Calculadora de Ahorro Proyectado</h3>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Capital inicial (ARS)</label>
                    <input
                        type="text"
                        value={new Intl.NumberFormat('es-AR').format(initial)}
                        onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-400/50 focus:bg-cyan-400/5 transition-colors"
                        placeholder="1.000.000"
                    />
                </div>
                <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Aporte mensual (ARS)</label>
                    <input
                        type="text"
                        value={new Intl.NumberFormat('es-AR').format(monthlyDeposit)}
                        onChange={e => setMonthly(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-400/50 focus:bg-cyan-400/5 transition-colors"
                        placeholder="0"
                    />
                </div>
                <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Horizonte</label>
                    <div className="flex gap-1">
                        {MONTHS_OPTIONS.map(m => (
                            <button
                                key={m}
                                onClick={() => setMonths(m)}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${months === m ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30' : 'bg-white/5 text-slate-500 hover:text-white border border-transparent'}`}
                            >
                                {m < 12 ? `${m}m` : `${m / 12}a`}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Toggle instruments */}
            <div className="flex flex-wrap gap-2 mb-5">
                {INSTRUMENTS.map(i => (
                    <button
                        key={i.id}
                        onClick={() => setSelected(prev => prev.includes(i.id) ? prev.filter(x => x !== i.id) : [...prev, i.id])}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${selected.includes(i.id) ? `${i.color} border-current bg-current/10` : 'text-slate-600 border-slate-800 bg-transparent hover:border-slate-600'}`}
                    >
                        <span>{i.emoji}</span>{i.label}
                    </button>
                ))}
            </div>

            {/* Results */}
            <div className="space-y-2">
                {results.map((r, idx) => {
                    const isInflation = r.id === 'inflation';
                    const beatsInflation = r.final > inflationFinal && !isInflation;
                    const pct = initial > 0 ? ((r.final - initial) / initial) * 100 : 0;
                    return (
                        <div key={r.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${idx === 0 && !isInflation ? 'border-white/15 bg-white/5' : 'border-white/5 bg-white/2'}`}>
                            <span className="text-xl w-7 flex-shrink-0 text-center">{r.emoji}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold ${r.color}`}>{r.label}</span>
                                    {beatsInflation && <span className="text-[8px] px-1 py-0.5 bg-emerald-400/10 text-emerald-400 rounded border border-emerald-400/20 font-bold">GANA A INFLACIÓN</span>}
                                    {idx === 0 && !isInflation && <span className="text-[8px] px-1 py-0.5 bg-amber-400/10 text-amber-400 rounded border border-amber-400/20 font-bold">⭐ MEJOR</span>}
                                </div>
                                <div className="text-[10px] text-slate-600">{r.description} · {r.annualReturn}% anual</div>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <div className="font-mono font-bold text-sm text-white">{fmt(r.final)}</div>
                                <div className={`text-[10px] font-semibold flex items-center justify-end gap-0.5 ${pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {pct >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                                    {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <p className="text-[9px] text-slate-700 mt-3 italic text-center">
                Proyección estimada. No constituye asesoramiento financiero. Tasas pueden variar.
            </p>
        </div>
    );
};
