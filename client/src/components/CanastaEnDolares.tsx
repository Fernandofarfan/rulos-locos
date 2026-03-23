import React, { useState } from 'react';
import { ShoppingCart, TrendingUp, TrendingDown, Info } from 'lucide-react';

interface Canasta {
    tipo: string;
    emoji: string;
    arsValue: number;
    description: string;
}

// Valores estimados Ene 2025 basados en INDEC (aproximados)
const CANASTAS: Canasta[] = [
    { tipo: 'Alimentaria (CBA)', emoji: '🍞', arsValue: 230000, description: 'Cubre necesidades calóricas mínimas (4 personas)' },
    { tipo: 'Básica Total (CBT)', emoji: '🏠', arsValue: 520000, description: 'CBA + bienes y servicios no alimentarios (4 personas)' },
    { tipo: 'Indigencia (1p)', emoji: '👤', arsValue: 57500, description: 'Línea de indigencia per cápita' },
    { tipo: 'Pobreza (1p)', emoji: '👥', arsValue: 130000, description: 'Línea de pobreza per cápita' },
];

interface CanastaEnDolaresProps {
    blue?: number;
    oficial?: number;
    mep?: number;
    ccl?: number;
}

export const CanastaEnDolares: React.FC<CanastaEnDolaresProps> = ({
    blue = 0, oficial = 0, mep = 0, ccl = 0,
}) => {
    const [selected, setSelected] = useState(0);
    const canasta = CANASTAS[selected];

    const rates = [
        { name: 'Blue', emoji: '💎', rate: blue, color: 'text-indigo-400' },
        { name: 'MEP', emoji: '🏦', rate: mep, color: 'text-sky-400' },
        { name: 'CCL', emoji: '🌎', rate: ccl, color: 'text-violet-400' },
        { name: 'Oficial', emoji: '🏛️', rate: oficial, color: 'text-slate-400' },
    ].filter(r => r.rate > 0);

    const fmtARS = (n: number) =>
        new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
    const fmtUSD = (n: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

    const blueUSD = blue > 0 ? canasta.arsValue / blue : 0;

    // Evolution: in USD, what was it 12 months ago? Simplified: blue 12m ago approx 50% of today
    const old12mBlue = blue * 0.55;
    const old12mUSD = old12mBlue > 0 ? canasta.arsValue * 0.55 / old12mBlue : 0;
    const changePct = old12mUSD > 0 ? ((blueUSD - old12mUSD) / old12mUSD) * 100 : 0;

    return (
        <div className="glass-panel no-lift p-5">
            <div className="flex items-center gap-2 mb-4">
                <ShoppingCart size={14} className="text-orange-400" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Canasta Básica en Dólares</h3>
            </div>

            {/* Canasta selector */}
            <div className="grid grid-cols-2 gap-1.5 mb-4">
                {CANASTAS.map((c, i) => (
                    <button
                        key={c.tipo}
                        onClick={() => setSelected(i)}
                        className={`text-left p-2 rounded-xl border text-[10px] transition-all ${selected === i ? 'bg-orange-400/10 border-orange-400/30 text-orange-300' : 'border-white/5 bg-white/3 text-slate-500 hover:text-white'}`}
                    >
                        <div className="font-bold">{c.emoji} {c.tipo}</div>
                    </button>
                ))}
            </div>

            {/* Description */}
            <div className="flex items-start gap-2 text-[10px] text-slate-500 bg-white/3 rounded-lg p-2.5 mb-4">
                <Info size={10} className="flex-shrink-0 mt-0.5 text-orange-400/60" />
                <span>{canasta.description}. Valor INDEC: <strong className="text-slate-400">{fmtARS(canasta.arsValue)}</strong></span>
            </div>

            {/* USD values by rate */}
            <div className="space-y-2 mb-4">
                {rates.map(r => {
                    const usd = canasta.arsValue / r.rate;
                    return (
                        <div key={r.name} className="flex items-center justify-between p-2.5 rounded-xl bg-white/3 border border-white/5">
                            <div className="flex items-center gap-2">
                                <span>{r.emoji}</span>
                                <span className={`text-xs font-bold ${r.color}`}>Al {r.name}</span>
                                <span className="text-[9px] text-slate-600 font-mono">(${r.rate.toLocaleString('es-AR', { maximumFractionDigits: 0 })})</span>
                            </div>
                            <span className="font-mono font-bold text-sm text-white">{fmtUSD(usd)}</span>
                        </div>
                    );
                })}
            </div>

            {/* Blue trend */}
            {blueUSD > 0 && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${changePct >= 0 ? 'bg-emerald-400/5 border-emerald-400/15' : 'bg-rose-400/5 border-rose-400/15'}`}>
                    {changePct >= 0 ? <TrendingUp size={12} className="text-emerald-400" /> : <TrendingDown size={12} className="text-rose-400" />}
                    <span className="text-slate-400">
                        Vs hace 12 meses (al blue): canasta cuesta
                        {' '}<strong className={changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {changePct >= 0 ? '+' : ''}{changePct.toFixed(0)}%
                        </strong>
                        {' '}{changePct >= 0 ? 'más' : 'menos'} en USD.
                    </span>
                </div>
            )}

            <p className="text-[9px] text-slate-700 mt-3">Valores canasta basados en estimaciones INDEC 2025.</p>
        </div>
    );
};
