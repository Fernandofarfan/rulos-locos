import { useEffect, useState } from 'react';
import client from '../services/api';
import { formatARS, formatPct } from '../utils/formatARS';
import { DataFreshness } from './ui/DataFreshness';
import { ShareButton } from './ShareButton';

type FeeKey = 'brokerBuyPct' | 'brokerSellPct' | 'marketRightsPct' | 'bankTransferPct' | 'exchangeTradePct' | 'p2pPct' | 'withdrawalUsdt' | 'taxPct';
type FeeValues = Partial<Record<FeeKey, number>>;
interface Route {
    id: string; description: string;
    quoteSources: { side: 'compra' | 'venta'; source: string; updatedAt?: string; isEstimated: boolean }[];
    net: { grossArs: number; grossPct: number; netArs: number; netPct: number; taxesArs: number;
        breakEvenCapitalArs: number | null; settlement: string; fees: { step: string; label: string; amountArs: number }[] };
}
interface NetResponse { routes: Route[]; referenceFees: Record<FeeKey, number>; updatedAt?: string }

const labels: Record<FeeKey, string> = {
    brokerBuyPct: 'Bróker compra (%)', brokerSellPct: 'Bróker venta (%)', marketRightsPct: 'Derechos de mercado (%)',
    bankTransferPct: 'Transferencia bancaria (%)', exchangeTradePct: 'Operación exchange (%)', p2pPct: 'P2P (%)',
    withdrawalUsdt: 'Retiro de red (USDT)', taxPct: 'Impuesto / percepción (%)',
};

function readFees(): FeeValues {
    try {
        const value: unknown = JSON.parse(localStorage.getItem('rulos_fees') ?? '{}');
        if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
        return Object.fromEntries(Object.entries(value).filter(([key, val]) =>
            key in labels && typeof val === 'number' && Number.isFinite(val) && val >= 0 && val <= (key === 'withdrawalUsdt' ? 1000 : 100))) as FeeValues;
    } catch { return {}; }
}

export function NetProfitability() {
    const [capital, setCapital] = useState('1000000');
    const [fees, setFees] = useState<FeeValues>(readFees);
    const [data, setData] = useState<NetResponse | null>(null);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        localStorage.setItem('rulos_fees', JSON.stringify(fees));
        const amount = Number(capital);
        if (!Number.isFinite(amount) || amount < 10_000 || amount > 10_000_000_000) {
            setData(null); setError('Ingresá un capital entre $10.000 y $10.000.000.000.'); return;
        }
        let active = true;
        const timer = setTimeout(() => {
            const encoded = btoa(JSON.stringify(fees)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            client.get<NetResponse>('/arbitrage/net', { params: { capital: amount, fees: encoded } }).then(response => {
                if (active) { setData(response.data); setError(''); }
            }).catch(() => { if (active) { setData(null); setError('No se pudieron obtener los rulos netos.'); } });
        }, 300);
        return () => { active = false; clearTimeout(timer); };
    }, [capital, fees]);

    return (
        <section className="p-5 border-b border-white/10 space-y-4" aria-label="Rentabilidad neta">
            <h3 className="text-base font-bold text-white">Rentabilidad neta</h3>
            <DataFreshness source="estimado" updatedAt={data?.updatedAt} isEstimated />
            <p className="text-xs text-slate-400">Valores de referencia. La conversión USD/USDT se supone 1:1 y los costos y plazos pueden variar.</p>
            <p className="text-xs text-slate-400">La comisión de compra muestra pesos pagados; el neto también refleja que esa comisión reduce la cantidad comprada.</p>
            <div className="flex flex-wrap gap-3 items-end">
                <label className="text-xs text-slate-300">Capital en pesos
                    <input type="number" min="10000" max="10000000000" value={capital} onChange={e => setCapital(e.target.value)}
                        className="block mt-1 bg-slate-900 border border-slate-600 rounded p-2 text-white" />
                </label>
                <button type="button" onClick={() => setEditing(value => !value)} className="px-3 py-2 rounded border border-slate-600 text-sm">
                    {editing ? 'Cerrar comisiones' : 'Mis comisiones'}
                </button>
            </div>
            {editing && <div className="grid grid-cols-2 gap-2">
                {(Object.keys(labels) as FeeKey[]).map(key => <label key={key} className="text-xs text-slate-300">{labels[key]}
                    <input type="number" min="0" max={key === 'withdrawalUsdt' ? 1000 : 100} step="0.01"
                        value={fees[key] ?? ''} placeholder={String(data?.referenceFees?.[key] ?? '')}
                        onChange={e => setFees(previous => {
                            const next = { ...previous };
                            if (e.target.value === '') delete next[key];
                            else {
                                const n = Number(e.target.value);
                                if (!Number.isFinite(n) || n < 0 || n > (key === 'withdrawalUsdt' ? 1000 : 100)) return previous;
                                next[key] = n;
                            }
                            return next;
                        })} className="block w-full mt-1 bg-slate-900 border border-slate-600 rounded p-2 text-white" />
                </label>)}
            </div>}
            {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
            {data && (data.routes?.length ? <div className="space-y-3">
                {data.routes.map(route => <details key={route.id} className="rounded border border-slate-700 p-3">
                    <summary className="cursor-pointer text-sm text-white">{route.description} · Neto {formatPct(route.net.netPct, 2)} ({formatARS(route.net.netArs)})</summary>
                    <p className="text-xs text-slate-400 mt-2">Bruto: {formatPct(route.net.grossPct, 2)} ({formatARS(route.net.grossArs)}) · Liquidación: {route.net.settlement}</p>
                    {route.quoteSources?.map(quote => <DataFreshness key={quote.side} source={`${quote.side}: ${quote.source}`}
                        updatedAt={quote.updatedAt} isEstimated={quote.isEstimated} />)}
                    <ul className="text-xs text-slate-300 mt-2">{route.net.fees.map((fee, index) => <li key={`${fee.step}-${index}`}>{fee.step}: {fee.label} — {formatARS(fee.amountArs, false)}</li>)}</ul>
                    <p className="text-xs text-slate-400">Impuestos: {formatARS(route.net.taxesArs, false)} · Punto de equilibrio: {route.net.breakEvenCapitalArs === null ? 'no alcanzable' : formatARS(route.net.breakEvenCapitalArs)}</p>
                    <ShareButton text={`Rulo ${route.description}: ${formatPct(route.net.netPct, 2)} neto estimado.`} />
                </details>)}
            </div> : <p className="text-sm text-slate-400">No hay cotizaciones suficientes para calcular rutas.</p>)}
        </section>
    );
}
