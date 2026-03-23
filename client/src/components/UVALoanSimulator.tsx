import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Home, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { apiService } from '../services/api';
import CandlestickChart from './CandlestickChart';

interface UVAEntry { fecha: string; valor: number; }

const fmt = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 });
const fmtD = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PLAZOS = [10, 15, 20, 25, 30];

export const UVALoanSimulator: React.FC = () => {
    const [uvaData, setUvaData] = useState<UVAEntry[]>([]);
    const [loading, setLoading] = useState(true);

    // Inputs
    const [monto, setMonto] = useState('5000000');
    const [startDate, setStartDate] = useState('2021-01-01');
    const [plazo, setPlazo] = useState(20);
    const [tna, setTna] = useState('6.5');

    const [fetchError, setFetchError] = useState(false);

    const loadUVA = useCallback(async () => {
        setLoading(true);
        setFetchError(false);
        try {
            const resp = await apiService.getUVA();
            if (resp?.data?.length) {
                setUvaData(resp.data.sort((a: UVAEntry, b: UVAEntry) => a.fecha.localeCompare(b.fecha)));
            } else {
                setFetchError(true);
            }
        } catch (e) {
            console.error('UVALoanSimulator fetch error:', e);
            setFetchError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadUVA(); }, [loadUVA]);

    const result = useMemo(() => {
        if (!uvaData.length) return null;
        const montoNum = parseFloat(monto.replace(/\./g, '').replace(',', '.'));
        const tnaNum = parseFloat(tna.replace(',', '.'));
        if (isNaN(montoNum) || montoNum <= 0 || isNaN(tnaNum) || tnaNum <= 0) return null;

        // Find UVA at start date
        const sorted = [...uvaData].sort((a, b) => a.fecha.localeCompare(b.fecha));
        const startEntry = sorted.find(e => e.fecha >= startDate);
        if (!startEntry) return null;
        const latestEntry = sorted[sorted.length - 1];

        // Convert amount to UVA units
        const capital_uva = montoNum / startEntry.valor;
        const totalMonths = plazo * 12;
        const tasaMensual = tnaNum / 12 / 100;

        // French system PMT formula for UVA units
        const pmt_uva = capital_uva * (tasaMensual * Math.pow(1 + tasaMensual, totalMonths)) /
            (Math.pow(1 + tasaMensual, totalMonths) - 1);

        // Build monthly evolution using actual UVA data where available, then extrapolate
        const uvaByMonth: number[] = [];
        const paymentARS: number[] = [];
        const paymentLabels: string[] = [];

        const startMs = new Date(startEntry.fecha).getTime();

        for (let m = 0; m < totalMonths; m++) {
            const targetDate = new Date(startMs + m * 30.44 * 24 * 3600 * 1000);
            const targetStr = targetDate.toISOString().split('T')[0];

            // Find closest UVA value in historical data
            const closest = sorted.reduce((prev, curr) =>
                Math.abs(new Date(curr.fecha).getTime() - targetDate.getTime()) <
                    Math.abs(new Date(prev.fecha).getTime() - targetDate.getTime()) ? curr : prev
            );

            // If the date is in the future (beyond latest historical), extrapolate
            let uvaVal: number;
            if (targetStr > latestEntry.fecha) {
                // Simple extrapolation based on last 12-month growth rate
                const entry12ago = sorted[Math.max(0, sorted.length - 365)];
                const growthRate = latestEntry.valor / entry12ago.valor;
                const monthsAhead = Math.round((targetDate.getTime() - new Date(latestEntry.fecha).getTime()) / (30.44 * 24 * 3600 * 1000));
                const monthlyGrowth = Math.pow(growthRate, 1 / 12);
                uvaVal = latestEntry.valor * Math.pow(monthlyGrowth, monthsAhead);
            } else {
                uvaVal = closest.valor;
            }

            const cuotaARS = pmt_uva * uvaVal;
            uvaByMonth.push(uvaVal);
            paymentARS.push(cuotaARS);
            paymentLabels.push(targetStr.substring(0, 7)); // YYYY-MM
        }

        const cuotaInicial = pmt_uva * startEntry.valor;
        const cuotaActual = pmt_uva * latestEntry.valor;
        const totalPagado = paymentARS.reduce((s, x) => s + x, 0);
        const totalIntereses = totalPagado - montoNum;
        const maxCuota = Math.max(...paymentARS);

        return {
            capital_uva: fmtD(capital_uva),
            pmt_uva: fmtD(pmt_uva),
            cuotaInicial: fmt(cuotaInicial),
            cuotaActual: fmt(cuotaActual),
            cuotaActualRaw: cuotaActual,
            cuotaInicialRaw: cuotaInicial,
            maxCuota: fmt(maxCuota),
            totalPagado: fmt(totalPagado),
            totalIntereses: fmt(totalIntereses),
            paymentARS,
            paymentLabels,
            startUVA: fmtD(startEntry.valor),
            latestUVA: fmtD(latestEntry.valor),
            latestDate: latestEntry.fecha,
            hausse: ((cuotaActual / cuotaInicial - 1) * 100).toFixed(1),
        };
    }, [uvaData, monto, startDate, plazo, tna]);

    const minDate = uvaData[0]?.fecha ?? '2016-04-01';
    const maxDate = uvaData[uvaData.length - 1]?.fecha ?? new Date().toISOString().split('T')[0];

    return (
        <div className="glass-panel p-6 space-y-5">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                    <Home size={16} className="text-indigo-400" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Simulador Préstamo UVA</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                        Evolución real de cuotas · Sistema Francés · Índice UVA oficial BCRA
                    </p>
                </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Monto del Préstamo (ARS)</label>
                    <input
                        type="text"
                        value={monto}
                        onChange={e => setMonto(e.target.value.replace(/[^0-9.,]/g, ''))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
                        placeholder="5000000"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fecha de Origen</label>
                    <input
                        type="date"
                        value={startDate}
                        min={minDate}
                        max={maxDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-indigo-500/50 transition-all [color-scheme:dark]"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TNA (%)</label>
                    <input
                        type="text"
                        value={tna}
                        onChange={e => setTna(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
                        placeholder="6.5"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Plazo</label>
                    <div className="flex gap-1">
                        {PLAZOS.map(p => (
                            <button
                                key={p}
                                onClick={() => setPlazo(p)}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${plazo === p ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300' : 'bg-white/5 border border-white/5 text-slate-500 hover:text-white hover:bg-white/10'}`}
                            >
                                {p}a
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Results */}
            {result && !loading ? (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                        <div className="bg-white/[0.03] rounded-xl p-2.5 border border-white/5">
                            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Cuota Inicial</div>
                            <div className="text-sm font-black font-mono text-white truncate">${result.cuotaInicial}</div>
                            <div className="text-[8px] text-slate-600 mt-1">UVA {result.startUVA} × {result.pmt_uva}</div>
                        </div>
                        <div className={`rounded-xl p-2.5 border ${result.cuotaActualRaw > result.cuotaInicialRaw ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                            <div className="text-[9px] uppercase font-bold tracking-wider mb-1 text-slate-400">Cuota Hoy ({result.latestDate})</div>
                            <div className={`text-sm font-black font-mono truncate ${result.cuotaActualRaw > result.cuotaInicialRaw ? 'text-rose-400' : 'text-emerald-400'}`}>
                                ${result.cuotaActual}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                                {result.cuotaActualRaw > result.cuotaInicialRaw
                                    ? <TrendingUp size={9} className="text-rose-400" />
                                    : <TrendingDown size={9} className="text-emerald-400" />}
                                <span className={`text-[8px] font-bold ${result.cuotaActualRaw > result.cuotaInicialRaw ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    {result.hausse}% vs inicio
                                </span>
                            </div>
                        </div>
                        <div className="bg-white/[0.03] rounded-xl p-2.5 border border-white/5">
                            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Capital en UVAs</div>
                            <div className="text-sm font-black font-mono text-indigo-300 truncate">{result.capital_uva}</div>
                            <div className="text-[8px] text-slate-600 mt-1">{result.pmt_uva} UVA/mes</div>
                        </div>
                        <div className="bg-white/[0.03] rounded-xl p-2.5 border border-white/5">
                            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Total a Pagar</div>
                            <div className="text-sm font-black font-mono text-white truncate">${result.totalPagado}</div>
                            <div className="text-[8px] text-slate-600 mt-1">(est. con proyección)</div>
                        </div>
                        <div className="bg-white/[0.03] rounded-xl p-2.5 border border-white/5">
                            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Cuota Máx Proyectada</div>
                            <div className="text-sm font-black font-mono text-rose-400 truncate">${result.maxCuota}</div>
                            <div className="text-[8px] text-slate-600 mt-1">al final del plazo</div>
                        </div>
                        <div className="bg-white/[0.03] rounded-xl p-2.5 border border-white/5">
                            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">UVA Hoy</div>
                            <div className="text-sm font-black font-mono text-amber-400 truncate">${result.latestUVA}</div>
                            <div className="text-[8px] text-slate-600 mt-1">vs ${result.startUVA}</div>
                        </div>
                    </div>

                    {/* Cuota evolution chart */}
                    {result.paymentARS.length > 2 && (
                        <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-3 flex items-center gap-1">
                                <Info size={10} /> Evolución de cuota en ARS — {plazo} años
                            </div>
                            <CandlestickChart
                                labels={result.paymentLabels}
                                values={result.paymentARS}
                                color="#6366f1"
                                height={150}
                                indicator="uva"
                                showCandles={false}
                            />
                        </div>
                    )}

                    <div className="text-[10px] text-slate-600 italic flex items-start gap-1">
                        <Info size={10} className="mt-0.5 shrink-0" />
                        Proyección futura usa extrapolación de tendencia del último año de UVA. No constituye asesoramiento financiero.
                    </div>
                </>
            ) : loading ? (
                <div className="flex items-center justify-center py-10">
                    <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
                </div>
            ) : fetchError ? (
                <div className="flex flex-col items-center gap-3 py-6">
                    <p className="text-rose-400 text-sm text-center">Error al cargar datos UVA del BCRA</p>
                    <button
                        onClick={loadUVA}
                        className="text-xs px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-xl hover:bg-indigo-500/30 transition-all"
                    >
                        Reintentar
                    </button>
                </div>
            ) : (
                <p className="text-slate-500 text-sm text-center py-4">Ingresá los datos para simular el préstamo</p>
            )}
        </div>
    );
};
