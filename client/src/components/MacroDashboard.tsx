import React, { useEffect, useState } from 'react';
import { Globe, TrendingUp, TrendingDown, Activity, DollarSign, Download } from 'lucide-react';
import { apiService } from '../services/api';
import { exportToCSV } from '../utils/exportCSV';
import { Tooltip } from './ui/Tooltip';
import { LiveBondsPanel } from './LiveBondsPanel';

interface MarketData {
    market: {
        merval: any[];
        cedears: any[];
        bonds: any[];
    };
    global: any[];
    macro?: {
        baseMonetaria: number;
        reserves: number;
        dolarEquilibrio: number;
    };
    timestamp: string;
}

export const MacroDashboard: React.FC = () => {
    const [data, setData] = useState<MarketData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Use centralized apiService to avoid CORS/Proxy issues
                const dashboardData = await apiService.getEconomics();
                setData(dashboardData);
            } catch (error) {
                console.error('Error fetching market data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    const renderMetric = (label: string, value: string | number, change?: number, prefix: string = '$') => {
        const isPositive = change && change >= 0;
        const colorClass = change ? (isPositive ? 'text-emerald-400' : 'text-rose-400') : 'text-white';

        return (
            <div className="flex flex-col gap-1 p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{label}</span>
                <div className="flex items-end justify-between">
                    <span className="text-lg font-mono font-bold text-white tracking-tight">
                        {prefix}{typeof value === 'number' ? value.toFixed(2) : value}
                    </span>
                    {change !== undefined && (
                        <span className={`text-xs font-bold flex items-center gap-0.5 ${colorClass}`}>
                            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {Math.abs(change).toFixed(2)}%
                        </span>
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-20 bg-white/5 rounded-lg"></div>
                ))}
            </div>
        );
    }

    if (!data) return null;

    // Helper to find symbol in list
    const find = (list: any[], sym: string) => list?.find((i: any) => i.symbol === sym || i.ticker === sym);

    // Global Indices
    const sp500 = find(data.global, '^GSPC');
    const nasdaq = find(data.global, '^IXIC');
    const btc = find(data.global, 'BTC-USD');
    const gold = find(data.global, 'GC=F');
    const oil = find(data.global, 'CL=F');

    // Local Bonds (Key for MEP/CCL)
    const al30 = find(data.market?.bonds, 'AL30.BA');
    const gd30 = find(data.market?.bonds, 'GD30.BA');



    const handleExportCSV = () => {
        const allData = [
            ...(data?.market?.merval?.map((s: any) => ({ seccion: 'MERVAL', ticker: s.ticker, precio: s.price?.toFixed(2) ?? '-', cambio_pct: s.change?.toFixed(2) ?? '0' })) ?? []),
            ...(data?.market?.cedears?.map((s: any) => ({ seccion: 'CEDEAR', ticker: s.ticker, precio: s.price?.toFixed(2) ?? '-', cambio_pct: s.change?.toFixed(2) ?? '0' })) ?? []),
            ...(data?.market?.bonds?.map((s: any) => ({ seccion: 'BONO', ticker: s.ticker ?? s.symbol, precio: s.price?.toFixed(2) ?? '-', cambio_pct: s.change?.toFixed(2) ?? '0' })) ?? []),
        ];
        exportToCSV(allData, 'mercado_local');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Globe size={16} className="text-accent-primary" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Mercado Global &amp; Bonos</h3>
                </div>
                <Tooltip content="Exportar datos del mercado como CSV" placement="bottom">
                    <button
                        onClick={handleExportCSV}
                        aria-label="Exportar datos del mercado como CSV"
                        className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-emerald-400 border border-transparent hover:border-emerald-500/30 hover:bg-emerald-500/10 px-2.5 py-1.5 rounded-lg transition-colors font-bold uppercase tracking-wider"
                    >
                        <Download size={12} />
                        Exportar CSV
                    </button>
                </Tooltip>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {sp500 && renderMetric('S&P 500', sp500.price, sp500.change, '')}
                {nasdaq && renderMetric('Nasdaq', nasdaq.price, nasdaq.change, '')}
                {btc && renderMetric('Bitcoin', btc.price, btc.change, '$')}
                {gold && renderMetric('Oro', gold.price, gold.change, '$')}
                {oil && renderMetric('Petróleo WTI', oil.price, oil.change, '$')}

                {/* Local Key Bonds */}
                {al30 && renderMetric('AL30 (Bonaerense)', al30.price, al30.change, '$')}
                {gd30 && renderMetric('GD30 (Global)', gd30.price, gd30.change, '$')}
            </div>

            {/* Merval & Cedears Quick View */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                {/* Dólar de Equilibrio (New) */}
                <div className="bg-black/20 rounded-xl p-4 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign size={48} />
                    </div>
                    <h4 className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-2">
                        <Activity size={12} /> Dólar "Equilibrio" (Teórico)
                    </h4>
                    <div className="flex items-end gap-2 mb-2">
                        <span className="text-3xl font-mono font-bold text-white tracking-tight">
                            ${data.macro?.dolarEquilibrio || '---'}
                        </span>
                        <span className="text-xs text-slate-500 mb-1 font-medium">
                            (Base / Reservas)
                        </span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-500">Base Monetaria</span>
                            <span className="text-slate-300 font-mono">${((data.macro?.baseMonetaria || 0) / 1000000000000).toFixed(2)}B (Tr)</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Reservas Brutas</span>
                            <span className="text-slate-300 font-mono">${(data.macro?.reserves || 0).toLocaleString()}M</span>
                        </div>
                    </div>
                </div>

                {/* Live Bonds Panel */}
                <div className="col-span-1 md:col-span-2">
                    <LiveBondsPanel />
                </div>
            </div>

            {/* Merval y Cedears (Lower Section) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Merval */}
                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                    <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                        <Activity size={12} /> Merval Lideres
                    </h4>
                    <div className="space-y-2">
                        {data.market?.merval?.slice(0, 5).map((stock: any) => (
                            <div key={stock.ticker} className="flex justify-between items-center text-sm border-b border-white/5 pb-1 last:border-0 hover:bg-white/5 px-2 py-1 rounded transition-colors cursor-default">
                                <span className="font-bold text-slate-300">{stock.ticker}</span>
                                <div className="flex gap-4">
                                    <span className="font-mono text-white">${stock.price?.toFixed(0) || '-'}</span>
                                    <span className={`font-mono font-bold w-16 text-right ${stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {stock.change > 0 ? '+' : ''}{stock.change?.toFixed(2) || '0.00'}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Cedears */}
                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                    <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                        <DollarSign size={12} /> Cedears (Volumen)
                    </h4>
                    <div className="space-y-2">
                        {data.market?.cedears?.slice(0, 5).map((stock: any) => (
                            <div key={stock.ticker} className="flex justify-between items-center text-sm border-b border-white/5 pb-1 last:border-0 hover:bg-white/5 px-2 py-1 rounded transition-colors cursor-default">
                                <span className="font-bold text-slate-300">{stock.ticker}</span>
                                <div className="flex gap-4">
                                    <span className="font-mono text-white">${stock.price?.toFixed(0) || '-'}</span>
                                    <span className={`font-mono font-bold w-16 text-right ${stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {stock.change > 0 ? '+' : ''}{stock.change?.toFixed(2) || '0.00'}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
