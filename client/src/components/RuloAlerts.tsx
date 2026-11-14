import { useEffect, useState } from 'react';
import client from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { ruloRoutes } from '../utils/ruloRoutes';
import { formatARS, formatPct } from '../utils/formatARS';

interface RuloAlert { id: string; kind: string; routeId: string; threshold: number; capital: number; active: boolean }

export function RuloAlerts() {
    const { user } = useAuth();
    const [route, setRoute] = useState('mep-usdt');
    const [threshold, setThreshold] = useState('1');
    const [capital, setCapital] = useState('1000000');
    const [alerts, setAlerts] = useState<RuloAlert[]>([]);
    const [message, setMessage] = useState('');
    useEffect(() => {
        if (!user) { setAlerts([]); return; }
        let active = true;
        client.get<RuloAlert[]>('/alerts').then(({ data }) => {
            if (active) setAlerts(data.filter(alert => alert.kind === 'RULO'));
        }).catch(() => { if (active) setMessage('No se pudieron cargar las alertas.'); });
        return () => { active = false; };
    }, [user]);
    async function create() {
        try {
            const { data } = await client.post<RuloAlert>('/alerts', { kind: 'RULO', routeId: route, threshold: Number(threshold), capital: Number(capital) });
            setAlerts(previous => [data, ...previous]);
            setMessage('Alerta creada. Se revisa periódicamente y tiene una espera de 6 horas.');
        } catch { setMessage('No se pudo crear la alerta. Revisá el capital y el porcentaje.'); }
    }
    async function remove(id: string) {
        try { await client.delete(`/alerts/${encodeURIComponent(id)}`); setAlerts(previous => previous.filter(alert => alert.id !== id)); }
        catch { setMessage('No se pudo eliminar la alerta.'); }
    }
    return <section className="mt-5 space-y-3">
        <h4 className="font-bold text-white">Alertas de rentabilidad neta</h4>
        {!user ? <p className="text-sm text-slate-400">Iniciá sesión para guardar alertas de rulo.</p> : <>
            <p className="text-xs text-amber-300">Rentabilidad estimada con comisiones de referencia; no garantiza una operación.</p>
            <div className="grid gap-2 text-sm">
                <label>Ruta <select value={route} onChange={event => setRoute(event.target.value)} className="bg-slate-900 p-2">
                    {ruloRoutes.map(id => <option key={id} value={id}>{id.toUpperCase()}</option>)}
                </select></label>
                <label>Rendimiento neto mínimo (%) <input type="number" min="-50" max="50" step="0.1" value={threshold}
                    onChange={event => setThreshold(event.target.value)} className="bg-slate-900 p-2 w-28" /></label>
                <label>Capital (ARS) <input type="number" min="10000" max="10000000000" value={capital}
                    onChange={event => setCapital(event.target.value)} className="bg-slate-900 p-2 w-40" /></label>
                <button type="button" onClick={() => { void create(); }} className="border border-slate-600 rounded p-2">Crear alerta de rulo</button>
            </div>
            {message && <p role="status" className="text-xs text-slate-300">{message}</p>}
            <ul>{alerts.map(alert => <li key={alert.id} className="flex justify-between gap-2 text-sm">
                <span>{alert.routeId} ≥ {formatPct(Number(alert.threshold))} · {formatARS(Number(alert.capital))}</span>
                <button type="button" onClick={() => { void remove(alert.id); }}>Eliminar</button>
            </li>)}</ul>
        </>}
    </section>;
}
