import React, { useMemo } from 'react';
import { Sparkles, AlertTriangle, CheckCircle } from 'lucide-react';

interface SmartRecommendationProps {
    blue?: number;
    oficial?: number;
    mep?: number;
    ccl?: number;
    rofexImpliedRate?: number; // TNA implícita ROFEX
    inflation?: number; // % mensual
    badlarTNA?: number;
}

interface Recommendation {
    instrument: string;
    emoji: string;
    score: number; // 0-100
    reason: string;
    verdict: 'ideal' | 'bueno' | 'neutro' | 'evitar';
    color: string;
}

function getRecommendations(props: SmartRecommendationProps): Recommendation[] {
    const { blue = 0, oficial = 0, mep: _mep = 0, ccl: _ccl = 0, rofexImpliedRate = 50, inflation = 4, badlarTNA = 110 } = props;

    const brecha = oficial > 0 ? ((blue - oficial) / oficial) * 100 : 0;
    const brechaHigh = brecha > 50;
    const plazofijoBeatInfl = badlarTNA / 12 > inflation;
    const rofexAnual = rofexImpliedRate;

    const recs: Recommendation[] = [];

    // Plazo fijo
    recs.push({
        instrument: 'Plazo Fijo',
        emoji: '🏦',
        score: plazofijoBeatInfl ? 65 : 35,
        reason: plazofijoBeatInfl
            ? `TNA ${badlarTNA}% supera inflación mensual de ${inflation}%. Riesgo bajo.`
            : `TNA ${badlarTNA}% < inflación ${(inflation * 12).toFixed(0)}% anual. Pérdida real.`,
        verdict: plazofijoBeatInfl ? 'bueno' : 'evitar',
        color: plazofijoBeatInfl ? 'text-blue-400' : 'text-rose-400',
    });

    // Dólar MEP
    const mepScore = brechaHigh ? 85 : (brecha > 20 ? 65 : 45);
    recs.push({
        instrument: 'Dólar MEP',
        emoji: '💵',
        score: mepScore,
        reason: brechaHigh
            ? `Brecha ${brecha.toFixed(0)}% sugiere presión cambiaria. MEP es refugio de valor.`
            : `Brecha baja (${brecha.toFixed(0)}%): el MEP está más alineado al oficial.`,
        verdict: mepScore >= 75 ? 'ideal' : mepScore >= 55 ? 'bueno' : 'neutro',
        color: mepScore >= 75 ? 'text-emerald-400' : 'text-slate-300',
    });

    // ROFEX / Futuros
    const rofexBeatInfl = rofexAnual > badlarTNA;
    recs.push({
        instrument: 'Futuros ROFEX',
        emoji: '📅',
        score: rofexBeatInfl ? 75 : 50,
        reason: rofexBeatInfl
            ? `TNA implícita ROFEX ~${rofexAnual.toFixed(0)}% > BADLAR. Cobertura rentable.`
            : `TNA implícita ROFEX ~${rofexAnual.toFixed(0)}%. Similar al plazo fijo.`,
        verdict: rofexBeatInfl ? 'bueno' : 'neutro',
        color: rofexBeatInfl ? 'text-violet-400' : 'text-slate-400',
    });

    // On-chain stablecoins
    recs.push({
        instrument: 'USDT/Stables',
        emoji: '⚡',
        score: brechaHigh ? 90 : 60,
        reason: brechaHigh
            ? `Con brecha alta, dolarizarse en stables protege mejor que el plazo fijo ARS.`
            : `Brecha baja: riesgo de convergencia. Cuidado con la volatilidad cambiaria.`,
        verdict: brechaHigh ? 'ideal' : 'neutro',
        color: brechaHigh ? 'text-amber-400' : 'text-slate-400',
    });

    // CEDEARs
    recs.push({
        instrument: 'CEDEARs',
        emoji: '📊',
        score: 70,
        reason: 'Exposición a dólar CCL vía acciones internacionales. Diversificación natural.',
        verdict: 'bueno',
        color: 'text-sky-400',
    });

    return recs.sort((a, b) => b.score - a.score);
}

const verdictConfig = {
    ideal: { label: '⭐ IDEAL', bg: 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400' },
    bueno: { label: '✓ BUENO', bg: 'bg-blue-400/10 border-blue-400/20 text-blue-400' },
    neutro: { label: '○ NEUTRO', bg: 'bg-slate-400/10 border-slate-700 text-slate-400' },
    evitar: { label: '✗ EVITAR', bg: 'bg-rose-400/10 border-rose-400/20 text-rose-400' },
};

export const SmartRecommendation: React.FC<SmartRecommendationProps> = (props) => {
    const recs = useMemo(() => getRecommendations(props), [props]);
    const top = recs[0];

    return (
        <div className="glass-panel no-lift p-6">
            <div className="flex items-center gap-2 mb-4">
                <Sparkles size={14} className="text-amber-400" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">¿En qué conviene ahorrar hoy?</h3>
                <span className="text-[9px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">ANÁLISIS AUTOMÁTICO</span>
            </div>

            {/* Top pick */}
            <div className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 mb-4">
                <span className="text-3xl">{top.emoji}</span>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`font-bold text-base ${top.color}`}>{top.instrument}</span>
                        <CheckCircle size={14} className="text-emerald-400" />
                        <span className="text-[9px] px-1.5 py-0.5 bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 rounded font-bold">MEJOR OPCIÓN HOY</span>
                    </div>
                    <p className="text-xs text-slate-400">{top.reason}</p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-black font-mono text-white">{top.score}</div>
                    <div className="text-[9px] text-slate-500">score</div>
                </div>
            </div>

            {/* All recommendations */}
            <div className="space-y-2">
                {recs.slice(1).map((r, _i) => {
                    const vc = verdictConfig[r.verdict];
                    return (
                        <div key={r.instrument} className="flex items-center gap-3 p-2.5 rounded-lg border border-white/5 hover:bg-white/5 transition-colors">
                            <span className="text-lg w-7 text-center flex-shrink-0">{r.emoji}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-semibold ${r.color}`}>{r.instrument}</span>
                                </div>
                                <p className="text-[10px] text-slate-600 truncate">{r.reason}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${vc.bg}`}>{vc.label}</span>
                                <span className="text-xs font-mono text-slate-500">{r.score}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <p className="text-[9px] text-slate-700 mt-3 flex items-center gap-1">
                <AlertTriangle size={9} className="text-slate-700" />
                Análisis automático basado en datos de mercado. No es asesoramiento financiero profesional.
            </p>
        </div>
    );
};
