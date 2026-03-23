import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { apiService } from '../services/api';
import { useDashboardData } from '../hooks/useDashboardData';

interface Instrument {
    id: string;
    name: string;
    icon: string;
    type: 'ars' | 'usd' | 'crypto';
    tnaARS?: number;       // TNA en ARS (para plazo fijo)
    rateDescription: string;
    color: string;
}

const PERIODS = [30, 90, 180, 365];

function calcReturn(capital: number, instrument: Instrument, days: number, inflacion: number, _ccl: number): {
    nominalARS: number;
    realARS: number;
    finalCapital: number;
} {
    let finalCapitalARS = capital;

    if (instrument.tnaARS) {
        // Plazo fijo o BADLAR-like
        const effectiveRate = (1 + instrument.tnaARS / 100 / 365) ** days - 1;
        finalCapitalARS = capital * (1 + effectiveRate);
    }

    const inflacionPeriodo = (1 + inflacion / 100) ** (days / 30) - 1;
    const nominalARS = finalCapitalARS - capital;
    const realARS = capital * (finalCapitalARS / capital / (1 + inflacionPeriodo) - 1);

    return { nominalARS, realARS, finalCapital: finalCapitalARS };
}

export const InstrumentComparer: React.FC = () => {
    const { economics } = useDashboardData();
    const [bestTNA, setBestTNA] = useState<number>(0);
    const [depositTNA, setDepositTNA] = useState<number>(0);
    const [capital, setCapital] = useState('1000000');
    const [selectedPeriod, setSelectedPeriod] = useState(30);
    const [loading, setLoading] = useState(true);

    const inflacion = economics?.macro?.inflation?.mensual ?? 2.5;

    useEffect(() => {
        const load = async () => {
            try {
                const [pfData, ratesData] = await Promise.allSettled([
                    apiService.getPlazoFijoBancos(),
                    apiService.getRates()
                ]);
                if (pfData.status === 'fulfilled' && pfData.value?.bancos?.length > 0) {
                    setBestTNA(pfData.value.bancos[0].tnaClientes);
                }
                if (ratesData.status === 'fulfilled') {
                    setDepositTNA(ratesData.value?.badlar?.tna ?? 34);
                }
            } catch (e) {
                console.error('InstrumentComparer error:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const capitalNum = parseFloat(capital) || 1000000;

    const instruments: (Instrument & { returns: ReturnType<typeof calcReturn> })[] = loading ? [] : [
        {
            id: 'pf-best',
            name: 'Plazo Fijo (mejor banco)',
            icon: '🏦',
            type: 'ars',
            tnaARS: bestTNA || 37,
            rateDescription: `${(bestTNA || 37).toFixed(2)}% TNA`,
            color: '#10b981',
            returns: calcReturn(capitalNum, { id: 'pf-best', name: '', icon: '', type: 'ars', tnaARS: bestTNA || 37, rateDescription: '', color: '' }, selectedPeriod, inflacion, 0)
        },
        {
            id: 'badlar',
            name: 'Promedio sistema bancario',
            icon: '📊',
            type: 'ars',
            tnaARS: depositTNA || 34,
            rateDescription: `${(depositTNA || 34).toFixed(2)}% TNA (BADLAR)`,
            color: '#3b82f6',
            returns: calcReturn(capitalNum, { id: 'badlar', name: '', icon: '', type: 'ars', tnaARS: depositTNA || 34, rateDescription: '', color: '' }, selectedPeriod, inflacion, 0)
        },
        {
            id: 'acf',
            name: 'FCI Mercado de Dinero (est.)',
            icon: '💼',
            type: 'ars',
            tnaARS: (bestTNA || 37) * 0.95,
            rateDescription: `~${((bestTNA || 37) * 0.95).toFixed(1)}% TNA estimada`,
            color: '#8b5cf6',
            returns: calcReturn(capitalNum, { id: 'acf', name: '', icon: '', type: 'ars', tnaARS: (bestTNA || 37) * 0.95, rateDescription: '', color: '' }, selectedPeriod, inflacion, 0)
        },
        {
            id: 'inflacion',
            name: 'Inflación (referencia)',
            icon: '📈',
            type: 'ars',
            tnaARS: ((1 + inflacion / 100) ** 12 - 1) * 100,
            rateDescription: `${inflacion.toFixed(1)}% mensual`,
            color: '#f59e0b',
            returns: calcReturn(capitalNum, { id: 'inflacion', name: '', icon: '', type: 'ars', tnaARS: ((1 + inflacion / 100) ** 12 - 1) * 100, rateDescription: '', color: '' }, selectedPeriod, inflacion, 0)
        },
    ];

    // Calcular máximo de retorno para la barra
    const maxNominal = Math.max(...instruments.map(i => i.returns.nominalARS), 1);

    return (
        <div className="glass-panel p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-40 h-40 rounded-full blur-3xl opacity-5 bg-purple-500" />

            <div className="flex items-start justify-between mb-5 relative z-10">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                            <BarChart3 size={20} />
                        </span>
                        Comparador de Instrumentos
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 ml-10">Rendimiento real vs inflación actual de {inflacion.toFixed(1)}%/mes</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5 relative z-10">
                <div className="flex-1">
                    <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Capital a invertir ($)</label>
                    <input
                        type="number"
                        value={capital}
                        onChange={e => setCapital(e.target.value)}
                        className="w-full bg-black/40 text-white text-sm font-mono border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-purple-500/50"
                    />
                </div>
                <div>
                    <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Período</label>
                    <div className="flex gap-1">
                        {PERIODS.map(p => (
                            <button
                                key={p}
                                onClick={() => setSelectedPeriod(p)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    selectedPeriod === p
                                        ? 'bg-purple-500/30 text-purple-300 border border-purple-500/40'
                                        : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                                }`}
                            >
                                {p < 365 ? `${p}d` : '1A'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Comparison bars */}
            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-t-purple-400 border-white/10 rounded-full animate-spin" />
                </div>
            ) : (
                <div className="space-y-3 relative z-10">
                    {instruments.map((inst) => {
                        const barWidth = Math.max(4, (inst.returns.nominalARS / maxNominal) * 100);
                        const isInflacion = inst.id === 'inflacion';
                        const beatsInflacion = inst.returns.realARS > 0 && !isInflacion;

                        return (
                            <div key={inst.id} className={`p-3 rounded-xl border transition-all ${
                                isInflacion
                                    ? 'bg-amber-500/5 border-amber-500/15'
                                    : beatsInflacion
                                    ? 'bg-white/[0.03] border-white/5 hover:bg-white/5'
                                    : 'bg-red-500/5 border-red-500/10'
                            }`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">{inst.icon}</span>
                                        <div>
                                            <div className="text-xs font-medium text-white">{inst.name}</div>
                                            <div className="text-[9px] text-slate-500">{inst.rateDescription}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold font-mono" style={{ color: inst.color }}>
                                            +${inst.returns.nominalARS.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                        </div>
                                        <div className={`text-[9px] flex items-center gap-0.5 justify-end ${
                                            isInflacion ? 'text-amber-400' : beatsInflacion ? 'text-emerald-400' : 'text-red-400'
                                        }`}>
                                            {isInflacion ? <Minus size={9} /> : beatsInflacion ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                                            {isInflacion
                                                ? 'Referencia'
                                                : `${inst.returns.realARS >= 0 ? '+' : ''}$${inst.returns.realARS.toLocaleString('es-AR', { maximumFractionDigits: 0 })} real`
                                            }
                                        </div>
                                    </div>
                                </div>
                                {/* Bar */}
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${barWidth}%`, background: inst.color, opacity: isInflacion ? 0.4 : 1 }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <p className="text-[9px] text-slate-600 mt-4 relative z-10">
                * FCI estimado. Tasas sujetas a cambios. No constituye asesoramiento financiero.
            </p>
        </div>
    );
};
