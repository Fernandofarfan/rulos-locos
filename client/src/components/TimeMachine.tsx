import React, { useState } from 'react';
import { History, ArrowRight, TrendingUp, AlertCircle, DollarSign, PiggyBank } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';

export const TimeMachine: React.FC = () => {
    const { arbitrage } = useDashboardData();
    const [amount, setAmount] = useState<number>(1000000);
    const [monthsAgo, setMonthsAgo] = useState<number>(6);

    // Current prices
    const currentBlueVenta = arbitrage?.dolares?.blue?.compra || 1180; // si quiero vender dolares hoy me pagan el precio de compra
    const currentMepVenta = arbitrage?.dolares?.mep?.venta || 1150; // simplificado: vender mep hoy

    // Mock param values based on argentine historical approximations for UX demonstration
    // En una app real de producción, estos valores se extraerían de una BD histórica exacta día por día
    const historicalData: Record<number, { blueAsK: number, mepAsk: number, tnaAvg: number }> = {
        1: { blueAsK: 1200, mepAsk: 1180, tnaAvg: 50 }, // Hace 1 mes
        3: { blueAsK: 1150, mepAsk: 1120, tnaAvg: 60 }, // Hace 3 meses
        6: { blueAsK: 1000, mepAsk: 980, tnaAvg: 80 },  // Hace 6 meses
        12: { blueAsK: 600, mepAsk: 620, tnaAvg: 110 }, // Hace 1 año
    };

    const past = historicalData[monthsAgo];

    // Cálculos
    // 1. Plazo Fijo tradicional (Interés Compuesto simplificado usando TNA promedio)
    const pfTem = (past.tnaAvg / 12) / 100;
    const pfResult = amount * Math.pow(1 + pfTem, monthsAgo);

    // 2. Comprar Dólar Blue en ese entonces y vender hoy
    const blueUSD = amount / past.blueAsK;
    const blueResult = blueUSD * currentBlueVenta;

    // 3. Comprar MEP en ese entonces y vender hoy
    const mepUSD = amount / past.mepAsk;
    const mepResult = mepUSD * currentMepVenta;

    const results = [
        { name: 'Plazo Fijo', value: pfResult, icon: PiggyBank, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { name: 'Dólar Blue', value: blueResult, icon: DollarSign, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { name: 'Dólar MEP', value: mepResult, icon: TrendingUp, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    ].sort((a, b) => b.value - a.value);

    return (
        <div className="glass-panel p-6 animate-fade-in relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-violet-500/20 rounded-xl border border-violet-500/30">
                    <History size={18} className="text-violet-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-100 tracking-tight">Time Machine <span className="text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full ml-1 uppercase tracking-wider">Backtesting</span></h3>
                    <p className="text-xs text-slate-400">¿Qué pasaba si invertías en el pasado?</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                        💰 Monto a Invertir (ARS)
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(Number(e.target.value))}
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white font-mono focus:outline-none focus:border-violet-500/50 transition-colors"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                        ⏳ Tiempo Atrás
                    </label>
                    <div className="flex gap-2">
                        {[1, 3, 6, 12].map(m => (
                            <button
                                key={m}
                                onClick={() => setMonthsAgo(m)}
                                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${monthsAgo === m ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                            >
                                {m} {m === 1 ? 'Mes' : 'Meses'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-4 relative z-10">
                <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
                    <AlertCircle size={14} /> Resultados de la simulación al día de hoy:
                </div>

                {results.map((res, idx) => (
                    <div key={res.name} className={`flex items-center justify-between p-4 rounded-2xl border ${idx === 0 ? 'bg-white/10 border-white/20' : 'bg-black/20 border-white/5'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${res.bg}`}>
                                <res.icon size={20} className={res.color} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-200">{res.name}</h4>
                                {idx === 0 && <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">🏆 Ganador</span>}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={`text-xl font-black tabular-nums tracking-tight ${idx === 0 ? 'text-white' : 'text-slate-300'}`}>
                                ${res.value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                            </div>
                            <div className={`flex items-center justify-end gap-1 text-xs font-bold ${res.value > amount ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {res.value > amount ? '+' : ''}{(((res.value - amount) / amount) * 100).toFixed(1)}% <ArrowRight size={10} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Decorative bg */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-radial from-violet-500/10 to-transparent pointer-events-none opacity-50 blur-2xl" />
        </div>
    );
};
