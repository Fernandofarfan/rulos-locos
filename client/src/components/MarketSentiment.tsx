import React, { useMemo } from 'react';
import { Activity, Flame, Snowflake, TrendingUp, TrendingDown } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';

export const MarketSentiment: React.FC = () => {
    const { arbitrage, economics } = useDashboardData();

    const sentiment = useMemo(() => {
        let score = 50; // Neutral start
        const factors = [];

        // 1. Brecha Cambiaria
        const oficial = arbitrage?.dolares?.oficial?.venta || 1;
        const blue = arbitrage?.dolares?.blue?.venta || oficial;
        const brecha = ((blue - oficial) / oficial) * 100;

        if (brecha < 20) {
            score += 20;
            factors.push({ name: 'Brecha Baja', value: `${brecha.toFixed(1)}%`, positive: true });
        } else if (brecha > 50) {
            score -= 20;
            factors.push({ name: 'Brecha Alta', value: `${brecha.toFixed(1)}%`, positive: false });
        } else {
            factors.push({ name: 'Brecha Estable', value: `${brecha.toFixed(1)}%`, positive: true });
        }

        // 2. Riesgo País (Mocked or real if available)
        // If economics has riesgo_pais we use it, otherwise fallback
        const riesgoPais = economics?.macro?.risk || 1200;

        if (riesgoPais < 1000) {
            score += 20;
            factors.push({ name: 'Riesgo P. Baja', value: riesgoPais, positive: true });
        } else if (riesgoPais > 1500) {
            score -= 15;
            factors.push({ name: 'Riesgo P. Alto', value: riesgoPais, positive: false });
        } else {
            factors.push({ name: 'Riesgo P.', value: riesgoPais, positive: true });
        }

        // 3. Tasa de Interés (Badlar)
        const tna = (economics?.macro as any)?.badlar || 35;
        if (tna > 70) {
            score -= 10; // Tasas altísimas secan plaza = Bearish
            factors.push({ name: 'Tasa Alta', value: `${tna}%`, positive: false });
        } else {
            score += 10; // Tasas bajas impulsan crédito/acciones = Bullish
            factors.push({ name: 'Tasa Baja', value: `${tna}%`, positive: true });
        }

        // Clamp 0 to 100
        score = Math.max(0, Math.min(100, score));

        let state = 'Neutral';
        let color = 'text-yellow-400';
        let bg = 'bg-yellow-500';
        let Icon = Activity;

        if (score >= 80) { state = 'Codicia Extrema'; color = 'text-emerald-400'; bg = 'bg-emerald-500'; Icon = Flame; }
        else if (score >= 60) { state = 'Optimismo'; color = 'text-emerald-300'; bg = 'bg-emerald-400'; Icon = TrendingUp; }
        else if (score <= 20) { state = 'Miedo Extremo'; color = 'text-red-500'; bg = 'bg-red-500'; Icon = Snowflake; }
        else if (score <= 40) { state = 'Pánico Relativo'; color = 'text-orange-400'; bg = 'bg-orange-500'; Icon = TrendingDown; }

        return { score, state, color, bg, Icon, factors };
    }, [arbitrage, economics]);

    return (
        <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl">
                    <Activity size={20} />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-100">Sentimiento Merval</h3>
                    <p className="text-xs text-slate-400">Termómetro del mercado argentino</p>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center mb-6 flex-1">
                <div className="relative w-40 h-20 overflow-hidden mb-2">
                    {/* Gauge Arch */}
                    <div className="absolute top-0 left-0 w-40 h-40 rounded-full border-[12px] border-slate-700/50 border-b-transparent border-r-transparent border-l-transparent" style={{ transform: 'rotate(-45deg)' }}></div>
                    {/* Dynamic Arch Fill */}
                    <div className={`absolute top-0 left-0 w-40 h-40 rounded-full border-[12px] border-b-transparent border-r-transparent border-l-transparent transition-all duration-1000 ease-out border-current ${sentiment.color}`}
                        style={{ transform: `rotate(${(-45) + (180 * (sentiment.score / 100))}deg)` }}>
                    </div>
                </div>

                <div className="text-center -mt-8 relative z-10 bg-slate-800/80 px-4 py-1 rounded-full border border-slate-700 shadow-xl flex items-center gap-2">
                    <sentiment.Icon size={14} className={sentiment.color} />
                    <span className={`font-bold text-lg ${sentiment.color}`}>{sentiment.state}</span>
                </div>
                <div className="text-3xl font-black text-white mt-2">{sentiment.score}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Índice</div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-auto">
                {sentiment.factors.map((f, i) => (
                    <div key={i} className={`p-2 rounded-lg text-center ${f.positive ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                        <div className="text-[10px] text-slate-400 mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{f.name}</div>
                        <div className={`text-sm font-bold ${f.positive ? 'text-emerald-400' : 'text-red-400'}`}>{f.value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};
