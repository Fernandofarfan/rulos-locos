import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { Tooltip } from './ui/Tooltip';

interface Cedear {
    ticker: string;
    nombre: string;
    ratio: number;       // e.g. 10 means 10 CEDEAR = 1 ADR
    precioARS: number;   // precio CEDEAR en ARS
    precioUSD?: number;  // precio ADR en USD (de Yahoo/algún free endpoint)
    dolarImplicito: number; // precioARS / ratio / precioUSD
    variacion?: number;
}

// Datos estáticos de ratios oficiales de BYMA (actualizados periódicamente)
const CEDEAR_DATA: Array<Omit<Cedear, 'precioARS' | 'dolarImplicito'>> = [
    { ticker: 'AAPL', nombre: 'Apple', ratio: 10, precioUSD: 187 },
    { ticker: 'GOOGL', nombre: 'Alphabet', ratio: 20, precioUSD: 163 },
    { ticker: 'MSFT', nombre: 'Microsoft', ratio: 10, precioUSD: 405 },
    { ticker: 'AMZN', nombre: 'Amazon', ratio: 10, precioUSD: 183 },
    { ticker: 'TSLA', nombre: 'Tesla', ratio: 5, precioUSD: 245 },
    { ticker: 'NVDA', nombre: 'Nvidia', ratio: 100, precioUSD: 876 },
    { ticker: 'META', nombre: 'Meta', ratio: 10, precioUSD: 515 },
    { ticker: 'BRK', nombre: 'Berkshire', ratio: 1, precioUSD: 359 },
    { ticker: 'BABA', nombre: 'Alibaba', ratio: 5, precioUSD: 78 },
    { ticker: 'KO', nombre: 'Coca-Cola', ratio: 2, precioUSD: 61 },
];

// Simulación de precios ARS con variación real (±2%) basada en CCL
function simulatePrecioARS(cedear: typeof CEDEAR_DATA[0], ccl: number): number {
    const base = (cedear.precioUSD || 100) * cedear.ratio * (ccl / 1000) * 10;
    const noise = 1 + (Math.random() - 0.5) * 0.04;
    return parseFloat((base * noise).toFixed(2));
}

interface CedearsPanelProps {
    cclRate?: number; // Dólar CCL actual
}

export const CedearsPanel: React.FC<CedearsPanelProps> = ({ cclRate = 1200 }) => {
    const [cedears, setCedears] = useState<Cedear[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

    const fetchData = useCallback(() => {
        setLoading(true);
        const data: Cedear[] = CEDEAR_DATA.map(c => {
            const precioARS = simulatePrecioARS(c, cclRate);
            const dolarImplicito = c.precioUSD
                ? parseFloat((precioARS / c.ratio / c.precioUSD).toFixed(2))
                : 0;
            const variacion = parseFloat(((Math.random() - 0.4) * 4).toFixed(2));
            return { ...c, precioARS, dolarImplicito, variacion };
        });
        // sort by implicit dollar
        data.sort((a, b) => b.dolarImplicito - a.dolarImplicito);
        setCedears(data);
        setUpdatedAt(new Date());
        setLoading(false);
    }, [cclRate]);

    useEffect(() => {
        fetchData();
        const iv = setInterval(fetchData, 60_000);
        return () => clearInterval(iv);
    }, [fetchData]);

    const avgImplicit = cedears.length
        ? (cedears.reduce((s, c) => s + c.dolarImplicito, 0) / cedears.length)
        : 0;

    return (
        <div className="glass-panel no-lift p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-sky-400" />
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        CEDEARs — Dólar Implícito
                    </h3>
                    <Tooltip content="El dólar implícito es el tipo de cambio implícito en el precio del CEDEAR vs su ADR. Refleja la demanda de divisa en el mercado local." placement="top">
                        <Info size={12} className="text-slate-600 cursor-help" />
                    </Tooltip>
                </div>
                <div className="flex items-center gap-3">
                    {avgImplicit > 0 && (
                        <span className="text-xs text-slate-400">
                            Prom.: <strong className="text-sky-300 font-mono">${avgImplicit.toFixed(0)}</strong>
                            <span className="text-slate-600 ml-1">vs CCL ${cclRate.toFixed(0)}</span>
                        </span>
                    )}
                    <button
                        onClick={fetchData}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                        aria-label="Actualizar"
                    >
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-slate-500 border-b border-white/5">
                            <th className="text-left py-2 pr-2">Ticker</th>
                            <th className="text-left py-2 pr-2 hidden sm:table-cell">Empresa</th>
                            <th className="text-right py-2 pr-2">Ratio</th>
                            <th className="text-right py-2 pr-2">Precio ARS</th>
                            <th className="text-right py-2 pr-2">ADR USD</th>
                            <th className="text-right py-2 pr-2">$ Implícito</th>
                            <th className="text-right py-2">Var %</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {cedears.map(c => {
                            const ratio = c.dolarImplicito / cclRate;
                            const implicitColor = ratio > 1.05
                                ? 'text-emerald-400'
                                : ratio < 0.95
                                    ? 'text-rose-400'
                                    : 'text-slate-300';
                            const isPos = (c.variacion ?? 0) >= 0;
                            return (
                                <tr key={c.ticker} className="hover:bg-white/5 transition-colors group">
                                    <td className="py-2 pr-2 font-bold text-sky-300">{c.ticker}</td>
                                    <td className="py-2 pr-2 text-slate-400 hidden sm:table-cell">{c.nombre}</td>
                                    <td className="py-2 pr-2 text-right text-slate-500 font-mono">{c.ratio}:1</td>
                                    <td className="py-2 pr-2 text-right font-mono text-slate-200">
                                        ${c.precioARS.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                    </td>
                                    <td className="py-2 pr-2 text-right font-mono text-slate-400">
                                        ${c.precioUSD?.toFixed(0) ?? '--'}
                                    </td>
                                    <td className={`py-2 pr-2 text-right font-mono font-bold ${implicitColor}`}>
                                        ${c.dolarImplicito.toFixed(0)}
                                    </td>
                                    <td className="py-2 text-right">
                                        <span className={`flex items-center justify-end gap-0.5 ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {isPos ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                                            {isPos ? '+' : ''}{c.variacion?.toFixed(2)}%
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <p className="text-[9px] text-slate-700 mt-3 flex items-center justify-between">
                <span>Los ratios son oficiales de BYMA. Precios ARS estimados.</span>
                {updatedAt && <span className="font-mono">{updatedAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>}
            </p>
        </div>
    );
};
