import React, { useState, useEffect, useMemo } from 'react';
import { History, TrendingUp, TrendingDown, Calendar, DollarSign, BarChart3, RefreshCw } from 'lucide-react';
import { apiService } from '../services/api';

type Strategy = 'mep_blue' | 'crypto_blue';

interface BacktestResult {
    date: string;
    buy: number;
    sell: number;
    profit: number;
    profitPct: number;
    cumulative: number;
}

const STRATEGIES: Record<Strategy, { label: string; desc: string; color: string }> = {
    mep_blue: { label: 'MEP → Blue', desc: 'Comprar MEP, vender Blue', color: '#3b82f6' },
    crypto_blue: { label: 'Crypto → Blue', desc: 'Comprar USDT, vender Blue', color: '#f59e0b' },
};

const PERIODS = [
    { label: '1M', days: 30 },
    { label: '3M', days: 90 },
    { label: '6M', days: 180 },
    { label: '1A', days: 365 },
];

export const RuloBacktester: React.FC = () => {
    const [strategy, setStrategy] = useState<Strategy>('mep_blue');
    const [period, setPeriod] = useState(90);
    const [capital, setCapital] = useState(1_000_000);
    const [commission, setCommission] = useState(0.5);
    const [loading, setLoading] = useState(true);
    const [blueData, setBlueData] = useState<{ labels: string[]; values: number[] }>({ labels: [], values: [] });
    const [mepData, setMepData] = useState<{ labels: string[]; values: number[] }>({ labels: [], values: [] });

    useEffect(() => {
        const range = period <= 30 ? '1M' : period <= 90 ? '3M' : period <= 180 ? '6M' : '1Y';
        setLoading(true);
        Promise.allSettled([
            apiService.getHistorical('blue', range),
            apiService.getHistorical('mep', range),
        ]).then(([b, m]) => {
            if (b.status === 'fulfilled') setBlueData(b.value);
            if (m.status === 'fulfilled') setMepData(m.value);
        }).finally(() => setLoading(false));
    }, [period]);

    const results = useMemo<BacktestResult[]>(() => {
        if (!blueData.labels.length || !mepData.labels.length) return [];

        // Align dates between blue and mep
        const mepMap = new Map<string, number>();
        mepData.labels.forEach((d, i) => mepMap.set(d, mepData.values[i]));

        let cumProfit = 0;
        const trades: BacktestResult[] = [];

        blueData.labels.forEach((date, i) => {
            const bluePrice = blueData.values[i];
            const buyPrice = strategy === 'mep_blue' ? (mepMap.get(date) ?? 0) : bluePrice * 0.98; // crypto approx
            if (!buyPrice || !bluePrice || buyPrice <= 0) return;

            const spread = bluePrice - buyPrice;
            const commCost = (buyPrice + bluePrice) * (commission / 100);
            const netProfit = spread - commCost;
            const profitPct = (netProfit / buyPrice) * 100;
            const profitARS = (capital / buyPrice) * netProfit;
            cumProfit += profitARS;

            trades.push({
                date,
                buy: buyPrice,
                sell: bluePrice,
                profit: profitARS,
                profitPct,
                cumulative: cumProfit,
            });
        });

        return trades;
    }, [blueData, mepData, strategy, capital, commission]);

    const stats = useMemo(() => {
        if (!results.length) return null;
        const profits = results.map(r => r.profitPct);
        const positive = profits.filter(p => p > 0).length;
        const totalReturn = results[results.length - 1]?.cumulative ?? 0;
        const avgReturn = profits.reduce((a, b) => a + b, 0) / profits.length;
        const maxDrawdown = Math.min(...profits);
        const bestDay = Math.max(...profits);
        return {
            totalReturn,
            totalReturnPct: (totalReturn / capital) * 100,
            avgReturn,
            winRate: (positive / profits.length) * 100,
            maxDrawdown,
            bestDay,
            trades: results.length,
        };
    }, [results, capital]);

    // Simple sparkline using CSS
    const maxCum = Math.max(...results.map(r => Math.abs(r.cumulative)), 1);

    return (
        <div className="glass-panel no-lift p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                        <History size={20} className="text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Backtester de Rulos</h3>
                        <p className="text-xs text-slate-500">Simulá rendimiento histórico de estrategias</p>
                    </div>
                </div>
                {loading && <RefreshCw size={16} className="animate-spin text-slate-500" />}
            </div>

            {/* Controls */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {/* Strategy */}
                <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 block">Estrategia</label>
                    <div className="flex gap-1">
                        {(Object.keys(STRATEGIES) as Strategy[]).map(s => (
                            <button
                                key={s}
                                onClick={() => setStrategy(s)}
                                className={`flex-1 text-[10px] font-bold py-2 px-2 rounded-lg border transition-all ${strategy === s
                                    ? 'bg-accent-primary/20 border-accent-primary/40 text-accent-primary'
                                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                                    }`}
                            >
                                {STRATEGIES[s].label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Period */}
                <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 block">Período</label>
                    <div className="flex gap-1">
                        {PERIODS.map(p => (
                            <button
                                key={p.days}
                                onClick={() => setPeriod(p.days)}
                                className={`flex-1 text-[10px] font-bold py-2 rounded-lg border transition-all ${period === p.days
                                    ? 'bg-accent-primary/20 border-accent-primary/40 text-accent-primary'
                                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Capital */}
                <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 block">Capital (ARS)</label>
                    <input
                        type="number"
                        value={capital}
                        onChange={e => setCapital(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-accent-primary/50 outline-none"
                    />
                </div>

                {/* Commission */}
                <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 block">Comisión (%)</label>
                    <input
                        type="number"
                        step="0.1"
                        value={commission}
                        onChange={e => setCommission(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-accent-primary/50 outline-none"
                    />
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 flex items-center gap-1">
                            <DollarSign size={10} /> Ganancia Total
                        </p>
                        <p className={`text-lg font-bold font-mono ${stats.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {stats.totalReturn >= 0 ? '+' : ''}{new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(stats.totalReturn)}
                        </p>
                        <p className={`text-[10px] font-mono ${stats.totalReturnPct >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                            {stats.totalReturnPct >= 0 ? '+' : ''}{stats.totalReturnPct.toFixed(1)}%
                        </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 flex items-center gap-1">
                            <BarChart3 size={10} /> Win Rate
                        </p>
                        <p className="text-lg font-bold font-mono text-white">{stats.winRate.toFixed(0)}%</p>
                        <p className="text-[10px] text-slate-500">{stats.trades} operaciones</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 flex items-center gap-1">
                            <TrendingUp size={10} /> Mejor Día
                        </p>
                        <p className="text-lg font-bold font-mono text-emerald-400">+{stats.bestDay.toFixed(2)}%</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 flex items-center gap-1">
                            <TrendingDown size={10} /> Máx Drawdown
                        </p>
                        <p className="text-lg font-bold font-mono text-red-400">{stats.maxDrawdown.toFixed(2)}%</p>
                    </div>
                </div>
            )}

            {/* Equity Curve (CSS bars) */}
            {results.length > 0 && (
                <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 flex items-center gap-1">
                        <Calendar size={10} /> Curva de Equity (ganancia acumulada)
                    </p>
                    <div className="flex items-end gap-px h-32 bg-white/[0.02] rounded-xl p-2 border border-white/5 overflow-hidden">
                        {results.slice(-100).map((r, i) => {
                            const h = Math.abs(r.cumulative) / maxCum * 100;
                            return (
                                <div
                                    key={i}
                                    className="flex-1 min-w-0 rounded-t transition-all"
                                    style={{
                                        height: `${Math.max(h, 2)}%`,
                                        backgroundColor: r.cumulative >= 0
                                            ? `rgba(16, 185, 129, ${0.3 + (h / 150)})`
                                            : `rgba(239, 68, 68, ${0.3 + (h / 150)})`,
                                    }}
                                    title={`${r.date}: ${r.cumulative >= 0 ? '+' : ''}$${Math.round(r.cumulative).toLocaleString()}`}
                                />
                            );
                        })}
                    </div>
                    <div className="flex justify-between mt-1">
                        <span className="text-[9px] text-slate-600">{results.slice(-100)[0]?.date}</span>
                        <span className="text-[9px] text-slate-600">{results[results.length - 1]?.date}</span>
                    </div>
                </div>
            )}

            {!loading && results.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                    No hay datos históricos suficientes para este período
                </div>
            )}

            <p className="text-[9px] text-slate-600 mt-4 text-center">
                ⚠️ Simulación basada en datos históricos. Rendimiento pasado no garantiza resultados futuros.
            </p>
        </div>
    );
};
