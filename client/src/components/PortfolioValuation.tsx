import { useEffect, useMemo, useState } from 'react';
import client from '../services/api';
import { formatARS, formatUSD } from '../utils/formatARS';
import { DataFreshness } from './ui/DataFreshness';

interface PositionValue {
    id: string; asset: string; amount: number; buyPrice: number; currentPrice: number | null; costArs: number;
    valueArs: number | null; valueUsd: number | null; nominalPnlArs: number | null; pnlUsd: number | null; realPnlArs: number | null;
    inflationMultiplier: number | null; historicalMep: number | null; quoteSource: string; source: string; isEstimated: boolean; updatedAt?: string;
}
interface Data {
    positions: PositionValue[]; rates?: { mep: number | null; ccl: number | null; blue: number | null };
    source: string; isEstimated: boolean; updatedAt?: string;
}
type Manual = Record<string, string>;
const storageKey = 'rulos_manual_prices';
function readManual(): Manual {
    try { const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value as Manual : {}; }
    catch { return {}; }
}

export function PortfolioValuation({ revision }: { revision: number }) {
    const [data, setData] = useState<Data | null>(null);
    const [manual, setManual] = useState<Manual>(readManual);
    const [error, setError] = useState('');
    useEffect(() => {
        let active = true;
        client.get<Data>('/portfolio/valuation').then(response => { if (active) { setData(response.data); setError(''); } })
            .catch(() => { if (active) { setData(null); setError('No se pudo cargar la valuación.'); } });
        return () => { active = false; };
    }, [revision]);
    useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(manual)); }, [manual]);
    const rows = useMemo(() => (data?.positions ?? []).map(position => {
        const price = Number(manual[position.id]);
        if (position.currentPrice !== null || !Number.isFinite(price) || price <= 0) return position;
        const valueArs = position.amount * price;
        const valueUsd = data?.rates?.mep ? valueArs / data.rates.mep : null;
        return { ...position, currentPrice: price, valueArs, valueUsd, nominalPnlArs: valueArs - position.costArs,
            pnlUsd: valueUsd !== null && position.historicalMep ? valueUsd - position.costArs / position.historicalMep : null,
            realPnlArs: position.inflationMultiplier === null ? null : valueArs - position.costArs * position.inflationMultiplier,
            source: 'precio manual', quoteSource: 'precio manual', isEstimated: true };
    }), [data, manual]);
    const sum = (key: 'valueArs' | 'valueUsd' | 'nominalPnlArs' | 'pnlUsd' | 'realPnlArs') =>
        rows.some(row => row[key] === null) ? null : rows.reduce((total, row) => total + (row[key] ?? 0), 0);
    return <section className="mt-4 space-y-2">
        <h3 className="font-bold text-white">Valuación y resultados</h3>
        {error && <p role="status" className="text-sm text-amber-300">{error}</p>}
        {data && <DataFreshness source={data.source} updatedAt={data.updatedAt} isEstimated={data.isEstimated} />}
        {data?.rates && <p className="text-xs text-slate-400">USD MEP {formatARS(data.rates.mep, false)} · CCL {formatARS(data.rates.ccl, false)} · Blue {formatARS(data.rates.blue, false)}</p>}
        {data && !rows.length && <p className="text-sm text-slate-400">No hay posiciones guardadas.</p>}
        {rows.length > 0 && <div className="overflow-x-auto"><table className="text-xs w-full">
            <thead><tr><th>Activo</th><th>Precio ARS</th><th>Valor ARS</th><th>Valor USD MEP</th><th>Resultado ARS</th><th>Resultado USD</th><th>Resultado real ARS</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.id} className="border-t border-slate-700">
                <td className="p-2">{row.asset}<DataFreshness source={row.source} updatedAt={row.updatedAt} isEstimated={row.isEstimated} />
                    <span className="text-slate-400">Cotización: {row.quoteSource}</span></td>
                <td>{data?.positions.find(item => item.id === row.id)?.currentPrice === null
                    ? <label>Precio manual <input type="number" min="0" value={manual[row.id] ?? ''} onChange={event => setManual(previous => ({ ...previous, [row.id]: event.target.value }))}
                        className="bg-slate-900 border border-slate-600 rounded w-28" /></label>
                    : formatARS(row.currentPrice, false)}</td>
                <td>{formatARS(row.valueArs)}</td><td>{formatUSD(row.valueUsd)}</td><td>{formatARS(row.nominalPnlArs)}</td>
                <td>{formatUSD(row.pnlUsd)}</td><td>{formatARS(row.realPnlArs)}</td>
            </tr>)}</tbody>
            <tfoot><tr className="border-t border-slate-600 font-bold"><td>Totales</td><td>—</td><td>{formatARS(sum('valueArs'))}</td>
                <td>{formatUSD(sum('valueUsd'))}</td><td>{formatARS(sum('nominalPnlArs'))}</td><td>{formatUSD(sum('pnlUsd'))}</td><td>{formatARS(sum('realPnlArs'))}</td></tr></tfoot>
        </table></div>}
        <p className="text-xs text-slate-400">El resultado real ajusta el costo por IPC mensual y estima el mes parcial; el resultado en USD usa MEP histórico. Sin datos suficientes se muestra «—».</p>
    </section>;
}
