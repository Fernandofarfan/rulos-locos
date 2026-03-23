import React, { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, CheckCircle, XCircle, AlertCircle, Clock, Wifi } from 'lucide-react';
import { apiService } from '../services/api';

interface ServiceStatus {
    name: string;
    status: 'ok' | 'degraded' | 'down';
    latencyMs: number | null;
    lastCheck: string;
    url?: string;
    errorMsg?: string;
}

interface StatusResponse {
    overall: 'ok' | 'degraded' | 'down';
    services: ServiceStatus[];
    checkedAt: string;
}

const STATUS_ICON = {
    ok: <CheckCircle size={14} className="text-emerald-400" />,
    degraded: <AlertCircle size={14} className="text-amber-400" />,
    down: <XCircle size={14} className="text-rose-400" />,
};

const STATUS_COLOR = {
    ok: 'border-emerald-500/20 bg-emerald-500/5',
    degraded: 'border-amber-500/20 bg-amber-500/5',
    down: 'border-rose-500/20 bg-rose-500/5',
};

const STATUS_BADGE = {
    ok: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    degraded: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    down: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

const LATENCY_COLOR = (ms: number | null) => {
    if (ms === null) return 'text-slate-500';
    if (ms < 500) return 'text-emerald-400';
    if (ms < 1500) return 'text-amber-400';
    return 'text-rose-400';
};

const BAR_WIDTH = (ms: number | null) => {
    if (ms === null) return 0;
    return Math.min(100, (ms / 2000) * 100);
};

export const StatusPage: React.FC = () => {
    const [status, setStatus] = useState<StatusResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStatus = useCallback(async (showLoader = false) => {
        if (showLoader) setRefreshing(true);
        else setLoading(true);
        try {
            const data = await apiService.get<StatusResponse>('/status');
            if (data) setStatus(data);
        } catch (e) {
            console.error('StatusPage error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        const iv = setInterval(() => fetchStatus(true), 30_000);
        return () => clearInterval(iv);
    }, [fetchStatus]);

    const overallColor = status?.overall === 'ok'
        ? 'text-emerald-400'
        : status?.overall === 'degraded'
            ? 'text-amber-400'
            : 'text-rose-400';

    const overallText = status?.overall === 'ok'
        ? '✅ Todos los servicios operativos'
        : status?.overall === 'degraded'
            ? '⚠️ Algunos servicios con problemas'
            : '🔴 Servicios no disponibles';

    return (
        <div className="glass-panel p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                        <Activity size={16} className="text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Estado de Servicios</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                            {status?.checkedAt
                                ? `Última verificación: ${new Date(status.checkedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                                : 'Verificando...'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => fetchStatus(true)}
                    disabled={refreshing}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors disabled:opacity-40"
                >
                    <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Overall status banner */}
            {status && (
                <div className={`rounded-xl p-3 border ${STATUS_COLOR[status.overall]} flex items-center gap-2`}>
                    {STATUS_ICON[status.overall]}
                    <span className={`text-sm font-bold ${overallColor}`}>{overallText}</span>
                </div>
            )}

            {/* Service list */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="space-y-2">
                    {status?.services.map(svc => (
                        <div key={svc.name} className={`rounded-xl p-3 border ${STATUS_COLOR[svc.status]} flex items-center gap-3`}>
                            {STATUS_ICON[svc.status]}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-white truncate">{svc.name}</span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${STATUS_BADGE[svc.status]}`}>
                                        {svc.status.toUpperCase()}
                                    </span>
                                    {svc.errorMsg && (
                                        <span className="text-[9px] text-rose-400 truncate hidden md:block">{svc.errorMsg}</span>
                                    )}
                                </div>
                                {/* Latency bar */}
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${svc.latencyMs !== null && svc.latencyMs < 500 ? 'bg-emerald-400' :
                                                    svc.latencyMs !== null && svc.latencyMs < 1500 ? 'bg-amber-400' : 'bg-rose-400'
                                                }`}
                                            style={{ width: `${BAR_WIDTH(svc.latencyMs)}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Clock size={9} className="text-slate-600" />
                                        <span className={`text-[10px] font-mono font-bold ${LATENCY_COLOR(svc.latencyMs)}`}>
                                            {svc.latencyMs !== null ? `${svc.latencyMs}ms` : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-1.5 text-[9px] text-slate-600">
                <Wifi size={9} />
                <span>Monitoreo automático cada 30s · verde &lt; 500ms · amarillo &lt; 1500ms · rojo ≥ 1500ms</span>
            </div>
        </div>
    );
};
