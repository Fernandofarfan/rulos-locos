import React from 'react';
import { ArrowLeftRight, TrendingUp } from 'lucide-react';

interface SpreadRow {
    name: string;
    emoji: string;
    buy: number;
    sell: number;
}

interface SpreadTrackerProps {
    dolares?: {
        blue?: { compra?: number; venta?: number };
        mep?: { compra?: number; venta?: number };
        ccl?: { compra?: number; venta?: number };
        oficial?: { compra?: number; venta?: number };
        cripto?: { compra?: number; venta?: number };
    };
    loading?: boolean;
}

export const SpreadTracker: React.FC<SpreadTrackerProps> = ({ dolares, loading }) => {
    const rows: SpreadRow[] = [
        { name: 'Blue', emoji: '💎', buy: dolares?.blue?.compra ?? 0, sell: dolares?.blue?.venta ?? 0 },
        { name: 'MEP', emoji: '🏦', buy: dolares?.mep?.compra ?? 0, sell: dolares?.mep?.venta ?? 0 },
        { name: 'CCL', emoji: '🌎', buy: dolares?.ccl?.compra ?? 0, sell: dolares?.ccl?.venta ?? 0 },
        { name: 'Oficial', emoji: '🏛️', buy: dolares?.oficial?.compra ?? 0, sell: dolares?.oficial?.venta ?? 0 },
    ].filter(r => r.buy > 0 && r.sell > 0);

    const fmt = (n: number) => `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
    const spreadPct = (buy: number, sell: number) =>
        sell > 0 ? (((sell - buy) / buy) * 100).toFixed(1) : '0';
    const spreadAbs = (buy: number, sell: number) =>
        (sell - buy).toFixed(0);

    const maxSpread = Math.max(...rows.map(r => ((r.sell - r.buy) / r.buy) * 100));

    return (
        <div className="glass-panel no-lift p-5">
            <div className="flex items-center gap-2 mb-4">
                <ArrowLeftRight size={14} className="text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Spread Compra / Venta</h3>
            </div>

            {loading ? (
                <div className="animate-pulse space-y-3">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-white/5 rounded-lg" />)}
                </div>
            ) : (
                <div className="space-y-2">
                    {rows.map(r => {
                        const pct = parseFloat(spreadPct(r.buy, r.sell));
                        const abs = parseInt(spreadAbs(r.buy, r.sell));
                        const barWidth = maxSpread > 0 ? (pct / maxSpread) * 100 : 0;
                        const isWide = pct > 2;

                        return (
                            <div key={r.name} className="p-3 rounded-xl border border-white/5 bg-white/3 hover:bg-white/5 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span>{r.emoji}</span>
                                        <span className="text-xs font-bold text-slate-300">{r.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs font-mono">
                                        <span className="text-emerald-400">{fmt(r.buy)}</span>
                                        <ArrowLeftRight size={10} className="text-slate-600" />
                                        <span className="text-rose-400">{fmt(r.sell)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${isWide ? 'bg-amber-400' : 'bg-indigo-400'}`}
                                            style={{ width: `${barWidth}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] font-mono flex-shrink-0">
                                        <span className={`font-bold ${isWide ? 'text-amber-400' : 'text-indigo-300'}`}>
                                            {pct}%
                                        </span>
                                        <span className="text-slate-600">(${abs})</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <p className="text-[9px] text-slate-700 mt-3 flex items-center gap-1">
                <TrendingUp size={9} />
                Spread = diferencia entre precio de compra y venta. Mayor spread = mayor costo de conversión.
            </p>
        </div>
    );
};
