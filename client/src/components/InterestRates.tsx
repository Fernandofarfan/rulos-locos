import React, { useEffect, useState } from 'react';
import { Percent, TrendingUp, TrendingDown, Info, RefreshCw } from 'lucide-react';
import { apiService } from '../services/api';
import { Tooltip } from './ui/Tooltip';

interface RatesData {
    badlar: { tna: number; tem: number; tea: number; fecha: string };
    plazoFijo: { tna: number; tem: number; tea: number };
    inflation: { mensual: number; interanual: number; fecha: string };
    realRate: number;
    timestamp: string;
}

const RateCard: React.FC<{
    label: string;
    subtitle: string;
    tna: number;
    tem: number;
    tea: number;
    accent: string;
}> = ({ label, subtitle, tna, tem, tea, accent }) => (
    <div className={`flex-1 min-w-0 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all group relative overflow-hidden`}>
        <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity`}
            style={{ background: accent }} />
        <div className="relative z-10">
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
                <span className="text-[9px] text-slate-600 font-mono">{subtitle}</span>
            </div>
            <div className="text-3xl font-black text-white tracking-tight font-mono mb-3">
                {tna.toFixed(2)}<span className="text-base font-bold text-slate-400 ml-1">%</span>
                <span className="text-[10px] font-bold text-slate-500 ml-1">TNA</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/5 rounded-lg p-2">
                    <span className="text-[9px] block text-slate-500 uppercase font-bold tracking-wider">TEM</span>
                    <span className="text-xs font-bold font-mono" style={{ color: accent }}>{tem.toFixed(2)}%</span>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                    <span className="text-[9px] block text-slate-500 uppercase font-bold tracking-wider">TEA</span>
                    <span className="text-xs font-bold font-mono" style={{ color: accent }}>{tea.toFixed(2)}%</span>
                </div>
            </div>
        </div>
    </div>
);

export const InterestRates: React.FC = () => {
    const [rates, setRates] = useState<RatesData | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchRates = async () => {
        try {
            const data = await apiService.getRates();
            setRates(data);
            setLastUpdated(new Date());
        } catch (e) {
            console.error('InterestRates fetch error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRates();
        const interval = setInterval(fetchRates, 300000); // 5 min
        return () => clearInterval(interval);
    }, []);

    const isRealRatePositive = (rates?.realRate ?? -1) > 0;
    const realRateAbs = Math.abs(rates?.realRate ?? 0);
    const inflation = rates?.inflation?.interanual ?? 0;
    const badlarTNA = rates?.badlar?.tna ?? 0;

    // Progress: cuánto de la inflación cubre la tasa
    const coveragePercent = inflation > 0
        ? Math.min(100, (badlarTNA / inflation) * 100)
        : 100;

    if (loading) {
        return (
            <div className="glass-panel p-6 animate-pulse">
                <div className="h-4 w-32 bg-white/10 rounded mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-28 bg-white/5 rounded-2xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <Percent size={16} className="text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Tasas de Interés</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                            BADLAR · Plazo Fijo · Datos BCRA / ArgentinaDatos
                            {lastUpdated && <span className="ml-2 opacity-60">· {lastUpdated.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>}
                        </p>
                    </div>
                </div>
                <Tooltip content="Actualizar tasas" placement="left">
                <button
                    onClick={fetchRates}
                    aria-label="Actualizar tasas de interés"
                    className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors"
                >
                    <RefreshCw size={14} />
                </button>
                </Tooltip>
            </div>

            {/* Rate Cards */}
            <div className="flex flex-col md:flex-row gap-3">
                <RateCard
                    label="BADLAR"
                    subtitle="Bancos Privados · 30-35 días"
                    tna={rates?.badlar.tna ?? 0}
                    tem={rates?.badlar.tem ?? 0}
                    tea={rates?.badlar.tea ?? 0}
                    accent="#3b82f6"
                />
                <RateCard
                    label="Plazo Fijo"
                    subtitle="Minorista estimado"
                    tna={rates?.plazoFijo.tna ?? 0}
                    tem={rates?.plazoFijo.tem ?? 0}
                    tea={rates?.plazoFijo.tea ?? 0}
                    accent="#8b5cf6"
                />
                {/* Real Rate Card */}
                <div className="flex-1 min-w-0 p-4 rounded-2xl border transition-all relative overflow-hidden"
                    style={{
                        background: isRealRatePositive
                            ? 'rgba(16, 185, 129, 0.05)'
                            : 'rgba(239, 68, 68, 0.05)',
                        borderColor: isRealRatePositive
                            ? 'rgba(16, 185, 129, 0.2)'
                            : 'rgba(239, 68, 68, 0.2)',
                    }}>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tasa Real</span>
                            <div className="group/tip relative">
                                <Info size={10} className="text-slate-600 cursor-pointer" />
                                <div className="hidden group-hover/tip:block absolute left-4 -top-1 z-50 bg-gray-900 text-[10px] text-slate-300 p-2 rounded-lg border border-white/10 w-44 leading-relaxed shadow-xl">
                                    BADLAR TNA − Inflación Interanual.<br />
                                    Positiva = el ahorro le gana a la inflación.
                                </div>
                            </div>
                        </div>
                        <div className={`text-3xl font-black tracking-tight font-mono mb-2 flex items-center gap-2 ${isRealRatePositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isRealRatePositive
                                ? <TrendingUp size={24} />
                                : <TrendingDown size={24} />}
                            {isRealRatePositive ? '+' : '-'}{realRateAbs.toFixed(1)}
                            <span className="text-base font-bold text-slate-400 ml-1">pp</span>
                        </div>
                        <p className={`text-[10px] font-medium leading-snug ${isRealRatePositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isRealRatePositive
                                ? '✅ La tasa supera la inflación'
                                : '⚠️ La tasa no cubre la inflación'}
                        </p>

                        {/* Coverage progress bar */}
                        <div className="mt-3">
                            <div className="flex justify-between text-[9px] text-slate-600 mb-1 font-mono">
                                <span>BADLAR {badlarTNA.toFixed(1)}%</span>
                                <span>Inflación {inflation.toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{
                                        width: `${coveragePercent}%`,
                                        background: isRealRatePositive
                                            ? 'linear-gradient(90deg, #10b981, #34d399)'
                                            : 'linear-gradient(90deg, #ef4444, #f87171)',
                                    }}
                                />
                            </div>
                            <div className="text-[9px] text-slate-600 mt-1 text-right">
                                Cobertura: {coveragePercent.toFixed(0)}%
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
