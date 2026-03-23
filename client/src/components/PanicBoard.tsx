import React, { useMemo } from 'react';
import { AlertTriangle, TrendingDown, Shield, X } from 'lucide-react';

interface PanicBoardProps {
    riskCountry?: number;
    bluePrice?: number;
    previousBluePrice?: number;
    onDismiss: () => void;
}

/**
 * PanicBoard — Modo emergencia.
 * Se activa cuando:
 * - Riesgo país > 2500 puntos
 * - Devaluación abrupta del Blue > 5% en un día
 */
export const PanicBoard: React.FC<PanicBoardProps> = ({
    riskCountry = 0,
    bluePrice = 0,
    previousBluePrice = 0,
    onDismiss,
}) => {
    const alerts = useMemo(() => {
        const a: { type: 'critical' | 'warning'; title: string; detail: string; icon: React.FC<any> }[] = [];

        if (riskCountry > 2500) {
            a.push({
                type: 'critical',
                title: `Riesgo País: ${riskCountry} pts`,
                detail: 'El riesgo país superó los 2500 puntos. Volatilidad extrema esperada.',
                icon: Shield,
            });
        } else if (riskCountry > 2000) {
            a.push({
                type: 'warning',
                title: `Riesgo País elevado: ${riskCountry} pts`,
                detail: 'El riesgo país supera los 2000 puntos. Precaución con activos en ARS.',
                icon: Shield,
            });
        }

        if (previousBluePrice > 0 && bluePrice > 0) {
            const devalPct = ((bluePrice - previousBluePrice) / previousBluePrice) * 100;
            if (devalPct > 5) {
                a.push({
                    type: 'critical',
                    title: `Devaluación abrupta: +${devalPct.toFixed(1)}%`,
                    detail: `El dólar Blue saltó de $${previousBluePrice} a $${bluePrice} en el día.`,
                    icon: TrendingDown,
                });
            } else if (devalPct > 3) {
                a.push({
                    type: 'warning',
                    title: `Blue sube fuerte: +${devalPct.toFixed(1)}%`,
                    detail: `El dólar Blue pasó de $${previousBluePrice} a $${bluePrice}.`,
                    icon: TrendingDown,
                });
            }
        }

        return a;
    }, [riskCountry, bluePrice, previousBluePrice]);

    if (alerts.length === 0) return null;

    const hasCritical = alerts.some(a => a.type === 'critical');

    return (
        <div className={`relative overflow-hidden rounded-2xl border p-4 mb-6 animate-fade-in ${
            hasCritical
                ? 'bg-red-950/40 border-red-500/30'
                : 'bg-amber-950/30 border-amber-500/20'
        }`}>
            {/* Pulsing background */}
            {hasCritical && (
                <div className="absolute inset-0 bg-red-500/5 animate-pulse-soft pointer-events-none" />
            )}

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={18} className={hasCritical ? 'text-red-400' : 'text-amber-400'} />
                        <span className={`text-xs font-black uppercase tracking-wider ${
                            hasCritical ? 'text-red-400' : 'text-amber-400'
                        }`}>
                            {hasCritical ? '⚠️ ALERTA CRÍTICA' : '⚡ ALERTA DE MERCADO'}
                        </span>
                    </div>
                    <button
                        onClick={onDismiss}
                        className="p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-all"
                    >
                        <X size={14} />
                    </button>
                </div>

                <div className="space-y-2">
                    {alerts.map((alert, i) => {
                        const Icon = alert.icon;
                        return (
                            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${
                                alert.type === 'critical' ? 'bg-red-500/10' : 'bg-amber-500/10'
                            }`}>
                                <Icon size={16} className={`mt-0.5 flex-shrink-0 ${
                                    alert.type === 'critical' ? 'text-red-400' : 'text-amber-400'
                                }`} />
                                <div>
                                    <p className={`text-sm font-bold ${
                                        alert.type === 'critical' ? 'text-red-300' : 'text-amber-300'
                                    }`}>{alert.title}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{alert.detail}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
