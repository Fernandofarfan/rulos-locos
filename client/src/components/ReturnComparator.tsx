import React, { useState, useEffect, useMemo } from 'react';
import { Scale, TrendingUp, DollarSign, RefreshCw } from 'lucide-react';
import { apiService } from '../services/api';

const PERIODS = [
    { label: '3M', months: 3 },
    { label: '6M', months: 6 },
    { label: '1A', months: 12 },
];

interface InstrumentResult {
    id: string;
    label: string;
    color: string;
    icon: string;
    initialValue: number;
    finalValue: number;
    returnPct: number;
    finalAmount: number;
}

export const ReturnComparator: React.FC = () => {
    const [capital, setCapital] = useState(1_000_000);
    const [period, setPeriod] = useState(6);
    const [loading, setLoading] = useState(true);
    const [blueHist, setBlueHist] = useState<{ labels: string[]; values: number[] }>({ labels: [], values: [] });
    const [mepHist, setMepHist] = useState<{ labels: string[]; values: number[] }>({ labels: [], values: [] });
    const [inflHist, setInflHist] = useState<{ labels: string[]; values: number[] }>({ labels: [], values: [] });
    const [rates, setRates] = useState<any>(null);

    useEffect(() => {
        const range = period <= 3 ? '3M' : period <= 6 ? '6M' : '1Y';
        setLoading(true);
        Promise.allSettled([
            apiService.getHistorical('blue', range),
            apiService.getHistorical('mep', range),
            apiService.getHistorical('inflation', range),
            apiService.getRates(),
        ]).then(([b, m, i, r]) => {
            if (b.status === 'fulfilled') setBlueHist(b.value);
            if (m.status === 'fulfilled') setMepHist(m.value);
            if (i.status === 'fulfilled') setInflHist(i.value);
            if (r.status === 'fulfilled') setRates(r.value);
        }).finally(() => setLoading(false));
    }, [period]);

    const results = useMemo<InstrumentResult[]>(() => {
        const r: InstrumentResult[] = [];

        // Plazo Fijo — compound monthly TNA
        const tna = rates?.plazoFijo?.tna ?? 33;
        const monthlyRate = tna / 12 / 100;
        const pfFinal = capital * Math.pow(1 + monthlyRate, period);
        r.push({
            id: 'plazoFijo', label: 'Plazo Fijo', color: '#3b82f6', icon: '🏦',
            initialValue: capital, finalValue: pfFinal,
            returnPct: ((pfFinal - capital) / capital) * 100,
            finalAmount: pfFinal,
        });

        // Dolar Blue — buy at start, sell at end
        if (blueHist.values.length > 1) {
            const start = blueHist.values[0];
            const end = blueHist.values[blueHist.values.length - 1];
            const usdBought = capital / start;
            const finalARS = usdBought * end;
            r.push({
                id: 'dolarBlue', label: 'Dólar Blue', color: '#10b981', icon: '💵',
                initialValue: start, finalValue: end,
                returnPct: ((end - start) / start) * 100,
                finalAmount: finalARS,
            });
        }

        // Dolar MEP
        if (mepHist.values.length > 1) {
            const start = mepHist.values[0];
            const end = mepHist.values[mepHist.values.length - 1];
            const usdBought = capital / start;
            const finalARS = usdBought * end;
            r.push({
                id: 'dolarMep', label: 'Dólar MEP', color: '#8b5cf6', icon: '📊',
                initialValue: start, finalValue: end,
                returnPct: ((end - start) / start) * 100,
                finalAmount: finalARS,
            });
        }

        // Inflación — what you lose by keeping in ARS
        if (inflHist.values.length > 0) {
            const totalInflation = inflHist.values.reduce((acc, v) => acc * (1 + v / 100), 1);
            const lostPower = capital / totalInflation;
            r.push({
                id: 'inflacion', label: 'Inflación', color: '#ef4444', icon: '📈',
                initialValue: capital, finalValue: lostPower,
                returnPct: -((totalInflation - 1) * 100),
                finalAmount: lostPower,
            });
        }

        return r.sort((a, b) => b.finalAmount - a.finalAmount);
    }, [blueHist, mepHist, inflHist, rates, capital, period]);

    const maxAmount = Math.max(...results.map(r => r.finalAmount), capital);

    const fmt = (n: number) =>
        new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

    return (
        <div className="glass-panel no-lift p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <Scale size={20} className="text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Comparador de Rendimientos</h3>
                        <p className="text-xs text-slate-500">¿Dónde rendía más tu plata?</p>
                    </div>
                </div>
                {loading && <RefreshCw size={16} className="animate-spin text-slate-500" />}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-end gap-4 mb-6">
                <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 block">Capital Inicial</label>
                    <div className="relative">
                        <DollarSign size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="number"
                            value={capital}
                            onChange={e => setCapital(Number(e.target.value))}
                            className="w-40 bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-2 text-xs text-white font-mono focus:border-accent-primary/50 outline-none"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 block">Período</label>
                    <div className="flex gap-1">
                        {PERIODS.map(p => (
                            <button
                                key={p.months}
                                onClick={() => setPeriod(p.months)}
                                className={`text-[10px] font-bold py-2 px-4 rounded-lg border transition-all ${period === p.months
                                    ? 'bg-accent-primary/20 border-accent-primary/40 text-accent-primary'
                                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Results bars */}
            <div className="space-y-3">
                {/* Capital label */}
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Inversión inicial:</span>
                    <span className="text-xs font-bold font-mono text-white">{fmt(capital)}</span>
                </div>

                {results.map(r => (
                    <div key={r.id} className="group">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <span className="text-sm">{r.icon}</span>
                                <span className="text-xs font-bold text-white">{r.label}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-bold font-mono ${r.returnPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {r.returnPct >= 0 ? '+' : ''}{r.returnPct.toFixed(1)}%
                                </span>
                                <span className="text-sm font-bold font-mono text-white">{fmt(r.finalAmount)}</span>
                            </div>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-6 relative overflow-hidden border border-white/5">
                            <div
                                className="h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2"
                                style={{
                                    width: `${Math.max((r.finalAmount / maxAmount) * 100, 5)}%`,
                                    backgroundColor: r.color,
                                    opacity: 0.7,
                                }}
                            >
                                {r.finalAmount / maxAmount > 0.2 && (
                                    <span className="text-[9px] font-bold text-white/90 drop-shadow">
                                        {fmt(r.finalAmount)}
                                    </span>
                                )}
                            </div>
                            {/* Capital reference line */}
                            <div
                                className="absolute top-0 h-full w-px bg-white/30 z-10"
                                style={{ left: `${(capital / maxAmount) * 100}%` }}
                                title={`Capital inicial: ${fmt(capital)}`}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Winner banner */}
            {results.length > 0 && (
                <div className="mt-5 p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 flex items-center gap-3">
                    <TrendingUp size={18} className="text-emerald-400 flex-shrink-0" />
                    <p className="text-xs text-slate-300">
                        <span className="font-bold text-emerald-400">{results[0]?.icon} {results[0]?.label}</span> fue la mejor inversión de los últimos {period} meses con un retorno de{' '}
                        <span className="font-bold text-white">{results[0]?.returnPct.toFixed(1)}%</span>
                    </p>
                </div>
            )}

            <p className="text-[9px] text-slate-600 mt-4 text-center">
                Rendimientos calculados con datos históricos reales. Rendimiento pasado no garantiza resultados futuros.
            </p>
        </div>
    );
};
