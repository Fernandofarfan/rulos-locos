import React, { useState, useMemo } from 'react';
import { Wallet, AlertCircle } from 'lucide-react';
import { calculateSalaryPower, MONTHLY_INFLATION_2024 } from '../utils/financial';
import { DataFreshness } from './ui/DataFreshness';

export const SalaryCalculator: React.FC = () => {
    const [salary, setSalary] = useState('400000');
    const [increase, setIncrease] = useState('');
    const [months, setMonths] = useState(12);
    const [hasSalaryIncrease, setHasSI] = useState(false);

    const initial = parseFloat(salary.replace(/\D/g, '')) || 0;
    const pctInc = parseFloat(increase) || 0;

    const { realToday, purchasingPower, lostARS, cumulIPC, currentNominal } = useMemo(() => {
        return calculateSalaryPower(initial, hasSalaryIncrease ? pctInc : 0, MONTHLY_INFLATION_2024.slice(0, months));
    }, [initial, pctInc, months, hasSalaryIncrease]);

    const fmt = (n: number) =>
        Number.isFinite(n) ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n) : '—';

    const isGaining = purchasingPower >= 100;
    const lost = 100 - purchasingPower;

    return (
        <div className="glass-panel no-lift p-5">
            <DataFreshness source="INDEC · IPC 2024" isEstimated={false} />
            <div className="flex items-center gap-2 mb-4">
                <Wallet size={14} className="text-teal-400" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Poder Adquisitivo Real</h3>
            </div>

            {/* Inputs */}
            <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Sueldo de hace...</label>
                        <div className="flex gap-1 flex-wrap">
                            {[3, 6, 9, 12].map(m => (
                                <button
                                    key={m}
                                    onClick={() => setMonths(m)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${months === m ? 'bg-teal-400/15 text-teal-300 border border-teal-400/25' : 'bg-white/5 text-slate-500 border border-transparent hover:text-white'}`}
                                >
                                    {m}m
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Salario (ARS)</label>
                        <input
                            aria-label="Salario (ARS)"
                            type="text"
                            value={new Intl.NumberFormat('es-AR').format(initial)}
                            onChange={e => setSalary(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-teal-400/40 transition-colors"
                        />
                    </div>
                </div>

                {/* Optional increase */}
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="has-increase"
                        checked={hasSalaryIncrease}
                        onChange={e => setHasSI(e.target.checked)}
                        className="accent-teal-400"
                    />
                    <label htmlFor="has-increase" className="text-xs text-slate-400">Recibí aumento del</label>
                    {hasSalaryIncrease && (
                        <>
                            <input
                                aria-label="Aumento salarial (%)"
                                type="number"
                                value={increase}
                                onChange={e => setIncrease(e.target.value)}
                                placeholder="75"
                                className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm font-mono text-white focus:outline-none focus:border-teal-400/40"
                            />
                            <span className="text-xs text-slate-500">%</span>
                        </>
                    )}
                </div>
            </div>

            {/* Gauge */}
            <div className="mb-4 bg-white/3 border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">Poder adquisitivo conservado</span>
                    <span className={`text-xl font-black font-mono ${isGaining ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {purchasingPower.toFixed(1)}%
                    </span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${isGaining ? 'bg-emerald-400' : purchasingPower > 70 ? 'bg-amber-400' : 'bg-rose-400'}`}
                        style={{ width: `${Math.min(purchasingPower, 100)}%` }}
                    />
                </div>
                <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                    <span>0%</span>
                    <span>Neutro</span>
                    <span>100%</span>
                </div>
            </div>

            {/* Results */}
            <div className="space-y-2 text-xs">
                {[
                    { label: 'Inflación acumulada', value: `${cumulIPC.toFixed(1)}%`, color: 'text-rose-400' },
                    { label: 'Sueldo actual', value: fmt(currentNominal), color: 'text-slate-300' },
                    { label: 'Necesitarías ganar', value: fmt(realToday), color: 'text-amber-400' },
                    { label: isGaining ? 'Ganaste poder adq.' : 'Perdiste poder adq.', value: fmt(Math.abs(lostARS)), color: isGaining ? 'text-emerald-400' : 'text-rose-400' },
                ].map(r => (
                    <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                        <span className="text-slate-500">{r.label}</span>
                        <span className={`font-mono font-bold ${r.color}`}>{r.value}</span>
                    </div>
                ))}
            </div>

            {!isGaining && (
                <div className="flex items-center gap-2 mt-3 p-2.5 bg-rose-400/5 border border-rose-400/15 rounded-lg text-[10px] text-rose-300">
                    <AlertCircle size={11} className="flex-shrink-0" />
                    <span>Tu salario perdió <strong>{lost.toFixed(1)}%</strong> de poder de compra real en los últimos {months} meses.</span>
                </div>
            )}

            <p className="text-[9px] text-slate-700 mt-3">IPC mensual 2024 según datos INDEC publicados.</p>
        </div>
    );
};
