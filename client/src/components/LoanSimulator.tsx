import React, { useState } from 'react';
import { PiggyBank, Landmark, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';
import { formatInt } from '../utils/formatARS';

export const LoanSimulator: React.FC = () => {
    const { economics } = useDashboardData();
    const [amount, setAmount] = useState<number | ''>(1000000); // 1 Millón
    const [months, setMonths] = useState<number>(12);
    const [loanTNA, setLoanTNA] = useState<number | ''>(85); // 85% TNA préstamo

    // Tasa Badlar actual (Plazo Fijo aproximado)
    const pfTNA = (economics?.macro as any)?.badlar || 35; // Default 35% si falla la API

    const numAmount = Number(amount) || 0;
    const numLoanTNA = Number(loanTNA) || 0;

    // TEA Plazo Fijo (reinversión mensual)
    const monthlyPFRate = pfTNA / 12 / 100;

    // Costo del préstamo (Aproximación simple sistema francés sin considerar seguros)
    // Cuota mensual = P * (r * (1 + r)^n) / ((1 + r)^n - 1)
    const monthlyLoanRate = numLoanTNA / 12 / 100;

    let monthlyInstallment = 0;
    if (monthlyLoanRate > 0 && months > 0) {
        monthlyInstallment = numAmount * (monthlyLoanRate * Math.pow(1 + monthlyLoanRate, months)) / (Math.pow(1 + monthlyLoanRate, months) - 1);
    } else if (months > 0) {
        monthlyInstallment = numAmount / months;
    }

    const totalPaid = monthlyInstallment * months;
    const totalInterestsPaid = totalPaid - numAmount;

    // Rendimiento Plazo Fijo acumulado en ese tiempo
    const pfReturnAtMaturity = numAmount * Math.pow(1 + monthlyPFRate, months);
    const totalInterestsEarned = pfReturnAtMaturity - numAmount;

    const isLicuating = totalInterestsEarned > totalInterestsPaid;

    return (
        <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50 flex flex-col h-full relative overflow-hidden">
            {/* Background Accent */}
            <div className={`absolute -right-20 -top-20 w-40 h-40 blur-3xl opacity-10 rounded-full pointer-events-none transition-colors ${isLicuating ? 'bg-emerald-500' : 'bg-red-500'}`}></div>

            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
                    <Landmark size={20} />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-100">Préstamo vs Plazo Fijo</h3>
                    <p className="text-xs text-slate-400">¿Conviene sacar el crédito e invertir la plata?</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                <div>
                    <label className="text-xs text-slate-400 font-medium mb-1.5 block">Monto a Pedir ($)</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400 font-medium mb-1.5 block">Plazo (Meses)</label>
                    <select
                        value={months}
                        onChange={e => setMonths(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                    >
                        <option value={3}>3 meses</option>
                        <option value={6}>6 meses</option>
                        <option value={12}>12 meses</option>
                        <option value={24}>24 meses</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs text-slate-400 font-medium mb-1.5 block">TNA del Préstamo (%)</label>
                    <input
                        type="number"
                        value={loanTNA}
                        onChange={e => setLoanTNA(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400 font-medium mb-1.5 block">TNA Plazo Fijo (%) <Info size={10} className="inline opacity-50 ml-1" /></label>
                    <div className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-300 text-sm cursor-not-allowed flex justify-between items-center">
                        <span>{pfTNA.toFixed(1)}%</span>
                        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">AUTO</span>
                    </div>
                </div>
            </div>

            {numAmount > 0 && numLoanTNA > 0 && (
                <div className="space-y-4 relative z-10">
                    <div className="grid grid-cols-2 gap-3">
                        {/* Tarjeta Préstamo */}
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <AlertTriangle size={12} /> Costo Préstamo
                            </div>
                            <div className="mb-1">
                                <span className="text-xs text-slate-400">Cuota:</span>
                                <span className="float-right text-sm font-bold text-white">{formatInt(monthlyInstallment)}</span>
                            </div>
                            <div className="pt-2 border-t border-red-500/20 mt-2">
                                <span className="text-xs text-slate-400">Total a pagar:</span>
                                <span className="block text-lg font-bold text-red-300 mt-0.5">{formatInt(totalPaid)}</span>
                            </div>
                        </div>

                        {/* Tarjeta Inversión */}
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2 flex flex-row items-center gap-1.5">
                                <PiggyBank size={12} /> Rinde Plazo Fijo
                            </div>
                            <div className="mb-1">
                                <span className="text-xs text-slate-400">Interés G.:</span>
                                <span className="float-right text-sm font-bold text-white">+{formatInt(totalInterestsEarned)}</span>
                            </div>
                            <div className="pt-2 border-t border-emerald-500/20 mt-2">
                                <span className="text-xs text-slate-400">Total al final:</span>
                                <span className="block text-lg font-bold text-emerald-300 mt-0.5">{formatInt(pfReturnAtMaturity)}</span>
                            </div>
                        </div>
                    </div>

                    <div className={`p-4 rounded-xl flex items-center justify-between border ${isLicuating ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-red-500/20 border-red-500/40'}`}>
                        <div>
                            <span className="flex items-center gap-2 font-bold text-sm mb-1">
                                {isLicuating ? <TrendingUp size={16} className="text-emerald-400" /> : <AlertTriangle size={16} className="text-red-400" />}
                                {isLicuating ? '¡Conviene sacar el préstamo!' : 'No conviene sacar el préstamo'}
                            </span>
                            <span className="text-xs opacity-80">
                                {isLicuating
                                    ? `La inversión paga las cuotas y te sobran ${formatInt(totalInterestsEarned - totalInterestsPaid)} al final del plazo.`
                                    : `Terminás perdiendo ${formatInt(totalInterestsPaid - totalInterestsEarned)} si invertís la plata.`}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {!numAmount && (
                <div className="mt-auto p-4 bg-slate-800/80 rounded-xl text-center text-sm text-slate-500">
                    Ingresá los datos del préstamo para ver la simulación.
                </div>
            )}
        </div>
    );
};
