import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, RefreshCw, TrendingUp } from 'lucide-react';
import { apiService } from '../services/api';

export const RuloDelDia: React.FC = () => {
    const [rulo, setRulo] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [cached, setCached] = useState(false);

    const fetchRuloDelDia = async () => {
        setLoading(true);
        try {
            const data = await apiService.get<{ rulo: string; cached: boolean }>('/ai/rulo-del-dia');
            if (data?.rulo) {
                setRulo(data.rulo);
                setCached(data.cached ?? false);
            }
        } catch {
            setRulo('No se pudo generar el Rulo del Día. Verificá tu conexión.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRuloDelDia();
    }, []);

    return (
        <div className="glass-panel p-5 border border-indigo-500/10 bg-gradient-to-br from-indigo-500/5 to-transparent relative overflow-hidden">
            {/* Decorative glow */}
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <Bot size={16} className="text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                            Rulo del Día
                            <Sparkles size={10} className="text-indigo-400" />
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">Análisis IA · actualizado cada hora</p>
                    </div>
                </div>
                <button
                    onClick={fetchRuloDelDia}
                    disabled={loading}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors disabled:opacity-40"
                >
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="relative">
                {loading ? (
                    <div className="space-y-2">
                        <div className="h-3 bg-white/5 rounded animate-pulse w-full" />
                        <div className="h-3 bg-white/5 rounded animate-pulse w-5/6" />
                        <div className="h-3 bg-white/5 rounded animate-pulse w-4/6" />
                    </div>
                ) : (
                    <p className="text-sm text-slate-200 leading-relaxed font-medium">
                        {rulo}
                    </p>
                )}
            </div>

            {!loading && (
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/5">
                    <TrendingUp size={9} className="text-indigo-400" />
                    <span className="text-[9px] text-slate-600">
                        {cached ? 'Análisis en caché · ' : 'Análisis fresco · '}
                        Rulo Bot by Gemini
                    </span>
                </div>
            )}
        </div>
    );
};
