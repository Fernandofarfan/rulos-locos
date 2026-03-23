import React from 'react';
import { DollarSign, Star } from 'lucide-react';

interface Platform {
    name: string;
    ask: number;
    icon: string;
}

interface PlatformListProps {
    platforms: Platform[];
    loading?: boolean;
}

export const PlatformList: React.FC<PlatformListProps> = ({ platforms = [], loading }) => {
    return (
        <div className="glass-panel p-0 flex flex-col overflow-hidden relative">
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-3">
                        <div className="p-2 bg-success/10 rounded-lg border border-success/20 shadow-[0_0_15px_-5px_var(--success)]">
                            <DollarSign size={20} className="text-success" />
                        </div>
                        Cotizaciones
                    </h3>
                </div>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                    [1, 2, 3, 4].map(i => (
                        <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse"></div>
                    ))
                ) : (platforms || []).map((p, idx) => (
                    <div key={idx} className={`relative p-4 rounded-2xl flex items-center justify-between border transition-all duration-300 group hover:-translate-y-0.5 hover:shadow-lg ${idx === 0
                            ? 'bg-accent-primary/10 border-accent-primary/30 shadow-[0_0_20px_-5px_var(--accent-primary)]'
                            : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
                        }`}>
                        <div className="flex items-center gap-4">
                            <span className="text-2xl filter drop-shadow-md group-hover:scale-110 transition-transform duration-300">{p.icon}</span>
                            <div>
                                <div className="text-sm font-bold text-white leading-none mb-1.5 flex items-center gap-2">
                                    {p.name}
                                    {idx === 0 && <Star size={12} className="text-yellow-400 fill-yellow-400 animate-pulse-soft" />}
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Venta USD</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-black text-white tracking-tight">$ {p.ask.toLocaleString('es-AR')}</div>
                            {idx === 0 && (
                                <div className="text-[9px] text-accent-primary font-bold uppercase mt-1 px-2 py-0.5 bg-accent-primary/10 rounded-full inline-block">
                                    Mejor Precio
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
