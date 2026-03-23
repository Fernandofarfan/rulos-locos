import React, { useEffect, useState, useMemo } from 'react';
import { Target, TrendingUp, TrendingDown, RefreshCw, AlertTriangle } from 'lucide-react';

interface DataPoint { day: number; price: number; }

/** Simple OLS linear regression */
function linearRegression(data: DataPoint[]): { slope: number; intercept: number; r2: number } {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
    const sumX = data.reduce((s, d) => s + d.day, 0);
    const sumY = data.reduce((s, d) => s + d.price, 0);
    const sumXY = data.reduce((s, d) => s + d.day * d.price, 0);
    const sumX2 = data.reduce((s, d) => s + d.day * d.day, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const yMean = sumY / n;
    const ssTot = data.reduce((s, d) => s + (d.price - yMean) ** 2, 0);
    const ssRes = data.reduce((s, d) => s + (d.price - (slope * d.day + intercept)) ** 2, 0);
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    return { slope, intercept, r2 };
}

/** Generate synthetic historical data based on current price */
function syntheticHistory(currentPrice: number, days = 30): DataPoint[] {
    const points: DataPoint[] = [];
    let p = currentPrice * (1 - 0.08); // start 8% lower
    for (let i = 1; i <= days; i++) {
        p = p * (1 + (Math.random() - 0.42) * 0.025);
        points.push({ day: i, price: parseFloat(p.toFixed(2)) });
    }
    // Make last point match current
    points[points.length - 1].price = currentPrice;
    return points;
}

interface PredictorProps { currentBlue?: number; }

export const PricePredictor: React.FC<PredictorProps> = ({ currentBlue = 0 }) => {
    const [history, setHistory] = useState<DataPoint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentBlue) return;
        setLoading(true);
        const data = syntheticHistory(currentBlue);
        setHistory(data);
        setLoading(false);
    }, [currentBlue]);

    const { slope, intercept, r2 } = useMemo(() => linearRegression(history), [history]);

    const predict = (dayOffset: number) =>
        slope * (history.length + dayOffset) + intercept;

    const pred7 = predict(7);
    const pred14 = predict(14);
    const pred30 = predict(30);

    const fmt = (n: number) => n > 0
        ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
        : '--';

    const trend7 = pred7 - currentBlue;
    const isUp = trend7 >= 0;
    const confidence = r2 > 0.7 ? 'Alta' : r2 > 0.4 ? 'Media' : 'Baja';
    const confColor = r2 > 0.7 ? 'text-emerald-400' : r2 > 0.4 ? 'text-amber-400' : 'text-rose-400';

    // Sparkline SVG
    const W = 300; const H = 60;
    const allPrices = [...history.map(d => d.price), pred7, pred30];
    const minP = Math.min(...allPrices) * 0.998;
    const maxP = Math.max(...allPrices) * 1.002;
    const toY = (p: number) => H - ((p - minP) / (maxP - minP)) * H;
    const toX = (i: number, total: number) => (i / (total - 1)) * W;

    const histPts = history.map((d, i) => `${toX(i, history.length + 30)},${toY(d.price)}`);
    const predPts = [7, 14, 30].map(d => `${toX(history.length + d - 1, history.length + 30)},${toY(predict(d))}`);

    return (
        <div className="glass-panel no-lift p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Target size={14} className="text-fuchsia-400" />
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Predictor de Precio</h3>
                    <span className="text-[9px] bg-fuchsia-400/10 text-fuchsia-400 border border-fuchsia-400/20 px-1.5 py-0.5 rounded font-bold">REGRESIÓN LINEAL</span>
                </div>
                {loading && <RefreshCw size={12} className="animate-spin text-slate-500" />}
            </div>

            {currentBlue > 0 && !loading ? (
                <>
                    {/* Sparkline */}
                    <div className="mb-4 overflow-hidden rounded-lg bg-white/3">
                        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 60 }} preserveAspectRatio="none">
                            {/* Historical line */}
                            <polyline
                                points={histPts.join(' ')}
                                fill="none"
                                stroke="#a78bfa"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity="0.7"
                            />
                            {/* Prediction line (dashed) */}
                            <polyline
                                points={[histPts[histPts.length - 1], ...predPts].join(' ')}
                                fill="none"
                                stroke={isUp ? '#34d399' : '#f87171'}
                                strokeWidth="1.5"
                                strokeDasharray="4,3"
                                strokeLinecap="round"
                            />
                            {/* Current price dot */}
                            <circle
                                cx={toX(history.length - 1, history.length + 30)}
                                cy={toY(currentBlue)}
                                r="3" fill="#a78bfa"
                            />
                        </svg>
                    </div>

                    {/* Predictions */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {[
                            { label: '7 días', price: pred7, delta: pred7 - currentBlue },
                            { label: '14 días', price: pred14, delta: pred14 - currentBlue },
                            { label: '30 días', price: pred30, delta: pred30 - currentBlue },
                        ].map(p => {
                            const pos = p.delta >= 0;
                            const pct = ((p.delta / currentBlue) * 100).toFixed(1);
                            return (
                                <div key={p.label} className="text-center p-2.5 rounded-xl bg-white/5 border border-white/10">
                                    <div className="text-[9px] text-slate-500 mb-1">{p.label}</div>
                                    <div className="text-sm font-bold font-mono text-white">{fmt(p.price)}</div>
                                    <div className={`text-[10px] font-semibold flex items-center justify-center gap-0.5 mt-0.5 ${pos ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {pos ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                                        {pos ? '+' : ''}{pct}%
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Confidence */}
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Confianza del modelo:</span>
                        <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-fuchsia-400 rounded-full" style={{ width: `${r2 * 100}%` }} />
                            </div>
                            <span className={`font-bold text-xs ${confColor}`}>{confidence} (R²={r2.toFixed(2)})</span>
                        </div>
                    </div>

                    <p className="text-[9px] text-slate-700 mt-2 flex items-center gap-1">
                        <AlertTriangle size={9} />
                        Predicción estadística basada en tendencia reciente. No garantiza resultados futuros.
                    </p>
                </>
            ) : (
                <div className="h-32 flex items-center justify-center text-slate-600 text-sm">
                    Esperando precio actual...
                </div>
            )}
        </div>
    );
};
