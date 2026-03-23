import React, { useEffect, useState, useCallback } from 'react';
import { Calculator, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { apiService } from '../services/api';
import CandlestickChart from './CandlestickChart';

interface UVAEntry { fecha: string; valor: number; }
interface UVAResponse { data: UVAEntry[]; latest?: UVAEntry; source: string; }

const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const CERCalculator: React.FC = () => {
    const [uvaData, setUVAData] = useState<UVAEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [amount, setAmount] = useState('100000');
    const [startDate, setStartDate] = useState('2021-01-01');
    const [result, setResult] = useState<any>(null);

    useEffect(() => {
        const fetchUVA = async () => {
            try {
                const resp: UVAResponse = await apiService.getUVA();
                if (resp.data?.length) setUVAData(resp.data);
            } catch (e) {
                console.error('CERCalculator fetch error:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchUVA();
    }, []);

    const calculate = useCallback(() => {
        if (!uvaData.length || !amount || !startDate) return;

        const originalAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
        if (isNaN(originalAmount) || originalAmount <= 0) return;

        // Find UVA value at start date (or nearest after)
        const sortedByDate = [...uvaData].sort((a, b) => a.fecha.localeCompare(b.fecha));
        const startEntry = sortedByDate.find(e => e.fecha >= startDate);
        const latestEntry = sortedByDate[sortedByDate.length - 1];

        if (!startEntry || !latestEntry) return;

        const ratio = latestEntry.valor / startEntry.valor;
        const adjustedAmount = originalAmount * ratio;
        const nominalGain = adjustedAmount - originalAmount;
        const nominalGainPct = (ratio - 1) * 100;

        // Chart: UVA evolution from start date
        const chartData = sortedByDate.filter(e => e.fecha >= startDate);

        setResult({
            originalAmount,
            adjustedAmount,
            nominalGain,
            nominalGainPct,
            ratio,
            startUVA: startEntry.valor,
            latestUVA: latestEntry.valor,
            startDate: startEntry.fecha,
            latestDate: latestEntry.fecha,
            chartLabels: chartData.map(e => e.fecha),
            chartValues: chartData.map(e => e.valor),
        });
    }, [uvaData, amount, startDate]);

    useEffect(() => { calculate(); }, [calculate]);

    // Min/max dates for date picker
    const minDate = uvaData[0]?.fecha ?? '2016-04-01';
    const maxDate = uvaData[uvaData.length - 1]?.fecha ?? new Date().toISOString().split('T')[0];

    return (
        <div className="glass-panel p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
                    <Calculator size={16} className="text-purple-400" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Calculadora CER / UVA</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                        Actualización por inflación · Índice UVA BCRA · {loading ? 'Cargando...' : `Datos al ${maxDate}`}
                    </p>
                </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Monto Original (ARS)</label>
                    <input
                        type="text"
                        value={amount}
                        onChange={e => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                        placeholder="100000"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fecha de Inicio</label>
                    <input
                        type="date"
                        value={startDate}
                        min={minDate}
                        max={maxDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all [color-scheme:dark]"
                    />
                </div>
            </div>

            {/* Results */}
            {result && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Monto Original</div>
                            <div className="text-base font-black font-mono text-white truncate">
                                ${fmt(result.originalAmount)}
                            </div>
                            <div className="text-[9px] text-slate-600 mt-1">al {result.startDate}</div>
                        </div>

                        <div className="bg-purple-500/10 rounded-xl p-3 border border-purple-500/20">
                            <div className="text-[9px] text-purple-400 uppercase font-bold tracking-wider mb-1">Valor Ajustado CER</div>
                            <div className="text-base font-black font-mono text-white truncate tracking-tighter">
                                ${fmt(result.adjustedAmount)}
                            </div>
                            <div className="text-[9px] text-slate-500 mt-1">al {result.latestDate}</div>
                        </div>

                        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Actualización</div>
                            <div className={`text-base font-black font-mono flex items-center gap-1 ${result.nominalGainPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {result.nominalGainPct >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                {fmt(result.nominalGainPct)}%
                            </div>
                            <div className="text-[9px] text-slate-500 mt-1">Ganancia nominal</div>
                        </div>

                        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Coef. UVA</div>
                            <div className="text-base font-black font-mono text-amber-400">
                                ×{result.ratio.toFixed(4)}
                            </div>
                            <div className="text-[9px] text-slate-600 mt-1">
                                {result.startUVA.toFixed(2)} → {result.latestUVA.toFixed(2)}
                            </div>
                        </div>
                    </div>

                    {/* UVA Chart */}
                    {result.chartLabels.length > 2 && (
                        <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-3 flex items-center gap-1">
                                <Info size={10} /> Evolución del Índice UVA — Período seleccionado
                            </div>
                            <CandlestickChart
                                labels={result.chartLabels}
                                values={result.chartValues}
                                color="#a855f7"
                                height={150}
                                indicator="uva"
                                showCandles={false}
                            />
                        </div>
                    )}

                    <div className="text-[10px] text-slate-600 italic">
                        * Cálculo basado en el Índice UVA publicado por el BCRA (vía ArgentinaDatos). El CER oficial publicado por el BCRA puede diferir levemente. No constituye asesoramiento financiero.
                    </div>
                </>
            )}

            {loading && (
                <div className="flex items-center justify-center py-10">
                    <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
};
