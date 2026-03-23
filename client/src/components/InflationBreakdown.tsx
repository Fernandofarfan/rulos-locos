import React from 'react';
import { Apple, Heart, Home, Zap, Car, BookOpen, Utensils, Info, TrendingUp } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';

// ─────────────────────────────────────────────────────────────────────────────
// Pesos relativos por rubro basados en la canasta IPC INDEC (base 2015=100).
// El promedio de los pesos = 1.0 → valor_rubro = peso × mensual_real
// ─────────────────────────────────────────────────────────────────────────────
const RUBROS_BASE = [
    { name: 'Alimentos',          icon: Apple,    color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20', weight: 0.84 },
    { name: 'Salud',              icon: Heart,    color: 'text-rose-400',    bgColor: 'bg-rose-500/10',    borderColor: 'border-rose-500/20',    weight: 1.18 },
    { name: 'Vivienda/Servicios', icon: Home,     color: 'text-amber-400',   bgColor: 'bg-amber-500/10',   borderColor: 'border-amber-500/20',   weight: 1.86 },
    { name: 'Transporte',         icon: Car,      color: 'text-blue-400',    bgColor: 'bg-blue-500/10',    borderColor: 'border-blue-500/20',    weight: 0.73 },
    { name: 'Educación',          icon: BookOpen, color: 'text-purple-400',  bgColor: 'bg-purple-500/10',  borderColor: 'border-purple-500/20',  weight: 0.39 },
    { name: 'Restaurantes',       icon: Utensils, color: 'text-orange-400',  bgColor: 'bg-orange-500/10',  borderColor: 'border-orange-500/20',  weight: 1.0  },
];

export const InflationBreakdown: React.FC = () => {
    const { economics, loading } = useDashboardData();

    const mensual: number  = (economics?.macro?.inflation as any)?.mensual ?? 0;
    const interanual: number = (economics?.macro?.inflation as any)?.interanual ?? 0;
    const fecha: string    = (economics?.macro?.inflation as any)?.fecha ?? '';

    // Categorías reales si la API las devuelve; null → escala proporcional
    const apiCategorias: { categoria: string; valor: number }[] | null =
        (economics?.macro?.inflation as any)?.categorias ?? null;

    const rubros = RUBROS_BASE.map(r => {
        let pct = r.weight * mensual;
        if (apiCategorias) {
            const match = apiCategorias.find(c =>
                c.categoria?.toLowerCase().includes(r.name.split('/')[0].toLowerCase())
            );
            if (match) pct = match.valor;
        }
        return { ...r, pct: parseFloat(pct.toFixed(2)) };
    });

    const fechaLabel = fecha
        ? new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }).toUpperCase()
        : '—';

    return (
        <div className="glass-panel p-6">
            <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                        <Zap size={18} className="text-rose-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Desglose de Inflación</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                            {apiCategorias ? 'Datos reales INDEC · ArgentinaDatos' : 'Pesos proporcionales · Canasta IPC INDEC'}
                        </p>
                    </div>
                </div>

                {/* IPC mensual real destacado */}
                {!loading && mensual > 0 && (
                    <div className="flex flex-col items-end shrink-0">
                        <div className="flex items-center gap-1 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                            <TrendingUp size={9} /> IPC {fechaLabel}
                        </div>
                        <div className="text-xl font-black font-mono text-rose-400">
                            +{mensual.toFixed(1)}%
                        </div>
                        {interanual > 0 && (
                            <div className="text-[9px] text-slate-500 font-mono text-right">
                                interanual {interanual.toFixed(1)}%
                            </div>
                        )}
                    </div>
                )}
            </div>

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {RUBROS_BASE.map(r => (
                        <div key={r.name} className="h-16 bg-white/[0.03] rounded-xl animate-pulse border border-white/5" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {rubros.map(r => (
                        <div
                            key={r.name}
                            className={`${r.bgColor} rounded-xl p-3 border ${r.borderColor} flex items-center gap-3 hover:brightness-110 transition-all`}
                        >
                            <div className={`p-2 rounded-lg bg-white/5 ${r.color} flex-shrink-0`}>
                                <r.icon size={16} />
                            </div>
                            <div>
                                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider leading-tight">{r.name}</div>
                                <div className={`text-sm font-black font-mono ${r.color}`}>+{r.pct}%</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-5 bg-rose-500/5 rounded-xl p-3 border border-rose-500/10">
                <div className="flex items-start gap-2">
                    <Info size={12} className="text-rose-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-slate-400 leading-tight">
                        {apiCategorias
                            ? 'Rubros con datos oficiales del último informe IPC (INDEC) vía ArgentinaDatos.'
                            : `Los rubros son una estimación proporcional al IPC mensual real (${mensual > 0 ? `${mensual.toFixed(1)}%` : '—'}) según pesos históricos de la canasta INDEC. Vivienda/Servicios y Salud suelen liderar las subas.`
                        }
                    </p>
                </div>
            </div>
        </div>
    );
};
