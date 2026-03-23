import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Clock, RefreshCw } from 'lucide-react';
import { apiService } from '../services/api';

interface RofexContract {
    symbol: string;
    label: string;
    expiryDate: string;
    settlement: number;
    impliedRate: number;
    change: number;
    openInterest?: number;
}

export const ROFEXPanel: React.FC = () => {
    const [contracts, setContracts] = useState<RofexContract[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const data = await apiService.getRofexContracts();
            setContracts(data);
        } catch (err) {
            console.error('Error fetching ROFEX data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60_000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="bg-black/20 rounded-xl p-4 border border-white/5 min-h-[180px] flex items-center justify-center animate-pulse">
                <RefreshCw className="animate-spin text-slate-500" size={20} />
            </div>
        );
    }

    return (
        <div className="glass-panel no-lift p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-violet-400" />
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Futuros Dólar (ROFEX)</h3>
                </div>
                <span className="text-[9px] text-violet-400 bg-violet-400/10 px-1.5 py-0.5 rounded border border-violet-400/20">
                    ROFEX · MatbaRofex
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-slate-500 border-b border-white/5">
                            <th className="text-left py-2 pr-4">Contrato</th>
                            <th className="text-right py-2 pr-4">Vencimt.</th>
                            <th className="text-right py-2 pr-4">Ajuste</th>
                            <th className="text-right py-2 pr-4">Tasa impl.</th>
                            <th className="text-right py-2">Variación</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {contracts.map(c => {
                            const isPos = c.change >= 0;
                            return (
                                <tr key={c.symbol} className="hover:bg-white/5 transition-colors">
                                    <td className="py-2 pr-4 font-bold text-slate-200">{c.label}</td>
                                    <td className="py-2 pr-4 text-right text-slate-400 flex items-center justify-end gap-1">
                                        <Clock size={9} className="opacity-50" />
                                        {c.expiryDate}
                                    </td>
                                    <td className="py-2 pr-4 text-right font-mono text-white">
                                        ${c.settlement.toFixed(2)}
                                    </td>
                                    <td className="py-2 pr-4 text-right">
                                        <span className="text-violet-300 font-bold">{c.impliedRate}%</span>
                                        <span className="text-slate-600 ml-1">TNA</span>
                                    </td>
                                    <td className="py-2 text-right">
                                        <span className={`flex items-center justify-end gap-1 font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {isPos ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                                            {isPos ? '+' : ''}{c.change.toFixed(2)}%
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <p className="text-[9px] text-slate-700 mt-3 text-right">
                Tasas implícitas basadas en precios de mercado. Actualizadas c/60s.
            </p>
        </div>
    );
};
