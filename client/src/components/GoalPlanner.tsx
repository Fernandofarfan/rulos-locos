import { useState } from 'react';
import { Target, TrendingUp, DollarSign, Calendar, ChevronRight, Calculator } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';

export const GoalPlanner: React.FC = () => {
    const { arbitrage } = useDashboardData();
    const [goalName, setGoalName] = useState('Viaje a Europa');
    const [targetUsd, setTargetUsd] = useState<number>(3000);
    const [months, setMonths] = useState<number>(12);

    const currentMep = arbitrage?.dolares?.mep?.venta || 1150;
    // Asumimos una devaluación / crawling peg modesto del 2% mensual para el ejercicio
    // En vida real, se podría atar a la expectativa del REM.
    const expectedMonthlyDevaluation = 0.02;

    // Cálculo matemático de cuotas de ahorro ajustadas
    // FV = PV * (1+r)^n
    const futureMepPrice = currentMep * Math.pow(1 + expectedMonthlyDevaluation, months);

    // Total ARS necesario al final del período
    const totalArsNeeded = targetUsd * futureMepPrice;

    // Ahorro mensual promedio requerido hoy
    const averageMonthlySavingsArs = totalArsNeeded / months;

    // Ahorro inicial (ajustando la primera cuota para que vaya en aumento con la inflamación/deval)
    // Para simplificar: mostramos el promedio y la cuota inicial proyectada
    const firstInstallmentArs = (targetUsd / months) * currentMep;
    const lastInstallmentArs = (targetUsd / months) * futureMepPrice;

    return (
        <div className="glass-panel p-6 relative overflow-hidden group">
            {/* Background embellishments */}
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                <Target size={120} />
            </div>

            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-2.5 bg-rose-500/20 rounded-xl border border-rose-500/30">
                    <Target size={18} className="text-rose-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">Planificador de Objetivos</h3>
                    <p className="text-xs text-slate-400">Proyección de ahorro ajustada por devaluación</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 relative z-10">
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        🎯 Meta
                    </label>
                    <input
                        type="text"
                        value={goalName}
                        onChange={e => setGoalName(e.target.value)}
                        className="w-full bg-transparent text-white font-bold placeholder-slate-600 focus:outline-none focus:text-rose-400 transition-colors"
                        placeholder="Ej: Auto Nuevo"
                    />
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        💵 Valor (USD)
                    </label>
                    <div className="flex items-center">
                        <DollarSign size={14} className="text-emerald-400 mr-1" />
                        <input
                            type="number"
                            value={targetUsd}
                            onChange={e => setTargetUsd(Number(e.target.value))}
                            className="w-full bg-transparent text-white font-mono font-bold focus:outline-none focus:text-emerald-400 transition-colors"
                        />
                    </div>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        ⏳ Plazo (Meses)
                    </label>
                    <div className="flex items-center">
                        <Calendar size={14} className="text-blue-400 mr-2" />
                        <input
                            type="number"
                            min="1"
                            max="120"
                            value={months}
                            onChange={e => setMonths(Number(e.target.value))}
                            className="w-full bg-transparent text-white font-mono font-bold focus:outline-none focus:text-blue-400 transition-colors"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-6 relative z-10">
                <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Calculator size={14} className="text-rose-400" />
                            <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">Plan de Ahorro</span>
                        </div>
                        <h4 className="text-2xl font-black text-white">{goalName}</h4>
                        <p className="text-sm text-slate-400 mt-1">
                            Ahorrando en pesos para llegar a los USD <span className="font-mono text-emerald-400">${targetUsd.toLocaleString()}</span> en {months} meses.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 min-w-[240px]">
                        <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/5">
                            <span className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1">Costo Estimado Final (ARS)</span>
                            <span className="text-xl font-bold font-mono text-white">
                                ${totalArsNeeded.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <div className="bg-rose-500/20 backdrop-blur-md rounded-2xl p-4 border border-rose-500/30">
                            <span className="block text-[10px] text-rose-300 uppercase tracking-widest mb-1 shadow-sm">Esfuerzo Mensual Promedio</span>
                            <span className="text-2xl font-black font-mono text-white">
                                ${averageMonthlySavingsArs.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-rose-500/20 flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                        Cuota Inicial: <strong>${firstInstallmentArs.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</strong>
                    </div>
                    <ChevronRight size={14} className="text-slate-600 hidden md:block" />
                    <div className="flex items-center gap-2 text-slate-300">
                        <div className="w-2 h-2 rounded-full bg-rose-400" />
                        Última Cuota Estimada: <strong>${lastInstallmentArs.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</strong>
                    </div>

                    <div className="w-full mt-2 flex items-center gap-1 text-[10px] text-slate-500">
                        <TrendingUp size={10} /> Proyección utilizando devaluación asimilada del {(expectedMonthlyDevaluation * 100).toFixed(1)}% mensual sobre dólar MEP.
                    </div>
                </div>
            </div>

            <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-500/5 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        </div>
    );
};
