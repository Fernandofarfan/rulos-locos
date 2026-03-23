import React, { useState } from 'react';
import { Calculator, Info } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';

interface ResultBlock {
    label: string;
    value: string;
    sub?: string;
    positive?: boolean;
    neutral?: boolean;
}

export const RealRateCalculator: React.FC = () => {
    const { economics } = useDashboardData();

    const inflacionMensual = economics?.macro?.inflation?.mensual ?? 0;

    const [tna, setTna] = useState('');
    const [plazo, setPlazo] = useState('30');
    const [capital, setCapital] = useState('1000000');

    const tnaNum = parseFloat(tna) || 0;
    const plazoNum = parseInt(plazo) || 30;
    const capitalNum = parseFloat(capital) || 1000000;

    // Tasa efectiva para el plazo
    const tasaEfectivaPeriodo = (1 + tnaNum / 100 / 365) ** plazoNum - 1;
    // Inflación estimada para el período (proporcional al plazo)
    const inflacionPeriodo = (1 + inflacionMensual / 100) ** (plazoNum / 30) - 1;
    // Tasa real Fisher: (1+nominal)/(1+inflacion) - 1
    const tasaReal = tasaEfectivaPeriodo / (1 + inflacionPeriodo) - 1; // simplificado
    const tasaRealAnualizada = (1 + tasaReal) ** (365 / plazoNum) - 1;

    const gananciasBruta = capitalNum * tasaEfectivaPeriodo;
    const poderAdquisitivoPerdido = capitalNum * inflacionPeriodo;
    const gananciaReal = capitalNum * tasaReal;
    const capitalFinal = capitalNum + gananciasBruta;

    const tem = ((1 + tnaNum / 100 / 365) ** 30 - 1) * 100;
    const tea = ((1 + tnaNum / 100 / 365) ** 365 - 1) * 100;

    const hasData = tnaNum > 0;

    const results: ResultBlock[] = hasData ? [
        {
            label: 'Intereses brutos',
            value: `$${gananciasBruta.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`,
            sub: `${(tasaEfectivaPeriodo * 100).toFixed(2)}% en ${plazoNum} días`,
            positive: true
        },
        {
            label: 'Pérdida por inflación',
            value: `-$${poderAdquisitivoPerdido.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`,
            sub: `${(inflacionPeriodo * 100).toFixed(2)}% estimado (~${inflacionMensual.toFixed(1)}%/mes)`,
            positive: false
        },
        {
            label: 'Ganancia REAL',
            value: `${gananciaReal >= 0 ? '+' : ''}$${gananciaReal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`,
            sub: `${(tasaRealAnualizada * 100).toFixed(1)}% TEA real`,
            positive: gananciaReal > 0,
            neutral: Math.abs(gananciaReal) < capitalNum * 0.002
        },
        {
            label: 'Capital final',
            value: `$${capitalFinal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`,
            sub: `Poder adq. real: $${(capitalNum + gananciaReal).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`,
            neutral: true
        }
    ] : [];

    return (
        <div className="glass-panel p-6 relative overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-5 bg-accent-primary" />

            <div className="flex items-center justify-between mb-5 relative z-10">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="p-2 bg-accent-primary/20 rounded-lg text-accent-primary">
                        <Calculator size={20} />
                    </span>
                    Calculadora Tasa Real
                </h3>
                <div className="text-[9px] text-slate-500 text-right">
                    <div>Inflación mensual actual</div>
                    <div className="text-amber-400 font-bold">{inflacionMensual.toFixed(1)}% mensual</div>
                </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-3 gap-3 mb-5 relative z-10">
                <div>
                    <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block mb-1">TNA (%)</label>
                    <input
                        type="number"
                        value={tna}
                        onChange={e => setTna(e.target.value)}
                        placeholder="Ej: 37.5"
                        className="w-full bg-black/40 text-white text-sm font-mono border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-accent-primary/50 placeholder-slate-600"
                    />
                </div>
                <div>
                    <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Plazo (días)</label>
                    <select
                        value={plazo}
                        onChange={e => setPlazo(e.target.value)}
                        className="w-full bg-black/40 text-white text-sm border border-white/10 rounded-lg px-2 py-2 outline-none focus:border-accent-primary/50"
                    >
                        <option value="30">30 días</option>
                        <option value="60">60 días</option>
                        <option value="90">90 días</option>
                        <option value="180">180 días</option>
                        <option value="365">365 días</option>
                    </select>
                </div>
                <div>
                    <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Capital ($)</label>
                    <input
                        type="number"
                        value={capital}
                        onChange={e => setCapital(e.target.value)}
                        className="w-full bg-black/40 text-white text-sm font-mono border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-accent-primary/50"
                    />
                </div>
            </div>

            {/* TNA → TEM / TEA conversión rápida */}
            {hasData && (
                <div className="grid grid-cols-2 gap-2 mb-4 relative z-10">
                    <div className="bg-white/[0.03] rounded-xl p-2.5 border border-white/5 text-center">
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider block">TEM</span>
                        <span className="text-base font-black font-mono text-accent-primary">{tem.toFixed(2)}%</span>
                    </div>
                    <div className="bg-white/[0.03] rounded-xl p-2.5 border border-white/5 text-center">
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider block">TEA</span>
                        <span className="text-base font-black font-mono text-accent-secondary">{tea.toFixed(2)}%</span>
                    </div>
                </div>
            )}

            {/* Results */}
            {hasData ? (
                <div className="space-y-2.5 relative z-10">
                    {results.map((r) => (
                        <div
                            key={r.label}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                r.neutral
                                    ? 'bg-white/[0.03] border-white/5'
                                    : r.positive
                                    ? 'bg-emerald-500/5 border-emerald-500/15'
                                    : 'bg-red-500/5 border-red-500/15'
                            }`}
                        >
                            <div>
                                <div className="text-[10px] text-slate-400 font-medium">{r.label}</div>
                                {r.sub && <div className="text-[9px] text-slate-600">{r.sub}</div>}
                            </div>
                            <div className={`font-mono font-bold text-sm ${
                                r.neutral ? 'text-white' : r.positive ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                                {r.value}
                            </div>
                        </div>
                    ))}
                    {/* Veredicto */}
                    <div className={`mt-2 p-3 rounded-xl text-center text-xs font-bold ${
                        tasaReal > 0.005
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : tasaReal > -0.005
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-red-500/10 text-red-400'
                    }`}>
                        {tasaReal > 0.005
                            ? `✓ Tasa real POSITIVA de ${(tasaRealAnualizada * 100).toFixed(1)}% TEA — ganás contra la inflación`
                            : tasaReal > -0.005
                            ? '≈ Tasa prácticamente neutral — apenas empata la inflación'
                            : `✗ Tasa real NEGATIVA de ${(tasaRealAnualizada * 100).toFixed(1)}% TEA — perdés poder adquisitivo`
                        }
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-6 text-slate-500 gap-2 relative z-10">
                    <Info size={20} className="opacity-40" />
                    <p className="text-xs">Ingresá la TNA para calcular la tasa real</p>
                    <p className="text-[10px] text-slate-600">Fórmula: (1+tasa nominal)/(1+inflación) - 1</p>
                </div>
            )}
        </div>
    );
};
