import React, { useEffect, useState } from 'react';
import { PieChart, RefreshCw, Search, X as XIcon } from 'lucide-react';
import { apiService } from '../services/api';
import { formatCompact, formatPct } from '../utils/formatARS';

interface FCI {
    fondo: string;
    fecha: string;
    vcp: number;   // Valor cuota parte
    ccp: number;   // Cantidad cuota partes
    patrimonio: number;
    horizonte: string;
}

export const FCIMoneyMarket: React.FC = () => {
    const [fondos, setFondos] = useState<FCI[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [sortBy, setSortBy] = useState<'patrimonio' | 'vcp'>('patrimonio');
    const [search, setSearch] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const { fondos: data } = await apiService.getFCI();
            if (data && data.length > 0) {
                setFondos(data);
                setLastUpdated(new Date());
            }
        } catch (e) {
            console.error('FCIMoneyMarket error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const sorted = [...fondos].sort((a, b) =>
        sortBy === 'patrimonio' ? (b.patrimonio || 0) - (a.patrimonio || 0) : (b.vcp || 0) - (a.vcp || 0)
    );
    const filtered = search.trim()
        ? sorted.filter(f => f.fondo.toLowerCase().includes(search.toLowerCase()))
        : sorted;

    const totalPatrimonio = fondos.reduce((acc, f) => acc + (f.patrimonio || 0), 0);

    return (
        <div className="glass-panel p-6 h-full flex flex-col">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400">
                            <PieChart size={20} />
                        </span>
                        FCI Mercado de Dinero
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 ml-10">Fondos Comunes de Inversión liquidez inmediata · Fuente: ArgentinaDatos / CNV</p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white disabled:opacity-40"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Total del mercado */}
            {!loading && totalPatrimonio > 0 && (
                <div className="mb-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between">
                    <div>
                        <div className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider mb-0.5">Total Industria MM</div>
                        <div className="text-xs text-slate-300">{fondos.length} fondos de dinero</div>
                    </div>
                    <div className="text-xl font-black text-cyan-400 font-mono">
                        {formatCompact(totalPatrimonio)}
                    </div>
                </div>
            )}

            {/* Sort controls */}
            <div className="flex gap-2 mb-3">
                {[
                    { key: 'patrimonio', label: 'Por Patrimonio' },
                    { key: 'vcp', label: 'Por VCP' }
                ].map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setSortBy(key as any)}
                        className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all ${
                            sortBy === key
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                : 'bg-white/5 text-slate-500 border border-white/5 hover:text-white'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Buscador */}
            {!loading && fondos.length > 0 && (
                <div className="relative mb-3">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar fondo…"
                        className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 pl-7 pr-7 text-xs text-white placeholder-slate-600 outline-none focus:border-cyan-500/40 transition-colors"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                            aria-label="Limpiar búsqueda"
                        >
                            <XIcon size={12} />
                        </button>
                    )}
                </div>
            )}

            {/* List */}
            {loading ? (
                <div className="flex-1 space-y-1.5 overflow-hidden">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] animate-pulse">
                            <div className="w-5 h-5 rounded-lg bg-white/5 flex-shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-2.5 rounded bg-white/5" style={{ width: `${50 + (i % 4) * 10}%` }} />
                                <div className="h-1 rounded bg-white/[0.03]" style={{ width: `${20 + (i % 3) * 15}%` }} />
                                <div className="h-0.5 rounded bg-white/[0.03] w-full" />
                            </div>
                            <div className="text-right flex-shrink-0 space-y-1">
                                <div className="w-16 h-2.5 rounded bg-white/5" />
                                <div className="w-10 h-2 rounded bg-white/[0.03]" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : fondos.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                    Sin datos disponibles
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                    {filtered.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-slate-500 text-xs">
                            Sin resultados para "{search}"
                        </div>
                    ) : filtered.slice(0, 12).map((fondo, i) => {
                        const pctTotal = totalPatrimonio > 0 ? (fondo.patrimonio / totalPatrimonio) * 100 : 0;
                        return (
                            <div key={fondo.fondo + i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-all group">
                                <div className="w-5 h-5 rounded-lg bg-cyan-500/10 flex items-center justify-center text-[9px] font-bold text-cyan-400 flex-shrink-0">
                                    {i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-white/80 group-hover:text-white transition-colors truncate">
                                        {fondo.fondo}
                                    </div>
                                    {fondo.fecha && (
                                        <div className="text-[9px] text-slate-600">{fondo.fecha}</div>
                                    )}
                                    {/* Mini bar */}
                                    <div className="mt-1 h-0.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-cyan-500/60 rounded-full"
                                            style={{ width: `${Math.min(100, pctTotal * 5)}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className="text-xs font-bold font-mono text-white">
                                        {formatCompact(fondo.patrimonio || 0)}
                                    </div>
                                    <div className="text-[9px] text-slate-500">
                                        VCP: ${fondo.vcp != null ? formatPct(fondo.vcp, 4) : '-'}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {lastUpdated && (
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-1 text-[9px] text-slate-600">
                    <RefreshCw size={8} />
                    Actualizado: {lastUpdated.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} · Último día hábil disponible
                </div>
            )}
        </div>
    );
};
