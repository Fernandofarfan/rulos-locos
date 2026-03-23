import React, { useState } from 'react';
import { Calculator, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

/** Un pago futuro del bono: cuántos días desde hoy y su monto por $100 nominal */
interface CashFlow {
    days: number;
    amount: number;
}

/**
 * Calcula la TIR anual (%) usando Newton-Raphson.
 *
 * @param purchase  Precio de compra por $100 nominal (negativo internamente)
 * @param flows     Flujos positivos {days, amount}
 * @param guess     Tasa inicial (fracción anual, default 0.15)
 * @returns TIR en porcentaje anual, o NaN si no converge
 */
function calcIRR(purchase: number, flows: CashFlow[], guess = 0.15): number {
    // Convertimos todo a tasa diaria
    let r = Math.pow(1 + guess, 1 / 365) - 1;
    const MAX_ITER = 200;
    const TOL = 1e-10;

    for (let iter = 0; iter < MAX_ITER; iter++) {
        let npv = -purchase; // flujo inicial negativo (salida de caja)
        let dnpv = 0;
        for (const cf of flows) {
            const disc = Math.pow(1 + r, cf.days);
            npv  += cf.amount / disc;
            dnpv -= cf.days * cf.amount / (disc * (1 + r));
        }
        if (Math.abs(dnpv) < 1e-14) break;
        const step = npv / dnpv;
        r -= step;
        if (Math.abs(step) < TOL) break;
    }

    // Convertir tasa diaria a anual
    return (Math.pow(1 + r, 365) - 1) * 100;
}

/** Días entre hoy y una fecha ISO */
function daysTo(isoDate: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(isoDate + 'T00:00:00');
    return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

// ─── Flujos de fondos por bono ─────────────────────────────────────────────
// Por cada $100 nominal. Amortizaciones + cupones semestrales.
// Fuente: Boletín oficial MECON / Prospecto de emisión (simplificado para uso educativo).

/** AL30 – Bono soberano en USD bajo ley argentina, vence jul-2030.
 *  Amortiza 16.67% cada semestre desde ene-2028 (6 cuotas).
 *  Cupón step-up: 0.125% semestral 2020-2021, 0.25% 2022, 0.5% 2023, 1% 2024+. */
const buildAL30 = (): CashFlow[] => {
    // Pagos desde la posición actual hasta vencimiento (jul-2030)
    // Estructura: [fecha, cupon_por_100, amort_por_100]
    const schedule: [string, number, number][] = [
        ['2026-07-09', 1.00,  0],
        ['2027-01-09', 1.00,  0],
        ['2027-07-09', 1.00,  0],
        ['2028-01-09', 1.00, 16.67],
        ['2028-07-09', 0.833, 16.67],
        ['2029-01-09', 0.667, 16.67],
        ['2029-07-09', 0.500, 16.67],
        ['2030-01-09', 0.333, 16.67],
        ['2030-07-09', 0.167, 16.65], // último pago + residual de redondeo
    ];
    return schedule
        .map(([date, coupon, amort]) => ({ days: daysTo(date), amount: coupon + amort }))
        .filter(cf => cf.days > 0);
};

/** GD30 – Global 2030 (ley Nueva York), estructura similar al AL30. */
const buildGD30 = (): CashFlow[] => {
    const schedule: [string, number, number][] = [
        ['2026-07-09', 1.75,  0],
        ['2027-01-09', 1.75,  0],
        ['2027-07-09', 1.75,  0],
        ['2028-01-09', 1.75, 16.67],
        ['2028-07-09', 1.458, 16.67],
        ['2029-01-09', 1.167, 16.67],
        ['2029-07-09', 0.875, 16.67],
        ['2030-01-09', 0.583, 16.67],
        ['2030-07-09', 0.292, 16.65],
    ];
    return schedule
        .map(([date, coupon, amort]) => ({ days: daysTo(date), amount: coupon + amort }))
        .filter(cf => cf.days > 0);
};

const BOND_FLOWS: Record<string, () => CashFlow[]> = {
    AL30: buildAL30,
    GD30: buildGD30,
};

export const BondCalculator: React.FC = () => {
    const [price, setPrice] = useState<number>(62);
    const [bond, setBond] = useState<string>('AL30');
    const [tir, setTir] = useState<number | null>(null);
    const [calculating, setCalculating] = useState(false);

    const calculateTIR = () => {
        setCalculating(true);
        // rAF para que el botón muestre spinner antes del cálculo síncrono
        requestAnimationFrame(() => {
            try {
                const flows = BOND_FLOWS[bond]();
                if (flows.length === 0) {
                    toast.error('No hay flujos futuros para este bono.');
                    return;
                }
                const result = calcIRR(price, flows);
                if (!isFinite(result) || result < -50 || result > 500) {
                    toast.error('No se pudo converger. Verificá el precio ingresado.');
                    return;
                }
                setTir(result);
                toast.success(`TIR calculada: ${result.toFixed(2)}%`);
            } finally {
                setCalculating(false);
            }
        });
    };

    return (
        <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-secondary/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-2 rounded-xl bg-accent-secondary/20 text-accent-secondary">
                    <Calculator size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Calculadora de Bonos</h3>
                    <p className="text-xs text-slate-400">Estime el rendimiento anual (TIR)</p>
                </div>
            </div>

            <div className="space-y-4 relative z-10">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Bono</label>
                        <select
                            value={bond}
                            onChange={(e) => setBond(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-accent-secondary/50 outline-none transition-colors"
                        >
                            <option value="AL30">AL30 (Bonaerense)</option>
                            <option value="GD30">GD30 (Global)</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Precio Actual (USD)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                            <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(Number(e.target.value))}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-6 text-white text-sm focus:border-accent-secondary/50 outline-none transition-colors font-mono"
                            />
                        </div>
                    </div>
                </div>

                <button
                    onClick={calculateTIR}
                    disabled={calculating}
                    className="w-full bg-accent-secondary hover:bg-accent-secondary/90 text-black font-bold py-3 rounded-xl transition-all shadow-lg shadow-accent-secondary/20 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    {calculating ? <RefreshCw className="animate-spin" size={18} /> : <TrendingUp size={18} />}
                    {calculating ? 'Calculando Flujo...' : 'Calcular Rendimiento'}
                </button>

                {tir !== null && (
                    <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 animate-fade-in">
                        <div className="flex justify-between items-end">
                            <span className="text-sm text-slate-400 font-medium">Tasa Interna de Retorno (TIR)</span>
                            <span className="text-2xl font-black text-accent-secondary">{tir.toFixed(2)}%</span>
                        </div>
                        <div className="mt-2 text-xs text-slate-500 flex items-start gap-1">
                            <AlertCircle size={12} className="mt-0.5 shrink-0" />
                            <span>Cálculo aproximado basado en precio de cierre y flujo teórico de fondos. No constituye asesoramiento de inversión.</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
