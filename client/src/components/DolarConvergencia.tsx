import React, { useEffect, useState } from 'react';
import { Scale, RefreshCw, Info } from 'lucide-react';
import { Tooltip } from './ui/Tooltip';
import { apiService } from '../services/api';

interface ConvergenceData {
    m2ars: number;           // Masa monetaria M2 en ARS (millones)
    reservasUSD: number;     // Reservas brutas en USD (millones)
    dolarConvergencia: number; // M2 / reservas
    dolarBlue: number;
    dolarOficial: number;
    dolarCCL: number;
    brechaVsBlue: number;   // % diferencia entre convergencia y blue
    updatedAt: string;
}

// M2 Argentina actualizado (fuente BCRA - dato estimado a Ene 2025)
const M2_ESTIMADO_MILLONES = 37_500_000; // ~37.5 billones ARS

export const DolarConvergencia: React.FC = () => {
    const [data, setData] = useState<ConvergenceData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [economics, arbitrage] = await Promise.allSettled([
                apiService.getEconomics(),
                apiService.getArbitrage(),
            ]);

            const eco = economics.status === 'fulfilled' ? economics.value : null;
            const arb = arbitrage.status === 'fulfilled' ? arbitrage.value : null;

            // Reservas brutas ya vienen expresadas en millones USD (ej: 30000 = 30 mil millones = 30B USD)
            const reservasUSD = (eco?.macro?.reserves ?? 27000);
            const reservasMM = typeof reservasUSD === 'number'
                ? reservasUSD
                : 27000; // fallback

            // Dólar de convergencia = M2 (en millones ARS) / Reservas (en millones USD)
            const dolarConv = parseFloat((M2_ESTIMADO_MILLONES / reservasMM).toFixed(2));

            const blue = (arb as { dolares?: { blue?: { venta?: number } } })?.dolares?.blue?.venta ?? 0;
            const oficial = (arb as { dolares?: { oficial?: { venta?: number } } })?.dolares?.oficial?.venta ?? 0;
            const ccl = (arb as { dolares?: { ccl?: { venta?: number } } })?.dolares?.ccl?.venta ?? 0;
            const brechaVsBlue = blue > 0 ? parseFloat((((dolarConv - blue) / blue) * 100).toFixed(1)) : 0;

            setData({
                m2ars: M2_ESTIMADO_MILLONES,
                reservasUSD: reservasMM,
                dolarConvergencia: dolarConv,
                dolarBlue: blue,
                dolarOficial: oficial,
                dolarCCL: ccl,
                brechaVsBlue,
                updatedAt: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const iv = setInterval(fetchData, 5 * 60_000); // c/5 min
        return () => clearInterval(iv);
    }, []);

    const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
    const fmtB = (n: number) => `$${(n / 1000).toFixed(1)}B USD`;

    if (!data) return (
        <div className="glass-panel no-lift p-6 flex items-center justify-center h-48 animate-pulse">
            <RefreshCw className="animate-spin text-slate-500" size={20} />
        </div>
    );

    const convergIsHigher = data.dolarConvergencia > data.dolarBlue;

    return (
        <div className="glass-panel no-lift p-6">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <Scale size={14} className="text-violet-400" />
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dólar de Convergencia</h3>
                    <Tooltip
                        content="Tipo de cambio implícito según la relación M2 (masa monetaria) / Reservas brutas del BCRA. Estimación teórica del precio de equilibrio."
                        placement="top"
                    >
                        <Info size={12} className="text-slate-600 cursor-help" />
                    </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                    {loading && <RefreshCw size={12} className="animate-spin text-slate-500" />}
                    <span className="text-[9px] text-slate-600">{data.updatedAt}</span>
                </div>
            </div>

            {/* Main figure */}
            <div className="flex items-end gap-3 mb-6">
                <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Dólar de Convergencia</div>
                    <div className="text-5xl font-black font-mono text-violet-300">{fmt(data.dolarConvergencia)}</div>
                    <div className="text-xs text-slate-500 mt-1">M2 ARS / Reservas USD</div>
                </div>
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm font-bold mb-1 ${convergIsHigher ? 'text-rose-400 bg-rose-400/10 border-rose-400/20' : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'}`}>
                    {convergIsHigher ? '▲' : '▼'}
                    {Math.abs(data.brechaVsBlue)}% vs Blue
                </div>
            </div>

            {/* Comparación con otros tipos */}
            <div className="space-y-2 mb-5">
                {[
                    { label: 'Dólar Official', value: data.dolarOficial, color: 'text-slate-300' },
                    { label: 'Dólar Blue', value: data.dolarBlue, color: 'text-blue-300' },
                    { label: 'Dólar CCL', value: data.dolarCCL, color: 'text-cyan-300' },
                    { label: '⚖️ Convergencia', value: data.dolarConvergencia, color: 'text-violet-300' },
                ].filter(r => r.value > 0).sort((a, b) => a.value - b.value).map(row => {
                    const barW = Math.min(100, (row.value / (data.dolarConvergencia * 1.2)) * 100);
                    return (
                        <div key={row.label}>
                            <div className="flex items-center justify-between text-xs mb-1">
                                <span className={`font-medium ${row.color}`}>{row.label}</span>
                                <span className="font-mono font-bold text-white">{fmt(row.value)}</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-current opacity-40 rounded-full transition-all duration-700"
                                    style={{ width: `${barW}%`, color: row.color.replace('text-', '') === 'violet-300' ? '#c4b5fd' : undefined }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Fórmula */}
            <div className="bg-white/3 rounded-xl p-3 border border-white/5 text-[10px] text-slate-500 space-y-1">
                <div className="flex justify-between"><span>Masa Monetaria M2 (estimada):</span><span className="font-mono text-slate-400">${(data.m2ars / 1_000_000).toFixed(1)}B ARS</span></div>
                <div className="flex justify-between"><span>Reservas Brutas BCRA:</span><span className="font-mono text-slate-400">{fmtB(data.reservasUSD)}</span></div>
                <div className="flex justify-between font-bold border-t border-white/5 pt-1 mt-1"><span>Convergencia = M2 ÷ Reservas:</span><span className="font-mono text-violet-400">{fmt(data.dolarConvergencia)}</span></div>
            </div>
        </div>
    );
};
