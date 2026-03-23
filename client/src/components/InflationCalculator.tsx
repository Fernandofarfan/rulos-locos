import React, { useState, useEffect } from 'react';
import { Calendar, ArrowRight, TrendingUp, AlertCircle, RefreshCw, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../services/api';

/** Punto de la serie histórica de inflación mensual */
interface MonthlyRate {
    /** Formato YYYY-MM o YYYY-MM-DD */
    label: string;
    /** Variación porcentual mensual (ej: 4.2 = 4,2%) */
    value: number;
}

/**
 * Construye el factor acumulado de inflación entre `from` y hoy
 * usando la serie mensual real del backend.
 *
 * Ej: si from='2023-01-01' y la serie tiene las variaciones de feb-2023 a hoy,
 * hace el producto de todos esos (1 + v/100).
 */
function buildCumulativeFactor(from: string, series: MonthlyRate[]): number {
    const fromDate = new Date(from + (from.length === 7 ? '-01' : ''));
    fromDate.setDate(1);
    fromDate.setHours(0, 0, 0, 0);

    let factor = 1;
    for (const { label, value } of series) {
        // Normalizar etiqueta a 'YYYY-MM'
        const ym = label.substring(0, 7);
        const periodDate = new Date(ym + '-01T00:00:00');
        // Sólo incluir períodos cuyo inicio sea >= fecha origen
        if (periodDate >= fromDate) {
            factor *= 1 + value / 100;
        }
    }
    return factor;
}

export const InflationCalculator: React.FC = () => {
    const [amount, setAmount] = useState<number>(1000);
    const [dateFrom, setDateFrom] = useState<string>('2023-01-01');
    const [adjustedValue, setAdjustedValue] = useState<number | null>(null);
    const [inflationAccumulated, setInflationAccumulated] = useState<number | null>(null);
    const [calculating, setCalculating] = useState(false);
    /** Serie mensual cargada desde el backend */
    const [series, setSeries] = useState<MonthlyRate[]>([]);
    const [seriesLoaded, setSeriesLoaded] = useState(false);

    // Cargar la serie histórica una sola vez al montar el componente
    useEffect(() => {
        apiService.getHistorical('inflacion', '5Y')
            .then((resp) => {
                if (resp?.labels?.length && resp?.values?.length) {
                    const data: MonthlyRate[] = (resp.labels as string[])
                        .map((label: string, i: number) => ({ label, value: resp.values[i] as number }))
                        .filter((d: MonthlyRate) => isFinite(d.value) && d.value > -30 && d.value < 300);
                    setSeries(data);
                }
            })
            .catch(() => { /* seguimos sin serie, usamos fallback */ })
            .finally(() => setSeriesLoaded(true));
    }, []);

    const calculateAdjustment = () => {
        setCalculating(true);

        // Si la serie del backend está disponible, usarla; sino, fallback conservador
        const coefficient = seriesLoaded && series.length > 0
            ? buildCumulativeFactor(dateFrom, series)
            : (() => {
                // Fallback: tasa mensual conservadora basada en datos 2020-2026
                const from = new Date(dateFrom);
                const now  = new Date();
                const months = Math.max(0,
                    (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth())
                );
                // Tasas promedio históricas por año (% mensual)
                let factor = 1;
                for (let i = 0; i < months; i++) {
                    const year = from.getFullYear() + Math.floor((from.getMonth() + i) / 12);
                    const monthly = year >= 2024 ? 4.0 : year === 2023 ? 10.0 : 5.5;
                    factor *= 1 + monthly / 100;
                }
                return factor;
            })();

        const adjusted = amount * coefficient;
        const accumulatedPct = (coefficient - 1) * 100;
        setAdjustedValue(adjusted);
        setInflationAccumulated(accumulatedPct);
        toast.success(`Valor ajustado: $${adjusted.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`);
        setCalculating(false);
    };

    return (
        <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-accent-primary/20 text-accent-primary">
                    <Calendar size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Ajuste por Inflación</h3>
                    <p className="text-xs text-slate-400">Calculadora histórica (CER/IPC)</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Cantidad Original ($)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-accent-primary/50 outline-none transition-colors font-mono"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Fecha de Origen</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-accent-primary/50 outline-none transition-colors"
                        />
                    </div>
                </div>

                <div className="flex justify-center">
                    <ArrowRight className="text-slate-600 rotate-90 md:rotate-0" />
                </div>

                <button
                    onClick={calculateAdjustment}
                    disabled={calculating}
                    className="w-full bg-accent-primary hover:bg-accent-primary/90 text-black font-bold py-3 rounded-xl transition-all shadow-lg shadow-accent-primary/20 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    {calculating ? <RefreshCw className="animate-spin" size={18} /> : <Calculator size={18} />}
                    {calculating ? 'Ajustando...' : 'Calcular Valor Hoy'}
                </button>

                {adjustedValue !== null && (
                    <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 animate-fade-in space-y-3">
                        <div className="flex justify-between items-end border-b border-white/5 pb-3">
                            <span className="text-sm text-slate-400 font-medium">Valor Ajustado Hoy</span>
                            <span className="text-3xl font-black text-accent-primary tracking-tight">
                                ${adjustedValue.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Inflación Acumulada</span>
                            <span className="text-rose-400 font-bold flex items-center gap-1">
                                <TrendingUp size={10} />
                                {inflationAccumulated?.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%
                            </span>
                        </div>
                        <div className="text-[10px] text-slate-600 flex items-start gap-1 leading-tight">
                            <AlertCircle size={10} className="mt-0.5 shrink-0" />
                            <span>Cálculo estimativo basado en índice CER/IPC promedio.</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
