import { useEffect, useState } from 'react';
import client from '../services/api';
import { formatARS } from '../utils/formatARS';
import { DataFreshness } from './ui/DataFreshness';

interface Quote {
    platform: string; finalPrice: number; totalArs: number; source: string; quoteSource: string;
    isEstimated: boolean; updatedAt?: string;
}

export function BestPlatforms() {
    const [side, setSide] = useState<'buy' | 'sell'>('buy');
    const [asset, setAsset] = useState<'usdt' | 'usd'>('usdt');
    const [amount, setAmount] = useState('1');
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const volume = Number(amount);
        if (!Number.isFinite(volume) || volume <= 0 || volume > 100_000_000) {
            setQuotes([]); setError('Ingresá una cantidad válida.'); return;
        }
        let active = true;
        const timer = setTimeout(() => {
            client.get<{ platforms: Quote[] }>('/platforms/best', { params: { side, asset, amount: volume } })
                .then(({ data }) => { if (active) { setQuotes(data.platforms ?? []); setError(''); } })
                .catch(() => { if (active) { setQuotes([]); setError('No se pudieron obtener cotizaciones.'); } });
        }, 300);
        return () => { active = false; clearTimeout(timer); };
    }, [side, asset, amount]);

    return <section className="p-5 border-b border-white/10 space-y-3">
        <h3 className="text-base font-bold text-white">Dónde comprar / vender</h3>
        <div className="flex flex-wrap gap-3 text-sm">
            <label>Operación <select value={side} onChange={e => setSide(e.target.value as 'buy' | 'sell')} className="bg-slate-900 p-2">
                <option value="buy">Comprar</option><option value="sell">Vender</option>
            </select></label>
            <label>Activo <select value={asset} onChange={e => setAsset(e.target.value as 'usdt' | 'usd')} className="bg-slate-900 p-2">
                <option value="usdt">USDT</option><option value="usd">USD</option>
            </select></label>
            <label>Cantidad <input type="number" min="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded p-2 w-28" /></label>
        </div>
        <p className="text-xs text-slate-400">Precio final orientativo por unidad, incluidas comisiones informadas o de referencia.</p>
        {error && <p role="alert" className="text-amber-300 text-sm">{error}</p>}
        {!error && quotes.length === 0 && <p className="text-sm text-slate-400">Sin cotizaciones disponibles.</p>}
        <ol className="space-y-2">{quotes.map(quote => <li key={quote.platform} className="text-sm border border-slate-700 rounded p-2">
            <span>{quote.platform}: {formatARS(quote.finalPrice, false)} · Total {formatARS(quote.totalArs, false)}</span>
            <DataFreshness source={quote.source} updatedAt={quote.updatedAt} isEstimated={quote.isEstimated} />
            {quote.isEstimated && <span className="text-xs text-slate-400">Cotización: {quote.quoteSource}</span>}
        </li>)}</ol>
    </section>;
}
