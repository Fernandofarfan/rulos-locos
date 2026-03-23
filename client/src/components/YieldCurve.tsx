import React, { useEffect, useState, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import { TrendingUp, Info, RefreshCw } from 'lucide-react';
import { apiService } from '../services/api';

interface BondPoint {
    name: string;
    law: 'ARG' | 'NY';
    duration: number;
    ytm: number;
    priceUSD: number;
    priceARS: number;
    coupon: number;
    maturity: number;
}

interface YieldData {
    points: BondPoint[];
    cclUsed: number;
    timestamp: string;
}

export const YieldCurve: React.FC = () => {
    const [data, setData] = useState<YieldData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<BondPoint | null>(null);
    const [showSpread, setShowSpread] = useState(false);
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<any>(null);

    const fetchData = async () => {
        try {
            const result = await apiService.getYieldCurve();
            setData(result);
        } catch (e) {
            console.error('YieldCurve fetch error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Build chart when data arrives
    useEffect(() => {
        if (!chartRef.current || !data?.points?.length) return;

        if (chartInstanceRef.current) {
            chartInstanceRef.current.remove();
            chartInstanceRef.current = null;
        }

        const chart = createChart(chartRef.current, {
            width: chartRef.current.clientWidth,
            height: 260,
            layout: {
                background: { color: 'transparent' } as any,
                textColor: '#94a3b8',
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
            },
            grid: {
                vertLines: { color: 'rgba(255,255,255,0.04)' },
                horzLines: { color: 'rgba(255,255,255,0.04)' },
            },
            crosshair: {
                vertLine: { color: 'rgba(255,255,255,0.2)', width: 1, style: 3, labelBackgroundColor: '#1e2535' },
                horzLine: { color: 'rgba(255,255,255,0.2)', width: 1, style: 3, labelBackgroundColor: '#1e2535' },
            },
            rightPriceScale: { borderColor: 'rgba(255,255,255,0.05)' },
            timeScale: { borderColor: 'rgba(255,255,255,0.05)', visible: false },
            handleScroll: false,
            handleScale: false,
        });

        chartInstanceRef.current = chart;

        // Law ARG points (blue)
        const argPoints = data.points.filter(p => p.law === 'ARG').sort((a, b) => a.duration - b.duration);
        // Law NY points (emerald)
        const nyPoints = data.points.filter(p => p.law === 'NY').sort((a, b) => a.duration - b.duration);

        // We use duration as "time" key — need synthetic time values
        const toTime = (duration: number) => {
            const base = new Date('2024-01-01');
            base.setMonth(base.getMonth() + Math.round(duration * 12));
            return base.toISOString().split('T')[0];
        };

        if (argPoints.length > 0) {
            const argSeries = chart.addLineSeries({
                color: '#3b82f6',
                lineWidth: 2,
                crosshairMarkerVisible: true,
                crosshairMarkerRadius: 5,
                crosshairMarkerBorderColor: '#fff',
                crosshairMarkerBackgroundColor: '#3b82f6',
                priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
            });
            argSeries.setData(argPoints.map(p => ({ time: toTime(p.duration) as any, value: p.ytm })));
        }

        if (nyPoints.length > 0) {
            const nySeries = chart.addLineSeries({
                color: '#10b981',
                lineWidth: 2,
                lineStyle: 1, // dashed
                crosshairMarkerVisible: true,
                crosshairMarkerRadius: 5,
                crosshairMarkerBorderColor: '#fff',
                crosshairMarkerBackgroundColor: '#10b981',
                priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
            });
            nySeries.setData(nyPoints.map(p => ({ time: toTime(p.duration) as any, value: p.ytm })));
        }

        chart.timeScale().fitContent();

        const ro = new ResizeObserver(() => {
            if (chartRef.current && chartInstanceRef.current) {
                chartInstanceRef.current.applyOptions({ width: chartRef.current.clientWidth });
            }
        });
        ro.observe(chartRef.current);

        return () => {
            ro.disconnect();
            if (chartInstanceRef.current) {
                chartInstanceRef.current.remove();
                chartInstanceRef.current = null;
            }
        };
    }, [data]);

    const argPoints = data?.points.filter(p => p.law === 'ARG') ?? [];
    const nyPoints = data?.points.filter(p => p.law === 'NY') ?? [];

    // Spread: GD - AL at each tenor
    const spreadPoints = argPoints.map(al => {
        const gd = nyPoints.find(g => g.name.replace('GD', '') === al.name.replace('AL', ''));
        return gd ? { name: `${al.name}/${gd.name}`, spread: parseFloat((gd.ytm - al.ytm).toFixed(2)), duration: al.duration } : null;
    }).filter(Boolean) as any[];

    if (loading) {
        return (
            <div className="glass-panel p-6 animate-pulse">
                <div className="h-4 w-40 bg-white/10 rounded mb-4" />
                <div className="h-64 bg-white/5 rounded-xl" />
            </div>
        );
    }

    return (
        <div className="glass-panel p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                        <TrendingUp size={16} className="text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Curva de Rendimientos</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                            Bonos Soberanos USD · YTM Aprox. · CCL: ${data?.cclUsed?.toLocaleString() ?? '---'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Legend */}
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-bold mr-2">
                        <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-blue-500 inline-block rounded" /> Ley ARG</span>
                        <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-emerald-500 inline-block rounded border-dashed" /> Ley NY</span>
                    </div>
                    <button
                        onClick={() => setShowSpread(!showSpread)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${showSpread ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'border-white/10 text-slate-500 hover:text-white'}`}
                    >
                        Spread GD/AL
                    </button>
                    <button onClick={fetchData} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors">
                        <RefreshCw size={13} />
                    </button>
                </div>
            </div>

            {/* Chart */}
            {!showSpread ? (
                <div ref={chartRef} className="w-full rounded-xl overflow-hidden" />
            ) : (
                /* Spread Table */
                <div className="space-y-2 py-2">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Prima de riesgo (Ley NY vs ARG)</p>
                    {spreadPoints.length === 0 ? (
                        <p className="text-slate-600 text-sm text-center py-8">Sin datos suficientes</p>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {spreadPoints.map((sp: any) => (
                                <div key={sp.name} className="bg-white/5 rounded-xl p-3 border border-white/5">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">{sp.name}</div>
                                    <div className={`text-lg font-black font-mono ${sp.spread > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {sp.spread > 0 ? '+' : ''}{sp.spread} pp
                                    </div>
                                    <div className="text-[9px] text-slate-600">Duration ~{sp.duration}a</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Bond table */}
            {data?.points && data.points.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-[10px] text-slate-600 uppercase tracking-wider border-b border-white/5">
                                <th className="text-left pb-2 font-bold">Bono</th>
                                <th className="text-left pb-2 font-bold">Ley</th>
                                <th className="text-right pb-2 font-bold">Duration</th>
                                <th className="text-right pb-2 font-bold">TIR USD</th>
                                <th className="text-right pb-2 font-bold">Precio USD</th>
                                <th className="text-right pb-2 font-bold">Cupón</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {data.points.map(p => (
                                <tr
                                    key={p.name}
                                    className="hover:bg-white/5 cursor-pointer transition-colors"
                                    onClick={() => setSelected(selected?.name === p.name ? null : p)}
                                >
                                    <td className="py-2 font-bold text-white font-mono">{p.name}</td>
                                    <td className="py-2">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${p.law === 'NY' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'}`}>
                                            {p.law}
                                        </span>
                                    </td>
                                    <td className="py-2 text-right text-slate-300 font-mono">{p.duration}a</td>
                                    <td className="py-2 text-right font-bold font-mono text-amber-400">{p.ytm}%</td>
                                    <td className="py-2 text-right text-slate-300 font-mono">${p.priceUSD}</td>
                                    <td className="py-2 text-right text-slate-500 font-mono">{p.coupon}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {data?.points.length === 0 && (
                <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
                    <Info size={16} />
                    <span className="text-sm">No se pudieron obtener precios de bonos en este momento.</span>
                </div>
            )}
        </div>
    );
};
