import React, { useState, useEffect, useCallback } from 'react';
import { Zap, TrendingUp, RefreshCw, ArrowRight, AlertCircle, Shield, CheckCircle } from 'lucide-react';
import { apiService } from '../services/api';

interface BestRulo {
    score: number;
    tipo: string;
    descripcion: string;
    pasos: string[];
    rentabilidadNeta: number;
    capital: number;
    gananciaEstimada: number;
    riesgo: 'BAJO' | 'MEDIO' | 'ALTO';
    tiempo: string;
}

const RIESGO_COLOR: Record<string, string> = {
    BAJO: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    MEDIO: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    ALTO: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
};

const RIESGO_ICON: Record<string, React.ReactNode> = {
    BAJO: <CheckCircle size={12} />,
    MEDIO: <Shield size={12} />,
    ALTO: <AlertCircle size={12} />,
};

export const RuloScanner: React.FC = () => {
    const [rulo, setRulo] = useState<BestRulo | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    const fetchBestRulo = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiService.get<BestRulo>('/arbitrage/best-rulo');
            if (data) {
                setRulo(data);
                setLastUpdate(new Date());
            }
        } catch (e) {
            console.error('RuloScanner error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBestRulo();
        const iv = setInterval(fetchBestRulo, 60_000);
        return () => clearInterval(iv);
    }, [fetchBestRulo]);

    if (loading) {
        return (
            <div className="glass-panel p-5 animate-pulse">
                <div className="h-5 w-48 bg-white/10 rounded mb-3" />
                <div className="h-3 w-32 bg-white/5 rounded mb-2" />
                <div className="h-16 bg-white/5 rounded-xl" />
            </div>
        );
    }

    if (!rulo) return null;

    const scoreColor = rulo.score >= 70 ? 'text-emerald-400' : rulo.score >= 40 ? 'text-amber-400' : 'text-rose-400';
    const scoreBg = rulo.score >= 70 ? 'from-emerald-500/10' : rulo.score >= 40 ? 'from-amber-500/10' : 'from-rose-500/10';

    return (
        <div className={`glass-panel p-5 border border-white/5 bg-gradient-to-br ${scoreBg} to-transparent relative overflow-hidden`}>
            {/* Glow accent */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl pointer-events-none bg-yellow-500/5" />

            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                        <Zap size={16} className="text-yellow-400" />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest">Mejor Rulo Ahora</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">Oportunidad óptima en tiempo real</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Score */}
                    <div className="text-right">
                        <div className={`text-2xl font-black font-mono ${scoreColor}`}>{rulo.score}</div>
                        <div className="text-[9px] text-slate-500 uppercase tracking-wider">Score</div>
                    </div>
                    <button
                        onClick={fetchBestRulo}
                        className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors ml-1"
                    >
                        <RefreshCw size={12} />
                    </button>
                </div>
            </div>

            {/* Tipo + Riesgo */}
            <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-white">{rulo.tipo}</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${RIESGO_COLOR[rulo.riesgo]}`}>
                    {RIESGO_ICON[rulo.riesgo]}
                    {rulo.riesgo}
                </span>
                <span className="text-[10px] text-slate-500 ml-auto">{rulo.tiempo}</span>
            </div>

            {/* Pasos */}
            <div className="flex items-center gap-1 flex-wrap mb-4">
                {rulo.pasos.map((paso, i) => (
                    <React.Fragment key={i}>
                        <span className="text-[11px] font-bold text-slate-300 bg-white/5 px-2 py-0.5 rounded-lg border border-white/8">
                            {paso}
                        </span>
                        {i < rulo.pasos.length - 1 && <ArrowRight size={10} className="text-slate-600 shrink-0" />}
                    </React.Fragment>
                ))}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
                <div className="text-center bg-white/5 rounded-xl p-2.5 border border-white/5">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Rentab. Neta</div>
                    <div className={`text-base font-black font-mono ${rulo.rentabilidadNeta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {rulo.rentabilidadNeta > 0 ? '+' : ''}{rulo.rentabilidadNeta.toFixed(2)}%
                    </div>
                </div>
                <div className="text-center bg-white/5 rounded-xl p-2.5 border border-white/5">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Capital Mín.</div>
                    <div className="text-base font-black font-mono text-white">
                        ${rulo.capital.toLocaleString('es-AR')}
                    </div>
                </div>
                <div className="text-center bg-white/5 rounded-xl p-2.5 border border-white/5">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Ganancia Est.</div>
                    <div className="text-base font-black font-mono text-emerald-400">
                        +${rulo.gananciaEstimada.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                    </div>
                </div>
            </div>

            {lastUpdate && (
                <p className="text-[9px] text-slate-600 mt-3 text-right">
                    <TrendingUp size={9} className="inline mr-1" />
                    Actualizado {lastUpdate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </p>
            )}
        </div>
    );
};
