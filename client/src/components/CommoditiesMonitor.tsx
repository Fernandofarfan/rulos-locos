import React, { useEffect, useState } from 'react';
import { Wheat, TrendingUp, TrendingDown, RefreshCw, Sprout } from 'lucide-react';
import { apiService } from '../services/api';

interface Commodity {
    name: string;
    symbol: string;
    price: number;
    change24h: number;
    unit: string;
    source: string;
}

const ICONS: Record<string, string> = {
    SOJA: '🫘',
    MAIZ: '🌽',
    TRIGO: '🌾',
    GIRAS: '🌻',
};

export const CommoditiesMonitor: React.FC = () => {
    const [commodities, setCommodities] = useState<Commodity[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await apiService.getCommodities();
            if (Array.isArray(data) && data.length > 0) {
                setCommodities(data);
                setLastUpdated(new Date());
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30 * 60 * 1000); // cada 30 min
        return () => clearInterval(interval);
    }, []);

    const totalMarketChange = commodities.length > 0
        ? commodities.reduce((acc, c) => acc + c.change24h, 0) / commodities.length
        : 0;

    return (
        <div className="glass-panel p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                        <Sprout size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Commodities Agrícolas</h3>
                        <p className="text-xs text-slate-400">Precios de referencia MATBA-ROFEX</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {totalMarketChange !== 0 && (
                        <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                            totalMarketChange >= 0
                                ? 'text-emerald-400 bg-emerald-400/10'
                                : 'text-red-400 bg-red-400/10'
                        }`}>
                            Promedio: {totalMarketChange >= 0 ? '+' : ''}{totalMarketChange.toFixed(2)}%
                        </span>
                    )}
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Grid de commodities */}
            {loading && commodities.length === 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-slate-900/40 rounded-xl p-4 animate-pulse">
                            <div className="h-3 bg-slate-700 rounded w-2/3 mb-3"></div>
                            <div className="h-6 bg-slate-700 rounded w-full mb-2"></div>
                            <div className="h-3 bg-slate-700 rounded w-1/3"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {commodities.map(c => {
                        const isPositive = c.change24h >= 0;
                        const icon = ICONS[c.symbol] || '📦';

                        return (
                            <div
                                key={c.symbol}
                                className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 hover:border-emerald-500/30 transition-colors group"
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xl">{icon}</span>
                                    <div>
                                        <p className="text-xs font-semibold text-white">{c.name}</p>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{c.symbol}</p>
                                    </div>
                                </div>

                                <p className="text-2xl font-bold text-white font-mono">
                                    ${c.price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">{c.unit}</p>

                                <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${
                                    isPositive ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                    {isPositive
                                        ? <TrendingUp size={12} />
                                        : <TrendingDown size={12} />
                                    }
                                    {isPositive ? '+' : ''}{c.change24h.toFixed(2)}%
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Footer */}
            {lastUpdated && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800">
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Wheat size={10} />
                        {commodities[0]?.source || 'MATBA-ROFEX'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                        {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            )}
        </div>
    );
};
