import React, { useState, useMemo } from 'react';
import { Wallet, AlertCircle, ArrowRightLeft } from 'lucide-react';
import { calculateSalaryPower, MONTHLY_INFLATION_2024 } from '../utils/financial';
import { grossToNet } from '../utils/salary';
import { DataFreshness } from './ui/DataFreshness';

type Mode = 'poder' | 'neto';

const fmtARS = (n: number) =>
    Number.isFinite(n) ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n) : '—';

export const SalaryCalculator: React.FC = () => {
    const [mode, setMode] = useState<Mode>('poder');
    const [salary, setSalary] = useState('400000');
    const [increase, setIncrease] = useState('');
    const [months, setMonths] = useState(12);
    const [hasSalaryIncrease, setHasSI] = useState(false);
    const [conyuge, setConyuge] = useState(false);
    const [hijos, setHijos] = useState(0);

    const initial = parseFloat(salary.replace(/\D/g, '')) || 0;
    const pctInc = parseFloat(increase) || 0;

    const { realToday, purchasingPower, lostARS, cumulIPC, currentNominal } = useMemo(() => {
        return calculateSalaryPower(initial, hasSalaryIncrease ? pctInc : 0, MONTHLY_INFLATION_2024.slice(0, months));
    }, [initial, pctInc, months, hasSalaryIncrease]);

    const brutoNeto = useMemo(() => grossToNet(initial, { conyuge, hijos }), [initial, conyuge, hijos]);

    const isGaining = purchasingPower >= 100;
    const lost = 100 - purchasingPower;

    const modeButton = (id: Mode, label: string) => (
        <button
            onClick={() => setMode(id)}
            className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${mode === id ? 'bg-teal-400/15 text-teal-300 border border-teal-400/25' : 'bg-white/5 text-slate-500 border border-transparent hover:text-white'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="glass-panel no-lift p-5">
            <DataFreshness
                source={mode === 'poder' ? 'INDEC · IPC 2024' : 'ARCA · ANSES — referencia ene–jun 2026'}
                isEstimated={mode === 'neto'}
            />
            <div className="flex items-center gap-2 mb-4">
                <Wallet size={14} className="text-teal-400" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {mode === 'poder' ? 'Poder Adquisitivo Real' : 'Sueldo Bruto → Neto'}
                </h3>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-1.5 mb-4">
                {modeButton('poder', 'Poder adquisitivo')}
                {modeButton('neto', 'Bruto → Neto')}
            </div>

            {/* Salary input (compartido) */}
            <div className="space-y-3 mb-4">
                <div className={mode === 'poder' ? 'grid grid-cols-2 gap-3' : ''}>
                    {mode === 'poder' && (
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
                    )}
                    <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                            {mode === 'poder' ? 'Salario (ARS)' : 'Sueldo bruto mensual (ARS)'}
                        </label>
                        <input
                            aria-label="Salario (ARS)"
                            type="text"
                            value={new Intl.NumberFormat('es-AR').format(initial)}
                            onChange={e => setSalary(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-teal-400/40 transition-colors"
                        />
                    </div>
                </div>

                {mode === 'poder' ? (
                    /* Optional increase */
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
                ) : (
                    /* Cargas de familia para Ganancias */
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="has-conyuge"
                                checked={conyuge}
                                onChange={e => setConyuge(e.target.checked)}
                                className="accent-teal-400"
                            />
                            <label htmlFor="has-conyuge" className="text-xs text-slate-400">Cónyuge a cargo</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <label htmlFor="hijos-count" className="text-xs text-slate-400">Hijos/as</label>
                            <input
                                id="hijos-count"
                                aria-label="Cantidad de hijos"
                                type="number"
                                min={0}
                                max={10}
                                value={hijos}
                                onChange={e => setHijos(Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0)))}
                                className="w-14 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm font-mono text-white focus:outline-none focus:border-teal-400/40"
                            />
                        </div>
                    </div>
                )}
            </div>

            {mode === 'poder' ? (
                <>
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
                            { label: 'Sueldo actual', value: fmtARS(currentNominal), color: 'text-slate-300' },
                            { label: 'Necesitarías ganar', value: fmtARS(realToday), color: 'text-amber-400' },
                            { label: isGaining ? 'Ganaste poder adq.' : 'Perdiste poder adq.', value: fmtARS(Math.abs(lostARS)), color: isGaining ? 'text-emerald-400' : 'text-rose-400' },
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
                </>
            ) : (
                <>
                    {/* Neto destacado */}
                    <div className="mb-4 bg-white/3 border border-white/5 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-400">Neto estimado en mano</span>
                            <span className="text-xl font-black font-mono text-emerald-400">{fmtARS(brutoNeto.net)}</span>
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                            <span>Descuentos totales: {brutoNeto.totalDeductionRate.toFixed(1)}%</span>
                            <span>Neto antes de Ganancias: {fmtARS(brutoNeto.netBeforeTax)}</span>
                        </div>
                    </div>

                    {/* Desglose */}
                    <div className="space-y-2 text-xs">
                        {[
                            { label: 'Jubilación (11%)', value: `−${fmtARS(brutoNeto.contributions.jubilacion)}`, color: 'text-rose-400' },
                            { label: 'Obra social (3%)', value: `−${fmtARS(brutoNeto.contributions.obraSocial)}`, color: 'text-rose-400' },
                            { label: 'PAMI / Ley 19.032 (3%)', value: `−${fmtARS(brutoNeto.contributions.pami)}`, color: 'text-rose-400' },
                            { label: 'Ganancias (ret. est.)', value: `−${fmtARS(brutoNeto.monthlyTax)}`, color: brutoNeto.monthlyTax > 0 ? 'text-amber-400' : 'text-slate-500' },
                            { label: 'Bruto mensual', value: fmtARS(brutoNeto.gross), color: 'text-slate-300' },
                        ].map(r => (
                            <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                                <span className="text-slate-500">{r.label}</span>
                                <span className={`font-mono font-bold ${r.color}`}>{r.value}</span>
                            </div>
                        ))}
                    </div>

                    {brutoNeto.contributions.base < initial && initial > 0 && (
                        <div className="flex items-center gap-2 mt-3 p-2.5 bg-teal-400/5 border border-teal-400/15 rounded-lg text-[10px] text-teal-300">
                            <ArrowRightLeft size={11} className="flex-shrink-0" />
                            <span>Los aportes se calculan sobre la base topeada de {fmtARS(brutoNeto.contributions.base)}.</span>
                        </div>
                    )}

                    <p className="text-[9px] text-slate-700 mt-3">
                        Estimación simplificada con valores de referencia ene–jun 2026 (ARCA/ANSES): aportes 17% con tope,
                        Ganancias 4ta categoría con deducciones personales y escala art. 94, aguinaldo prorrateado.
                        No incluye sindicato, adicionales por convenio ni otras deducciones opcionales.
                    </p>
                </>
            )}
        </div>
    );
};
