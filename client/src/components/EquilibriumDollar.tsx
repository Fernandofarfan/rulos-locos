import React, { useEffect, useState } from 'react';
import { Shield, ArrowRight, AlertTriangle, TrendingUp } from 'lucide-react';
import { apiService } from '../services/api';

interface EquilibriumData {
    theoretical: number;
    reserves: number;
    baseMonetaria: number;
    timestamp: string;
}

export const EquilibriumDollar: React.FC = () => {
    const [data, setData] = useState<EquilibriumData | null>(null);
    const [marketPrice, setMarketPrice] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [eqData, arbitrage] = await Promise.all([
                    apiService.getEquilibriumDollar(),
                    apiService.getArbitrage()
                ]);
                setData(eqData);
                // Usar precio Blue o MEP como referencia real del mercado
                const blue = arbitrage?.dolares?.blue?.venta || arbitrage?.dolares?.mep?.venta || 1100;
                setMarketPrice(blue);
            } catch (e) {
                console.error('EquilibriumDollar fetch error:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading || !data) {
        return (
            <div className="glass-panel p-6 animate-pulse">
                <div className="h-4 w-40 bg-white/10 rounded mb-4" />
                <div className="h-24 bg-white/5 rounded-xl" />
            </div>
        );
    }

    const gap = ((marketPrice / data.theoretical) - 1) * 100;
    const isUndervalued = marketPrice < data.theoretical; // "Regalado"
    const isOvervalued = marketPrice > data.theoretical * 1.1; // "Caro"

    return (
        <div className="glass-panel p-6 border-amber-500/10">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                    <Shield size={18} className="text-amber-400" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Dólar de Equilibrio</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                        Ratio de Convertibilidad Teórica (Pasivos / Reservas)
                    </p>
                </div>
            </div>

            {/* Main Ratio Display */}
            <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
                <div className="flex-1 text-center md:text-left">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Dólar Teórico</div>
                    <div className="text-5xl font-black text-white font-mono tracking-tighter">
                        ${data.theoretical.toLocaleString()}
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-1.5 mt-2">
                        <span className="text-[10px] text-slate-400 font-bold">VS MERCADO:</span>
                        <span className={`text-xs font-black font-mono ${gap < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ${marketPrice.toLocaleString()} ({gap > 0 ? '+' : ''}{gap.toFixed(1)}%)
                        </span>
                    </div>
                </div>

                <div className="hidden md:block">
                    <ArrowRight className="text-slate-700" size={32} />
                </div>

                <div className="flex-1 w-full">
                    <div className={`p-4 rounded-2xl border ${isUndervalued ? 'bg-emerald-500/10 border-emerald-500/20' : isOvervalued ? 'bg-rose-500/10 border-rose-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            {isUndervalued ? <TrendingUp size={16} className="text-emerald-400" /> : <AlertTriangle size={16} className="text-amber-400" />}
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white">Status de Cobertura</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            {isUndervalued
                                ? "El dólar de mercado está por debajo de su paridad técnica. Indica un posible atraso cambiario o fuerte confianza en el programa actual."
                                : isOvervalued
                                    ? "El precio actual tiene un 'over-shooting' importante sobre el ratio técnico. Históricamente estos gaps tienden a cerrarse."
                                    : "El precio de mercado está alineado con los fundamentos monetarios históricos."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Components Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                    <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Pasivos Totales (ARS)</div>
                    <div className="text-base font-black font-mono text-white">
                        ${(data.baseMonetaria / 1e12).toFixed(1)} <span className="text-[10px] font-normal text-slate-500">Billones</span>
                    </div>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                    <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Reservas Netas (USD)</div>
                    <div className="text-base font-black font-mono text-white">
                        ${(data.reserves / 1000).toFixed(1)} <span className="text-[10px] font-normal text-slate-500">Mil Millones</span>
                    </div>
                </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/5 text-[10px] text-slate-600 italic">
                * El Dólar de Equilibrio es una métrica teórica que asume que todos los pasivos monetarios del BCRA deberían estar cubiertos por reservas líquidas. Es un indicador de 'techo' histórico, no un predictor de corto plazo.
            </div>
        </div>
    );
};
