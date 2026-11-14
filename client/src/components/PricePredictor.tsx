import React, { useEffect, useState, useMemo } from 'react';
import { Target, TrendingUp, TrendingDown, RefreshCw, AlertTriangle } from 'lucide-react';
import { FinancialDisclaimer } from './ui/FinancialDisclaimer';
import { DataFreshness } from './ui/DataFreshness';
import { apiService } from '../services/api';
import { linearRegression, walkForwardBacktest, type DataPoint } from '../utils/predictor';

interface PredictorProps { currentBlue?: number; }

export const PricePredictor: React.FC<PredictorProps> = ({ currentBlue = 0 }) => {
    const [history, setHistory] = useState<DataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [source, setSource] = useState({ source: 'estimado', isEstimated: true, timestamp: '' });

    useEffect(() => {
        let active = true;
        void apiService.getHistorical('blue', '1Y').then((data: { labels?: string[]; values?: number[]; source?: string; isEstimated?: boolean; timestamp?: string }) => {
            if (!active) return;
            const dated = (data.labels ?? []).map((label, index) => ({ time: Date.parse(label), price: Number(data.values?.[index]) }))
                .filter(point => Number.isFinite(point.time) && Number.isFinite(point.price) && point.price > 0)
                .sort((a, b) => a.time - b.time);
            const first = dated[0]?.time ?? 0;
            setHistory(dated.map(point => ({ day: (point.time - first) / 86400_000, price: point.price })));
            setSource({ source: data.source ?? 'estimado', isEstimated: data.isEstimated ?? true, timestamp: data.timestamp ?? '' });
            setLoading(false);
        });
        return () => { active = false; };
    }, []);

    const { slope, intercept, r2 } = useMemo(() => linearRegression(history), [history]);
    const backtests = useMemo(() => [7, 14, 30].map(horizon => ({ horizon, ...walkForwardBacktest(history, horizon) })), [history]);
    const lastDay = history[history.length - 1]?.day ?? 0;

    const predict = (dayOffset: number) =>
        slope * (lastDay + dayOffset) + intercept;

    const pred7 = predict(7);
    const pred14 = predict(14);
    const pred30 = predict(30);

    const fmt = (n: number) => !Number.isFinite(n) ? '—' : n > 0
        ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
        : '--';

    const trend7 = pred7 - currentBlue;
    const isUp = trend7 >= 0;
    const confidence = r2 > 0.7 ? 'Alta' : r2 > 0.4 ? 'Media' : 'Baja';
    const confColor = r2 > 0.7 ? 'text-emerald-400' : r2 > 0.4 ? 'text-amber-400' : 'text-rose-400';

    // Sparkline SVG
    const W = 300; const H = 60;
    const bands = backtests.map(result => {
        const prediction = predict(result.horizon);
        const error = result.mape ?? 0;
        return { horizon: result.horizon, low: prediction * (1 - error / 100), high: prediction * (1 + error / 100) };
    });
    const allPrices = [...history.map(d => d.price), pred7, pred30, ...bands.flatMap(band => [band.low, band.high])];
    const minP = Math.min(...allPrices) * 0.998;
    const maxP = Math.max(...allPrices) * 1.002;
    const toY = (p: number) => H - ((p - minP) / (maxP - minP || 1)) * H;
    const toX = (day: number) => day / (lastDay + 30 || 1) * W;

    const histPts = history.map(d => `${toX(d.day)},${toY(d.price)}`);
    const predPts = [7, 14, 30].map(d => `${toX(lastDay + d)},${toY(predict(d))}`);

    return (
        <div className="glass-panel no-lift p-5">
            <FinancialDisclaimer />
            <DataFreshness source={source.source} updatedAt={source.timestamp || undefined} isEstimated={source.isEstimated} />
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Target size={14} className="text-fuchsia-400" />
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Predictor de Precio</h3>
                    <span className="text-[9px] bg-fuchsia-400/10 text-fuchsia-400 border border-fuchsia-400/20 px-1.5 py-0.5 rounded font-bold">REGRESIÓN LINEAL</span>
                </div>
                {loading && <RefreshCw size={12} className="animate-spin text-slate-500" />}
            </div>

            {currentBlue > 0 && !loading && history.length >= 2 ? (
                <>
                    {/* Sparkline */}
                    <div className="mb-4 overflow-hidden rounded-lg bg-white/3">
                        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 60 }} preserveAspectRatio="none" role="img" aria-label="Historial y proyección estimada del dólar blue con banda de error histórico">
                            <polygon points={[
                                ...bands.map(band => `${toX(lastDay + band.horizon)},${toY(band.high)}`),
                                ...[...bands].reverse().map(band => `${toX(lastDay + band.horizon)},${toY(band.low)}`),
                            ].join(' ')} fill="#a78bfa" opacity="0.15" />
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
                                cx={toX(lastDay)}
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
                    {backtests.map(result => <p key={result.horizon} className="text-xs text-slate-300">
                        {result.horizon} días: {result.mape === null ? 'historial insuficiente' : `Error histórico promedio ±${result.mape.toFixed(1)}% · dirección acertada ${result.hitRate?.toFixed(1)}% (${result.samples} casos)`}
                        {result.mape !== null && result.mape > 10 && ' · Advertencia: error histórico alto.'}
                    </p>)}
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Ajuste del modelo:</span>
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
                    {loading ? 'Cargando historial...' : 'Historial insuficiente para proyectar.'}
                </div>
            )}
        </div>
    );
};
