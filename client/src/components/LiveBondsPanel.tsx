import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { apiService } from '../services/api';
import { logger } from '../utils/logger';

export const LiveBondsPanel: React.FC = () => {
    const [bonds, setBonds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBonds = async () => {
        try {
            const data = await apiService.getBondsLive();
            setBonds(data);
        } catch (error) {
            logger.error('Error fetching live bonds:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBonds();
        const interval = setInterval(fetchBonds, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    if (loading && bonds.length === 0) {
        return (
            <div className="bg-black/20 rounded-xl p-4 border border-white/5 animate-pulse min-h-[150px] flex items-center justify-center">
                <RefreshCw className="animate-spin text-slate-500" size={20} />
            </div>
        );
    }

    if (bonds.length === 0) return null;

    return (
        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
            <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-2">
                    <Activity size={12} className="text-accent-primary" /> Bonos Soberanos (Tiempo Real)
                </span>
                <span className="text-[9px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">LIVE</span>
            </h4>

            <div className="space-y-2">
                {bonds.map((bond: any) => (
                    <div key={bond.ticker} className="flex justify-between items-center text-sm border-b border-white/5 pb-1 last:border-0 hover:bg-white/5 px-2 py-1 rounded transition-colors group cursor-default">
                        <div>
                            <span className="font-bold text-slate-300">{bond.ticker}</span>
                            <span className="text-[10px] text-slate-500 block">{bond.description.substring(0, 18)}...</span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                            <div className="flex gap-3">
                                <span className="font-mono text-white text-xs">${bond.priceARS.toFixed(2)}</span>
                                <span className="font-mono text-slate-400 text-xs">US${bond.priceUSD.toFixed(2)}</span>
                            </div>
                            <div className="flex gap-3 text-[10px]">
                                <span className="text-slate-500">Paridad: <span className="text-slate-300 font-bold">{bond.parity}%</span></span>
                                <span className="text-slate-500">TIR: <span className="text-slate-300 font-bold">{bond.tir}%</span></span>
                                <span className={`font-mono font-bold w-12 text-right ${bond.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {bond.change > 0 ? '+' : ''}{bond.change.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
