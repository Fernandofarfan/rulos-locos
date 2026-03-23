import React, { useEffect, useState } from 'react';
import { RefreshCw, Building2, Search, X as XIcon } from 'lucide-react';
import { Tooltip } from './ui/Tooltip';
import { apiService } from '../services/api';
import { formatPct } from '../utils/formatARS';

interface Banco {
    entidad: string;
    tnaClientes: number;
    tnaNoClientes: number | null;
    logo?: string;
}

const tnaToTEM = (tna: number) => ((1 + tna / 100 / 365) ** 30 - 1) * 100;
const tnaToTEA = (tna: number) => ((1 + tna / 100 / 365) ** 365 - 1) * 100;

const colorForTNA = (tna: number): string => {
    if (tna >= 40) return 'text-emerald-400';
    if (tna >= 30) return 'text-amber-400';
    return 'text-red-400';
};

export const PlazoFijoBancos: React.FC = () => {
    const [bancos, setBancos] = useState<Banco[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [search, setSearch] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const { bancos: data } = await apiService.getPlazoFijoBancos();
            if (data && data.length > 0) {
                setBancos(data.slice(0, 12));
                setLastUpdated(new Date());
            }
        } catch (e) {
            console.error('PlazoFijoBancos error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 3600000); // 1 hora
        return () => clearInterval(interval);
    }, []);

    const best = bancos[0];
    const filtered = search.trim()
        ? bancos.filter(b => b.entidad.toLowerCase().includes(search.toLowerCase()))
        : bancos;

    return (
        <div className="glass-panel p-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                            <Building2 size={20} />
                        </span>
                        Plazo Fijo por Banco
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 ml-10">TNA clientes para depósitos a 30 días · Fuente: ArgentinaDatos / BCRA</p>
                </div>
                <Tooltip content="Actualizar tasas" placement="left">
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white disabled:opacity-40"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </Tooltip>
            </div>

            {/* Best rate highlight */}
            {best && !loading && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                    <div>
                        <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mb-0.5">🏆 Mejor Tasa</div>
                        <div className="text-sm font-bold text-white">{best.entidad}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black text-emerald-400 font-mono">
                            {formatPct(best.tnaClientes, 2)}
                        </div>
                        <div className="text-[9px] text-slate-400">TNA · TEA {formatPct(tnaToTEA(best.tnaClientes), 1)}</div>
                    </div>
                </div>
            )}

            {/* Buscador */}
            {!loading && bancos.length > 0 && (
                <div className="relative mb-3">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar banco…"
                        className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 pl-7 pr-7 text-xs text-white placeholder-slate-600 outline-none focus:border-emerald-500/40 transition-colors"
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

            {/* Table */}
            {loading ? (
                <div className="flex-1 space-y-1.5 overflow-hidden">
                    {[...Array(7)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-2 py-2.5 rounded-xl bg-white/[0.02] animate-pulse">
                            <div className="w-5 h-5 rounded-lg bg-white/5 flex-shrink-0" />
                            <div className="flex-1 h-3 rounded bg-white/5" style={{ width: `${55 + (i % 3) * 10}%` }} />
                            <div className="w-12 h-3 rounded bg-white/5 flex-shrink-0" />
                            <div className="w-12 h-3 rounded bg-white/5 flex-shrink-0" />
                            <div className="w-12 h-3 rounded bg-white/5 flex-shrink-0" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-xs">
                        <thead className="sticky top-0">
                            <tr className="text-[9px] uppercase tracking-wider text-slate-500 border-b border-white/5">
                                <th className="text-left py-2 font-bold">#</th>
                                <th className="text-left py-2 font-bold">Banco</th>
                                <th className="text-right py-2 font-bold">TNA</th>
                                <th className="text-right py-2 font-bold hidden sm:table-cell">TEM</th>
                                <th className="text-right py-2 font-bold hidden sm:table-cell">TEA</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-6 text-center text-slate-500 text-xs">
                                        Sin resultados para "{search}"
                                    </td>
                                </tr>
                            ) : filtered.map((b, i) => (
                                <tr key={b.entidad} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="py-2.5 text-slate-600 font-mono w-6">{i + 1}</td>
                                    <td className="py-2.5 pr-2">
                                        <span className={`font-medium ${i === 0 && !search ? 'text-emerald-300' : 'text-white/80'} group-hover:text-white transition-colors`}>
                                            {b.entidad.replace('BANCO ', '').replace('BANK ', '')}
                                        </span>
                                    </td>
                                    <td className="py-2.5 text-right font-mono font-bold">
                                        <span className={colorForTNA(b.tnaClientes)}>
                                            {formatPct(b.tnaClientes, 2)}
                                        </span>
                                    </td>
                                    <td className="py-2.5 text-right font-mono text-slate-400 hidden sm:table-cell">
                                        {formatPct(tnaToTEM(b.tnaClientes), 2)}
                                    </td>
                                    <td className="py-2.5 text-right font-mono text-slate-400 hidden sm:table-cell">
                                        {formatPct(tnaToTEA(b.tnaClientes), 1)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {lastUpdated && (
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-1 text-[9px] text-slate-600">
                    <RefreshCw size={8} />
                    Actualizado: {lastUpdated.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </div>
            )}
        </div>
    );
};
