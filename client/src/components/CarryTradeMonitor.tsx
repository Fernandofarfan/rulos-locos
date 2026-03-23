import React, { useEffect, useState } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { apiService } from '../services/api';
import CandlestickChart from './CandlestickChart';

interface CarryHistory {
    fecha: string;
    usdHold: number;
    arsTasaInUSD: number;
    dolarPrice: number;
}

export const CarryTradeMonitor: React.FC = () => {
    const [history, setHistory] = useState<CarryHistory[]>([]);
    const [tna, setTna] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCarry = async () => {
            try {
                const data = await apiService.getCarryTrade();
                if (data && data.history) {
                    setHistory(data.history);
                    setTna(data.currentTNA);
                }
            } catch (e) {
                console.error('CarryTradeMonitor fetch error:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchCarry();
    }, []);

    if (loading) {
        return (
            <div className="glass-panel p-6 animate-pulse">
                <div className="h-4 w-48 bg-white/10 rounded mb-4" />
                <div className="h-64 bg-white/5 rounded-xl" />
            </div>
        );
    }

    const latest = history[history.length - 1];
    const profitUSD = latest ? latest.arsTasaInUSD - 1000 : 0;
    const profitPct = latest ? (latest.arsTasaInUSD / 1000 - 1) * 100 : 0;
    const isWinner = profitUSD > 0;

    const chartLabels = history.map(h => h.fecha);
    const arsTasaValues = history.map(h => h.arsTasaInUSD);

    return (
        <div className="glass-panel p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <RefreshCw size={18} className="text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Monitor Básica "Bicicleta"</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                            Rendimiento USD en colchón vs. ARS a Tasa BADLAR ({tna}% TNA)
                        </p>
                    </div>
                </div>
                <div className={`px-3 py-1 rounded-full border text-[10px] font-bold ${isWinner ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                    {isWinner ? 'GANANCIA EN USD' : 'PERDIDA EN USD'}
                </div>
            </div>

            {/* Stats Board */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                    <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Inversión Inicial</div>
                    <div className="text-lg font-black font-mono text-white">$1,000 USD</div>
                    <div className="text-[9px] text-slate-600 mt-1">hace 6 meses</div>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                    <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Hoy (Tenencia USD)</div>
                    <div className="text-lg font-black font-mono text-white">$1,000 USD</div>
                    <div className="text-[9px] text-slate-600 mt-1">mismo capital nominal</div>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                    <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Hoy (Carry Trade)</div>
                    <div className="text-lg font-black font-mono text-emerald-400">${latest?.arsTasaInUSD.toLocaleString()} USD</div>
                    <div className="text-[9px] text-slate-600 mt-1">re-comprando dolares</div>
                </div>
                <div className={`rounded-xl p-3 border ${isWinner ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                    <div className="text-[9px] uppercase font-bold tracking-wider mb-1 text-slate-400">Profit / Loss Real</div>
                    <div className={`text-lg font-black font-mono flex items-center gap-1 ${isWinner ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isWinner ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {isWinner ? '+' : ''}${Math.abs(profitUSD).toFixed(0)} ({profitPct.toFixed(1)}%)
                    </div>
                    <div className="text-[9px] text-slate-600 mt-1">Resultado en moneda dura</div>
                </div>
            </div>

            {/* Chart Area */}
            <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5 h-[280px]">
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <Info size={10} /> Escenario: USD 1.000 vs. ARS Tasa (Valuado en USD)
                    </div>
                    <div className="flex gap-3">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-600" /> USD Hold</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> ARS Carry</span>
                    </div>
                </div>

                <CandlestickChart
                    labels={chartLabels}
                    values={arsTasaValues}
                    color="#10b981"
                    height={220}
                    indicator="carry"
                    showCandles={false}
                />
            </div>

            <div className="text-[10px] text-slate-600 italic flex items-start gap-1">
                <Info size={10} className="mt-0.5 shrink-0" />
                Simulación simplificada: Venta inicial de USD a precio Blue, colocación a interés mensual compuesto, y re-compra final al precio actual. No incluye comisiones bancarias ni spreads.
            </div>
        </div>
    );
};
