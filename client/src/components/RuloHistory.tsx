import { useEffect, useState } from 'react';
import client from '../services/api';
import { formatPct } from '../utils/formatARS';
import { ShareButton } from './ShareButton';
import { ruloRoutes } from '../utils/ruloRoutes';
interface Point { timestamp: string; netPct: number }
interface HistoryData {
    points: Point[];
    summary: { avgNetPct: number | null; bestNetPct: number | null; worstNetPct: number | null;
        positiveDaysPct: number | null; simulatedReturnPct: number | null };
}

export function RuloHistory() {
    const [route, setRoute] = useState('mep-usdt');
    const [days, setDays] = useState('30');
    const [data, setData] = useState<HistoryData | null>(null);
    const [error, setError] = useState(false);
    useEffect(() => {
        let active = true;
        client.get<HistoryData>('/arbitrage/history', { params: { route, days } }).then(response => {
            if (active) { setData(response.data); setError(false); }
        }).catch(() => { if (active) { setData(null); setError(true); } });
        return () => { active = false; };
    }, [route, days]);
    const points = data?.points ?? [];
    const values = points.map(point => point.netPct);
    const min = Math.min(...values), max = Math.max(...values);
    const path = points.map((point, i) => `${points.length > 1 ? i * 300 / (points.length - 1) : 0},${90 - (point.netPct - min) / (max - min || 1) * 80}`).join(' ');
    return <section className="p-5 border-b border-white/10 space-y-3">
        <h3 className="text-base font-bold text-white">Rendimiento histórico del rulo</h3>
        <div className="flex gap-2 text-sm">
            <label>Ruta <select value={route} onChange={event => setRoute(event.target.value)} className="bg-slate-900 p-2">
                {ruloRoutes.map(id => <option key={id} value={id}>{id.toUpperCase()}</option>)}
            </select></label>
            <label>Período <select value={days} onChange={event => setDays(event.target.value)} className="bg-slate-900 p-2">
                {[7, 30, 90, 365].map(value => <option key={value} value={value}>{value} días</option>)}
            </select></label>
        </div>
        <p className="text-xs text-amber-300">Estimado · capital de referencia $1.000.000</p>
        {error ? <p>Historial temporalmente no disponible.</p> : points.length === 0 ? <p>El historial se está acumulando.</p> : <>
            <svg viewBox="0 0 300 100" role="img" aria-label={`Rentabilidad neta estimada de ${route} durante ${days} días`} className="w-full h-28">
                <polyline fill="none" stroke="#34d399" strokeWidth="2" points={path} />
            </svg>
            <p className="text-sm">Promedio {formatPct(data?.summary.avgNetPct)} · Mejor {formatPct(data?.summary.bestNetPct)} · Peor {formatPct(data?.summary.worstNetPct)}</p>
            <p className="text-sm">Días positivos observados {formatPct(data?.summary.positiveDaysPct)} · Retorno simulado {formatPct(data?.summary.simulatedReturnPct)}</p>
            <p className="text-xs text-slate-400">Simulado, no considera límites ni tiempos de acreditación. Suma no compuesta del máximo diario.</p>
            <ShareButton text={`Rulo ${route}: retorno simulado ${formatPct(data?.summary.simulatedReturnPct)} (estimado).`} />
        </>}
    </section>;
}
