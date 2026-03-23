import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, BarChart2 } from 'lucide-react';

interface Stock {
    ticker: string;
    nombre: string;
    precio: number;
    variacion: number;
    volumen: number;
    mercapARS: number;
}

// Top 20 acciones del Merval con precios base referenciales (simulados, actualizables)
const BASE_STOCKS: Omit<Stock, 'precio' | 'variacion' | 'volumen' | 'mercapARS'>[] = [
    { ticker: 'YPF', nombre: 'YPF S.A.' },
    { ticker: 'GGAL', nombre: 'Grupo Galicia' },
    { ticker: 'BMA', nombre: 'Banco Macro' },
    { ticker: 'BBAR', nombre: 'BBVA Argentina' },
    { ticker: 'PAMP', nombre: 'Pampa Energía' },
    { ticker: 'SUPV', nombre: 'Grupo Supervielle' },
    { ticker: 'CEPU', nombre: 'Central Puerto' },
    { ticker: 'ALUA', nombre: 'Aluar' },
    { ticker: 'TXAR', nombre: 'Ternium Argentina' },
    { ticker: 'CRES', nombre: 'Cresud' },
    { ticker: 'IRSA', nombre: 'IRSA' },
    { ticker: 'TGSU2', nombre: 'Transportadora Gas Sur' },
    { ticker: 'LOMA', nombre: 'Loma Negra' },
    { ticker: 'EDN', nombre: 'Edenor' },
    { ticker: 'TRAN', nombre: 'Transener' },
    { ticker: 'BOLT', nombre: 'Bolsas y Mercados' },
    { ticker: 'CVH', nombre: 'Cablevisión Holding' },
    { ticker: 'VALO', nombre: 'Supervielle Valores' },
    { ticker: 'GCLA', nombre: 'Grupo Clarin' },
    { ticker: 'TECO2', nombre: 'Telecom Argentina' },
];

// Precios base ARS (estimados según valores típicos 2025)
const BASE_PRICES: Record<string, number> = {
    YPF: 28700, GGAL: 12500, BMA: 9800, BBAR: 5600, PAMP: 8200,
    SUPV: 2100, CEPU: 3800, ALUA: 1200, TXAR: 6400, CRES: 2900,
    IRSA: 3100, TGSU2: 7200, LOMA: 2500, EDN: 1800, TRAN: 2300,
    BOLT: 15000, CVH: 4200, VALO: 1100, GCLA: 5800, TECO2: 3000,
};

function generateStock(base: typeof BASE_STOCKS[0]): Stock {
    const basePrice = BASE_PRICES[base.ticker] ?? 1000;
    const noise = 1 + (Math.random() - 0.5) * 0.06;
    const price = parseFloat((basePrice * noise).toFixed(2));
    const variacion = parseFloat(((Math.random() - 0.45) * 6).toFixed(2));
    const volumen = Math.floor(Math.random() * 500_000 + 50_000);
    return {
        ...base,
        precio: price,
        variacion,
        volumen,
        mercapARS: price * volumen,
    };
}

type SortField = 'ticker' | 'precio' | 'variacion' | 'volumen';

const SortHeader: React.FC<{ field: SortField; label: string; className?: string; sort: SortField; sortDir: 1 | -1; handleSort: (field: SortField) => void }> = ({ field, label, className = '', sort, sortDir, handleSort }) => (
    <th
        className={`text-slate-500 py-2 cursor-pointer hover:text-slate-300 select-none transition-colors ${className}`}
        onClick={() => handleSort(field)}
    >
        {label} {sort === field ? (sortDir === -1 ? '↓' : '↑') : ''}
    </th>
);

export const MervalTop20: React.FC = () => {
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [loading, setLoading] = useState(true);
    const [sort, setSort] = useState<SortField>('variacion');
    const [sortDir, setSortDir] = useState<1 | -1>(-1);
    const [filter, setFilter] = useState('');

    const refresh = useCallback(() => {
        setLoading(true);
        const data = BASE_STOCKS.map(generateStock);
        setStocks(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        refresh();
        const iv = setInterval(refresh, 30_000);
        return () => clearInterval(iv);
    }, [refresh]);

    const handleSort = (field: SortField) => {
        if (sort === field) setSortDir(d => (d === 1 ? -1 : 1) as 1 | -1);
        else { setSort(field); setSortDir(-1); }
    };

    const sorted = [...stocks]
        .filter(s =>
            !filter ||
            s.ticker.toLowerCase().includes(filter.toLowerCase()) ||
            s.nombre.toLowerCase().includes(filter.toLowerCase())
        )
        .sort((a, b) => {
            const av = a[sort]; const bv = b[sort];
            return typeof av === 'string'
                ? av.localeCompare(bv as string) * sortDir
                : ((av as number) - (bv as number)) * sortDir;
        });

    const gains = stocks.filter(s => s.variacion > 0).length;
    const losses = stocks.filter(s => s.variacion < 0).length;

    return (
        <div className="glass-panel no-lift p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <BarChart2 size={14} className="text-emerald-400" />
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Merval — Top 20 Acciones</h3>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-emerald-400">▲{gains}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-rose-400">▼{losses}</span>
                    </div>
                    <button onClick={refresh} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="mb-3">
                <input
                    type="text"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    placeholder="Buscar ticker o empresa..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-400/40 transition-colors"
                />
            </div>

            <div className="overflow-x-auto max-h-80 overflow-y-auto custom-scrollbar">
                <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[#0d1117] z-10">
                        <tr>
                            <SortHeader field="ticker" label="Ticker" className="text-left pr-2" sort={sort} sortDir={sortDir} handleSort={handleSort} />
                            <th className="text-left text-slate-500 py-2 pr-2 hidden sm:table-cell">Empresa</th>
                            <SortHeader field="precio" label="Precio" className="text-right pr-2" sort={sort} sortDir={sortDir} handleSort={handleSort} />
                            <SortHeader field="variacion" label="Var %" className="text-right pr-2" sort={sort} sortDir={sortDir} handleSort={handleSort} />
                            <SortHeader field="volumen" label="Volumen" className="text-right hidden md:table-cell" sort={sort} sortDir={sortDir} handleSort={handleSort} />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {sorted.map(s => {
                            const isPos = s.variacion >= 0;
                            return (
                                <tr key={s.ticker} className="hover:bg-white/5 transition-colors">
                                    <td className="py-2 pr-2 font-bold text-emerald-300">{s.ticker}</td>
                                    <td className="py-2 pr-2 text-slate-400 hidden sm:table-cell truncate max-w-[120px]">{s.nombre}</td>
                                    <td className="py-2 pr-2 text-right font-mono text-white">
                                        ${s.precio.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                    </td>
                                    <td className="py-2 pr-2 text-right">
                                        <span className={`flex items-center justify-end gap-0.5 font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {isPos ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                                            {isPos ? '+' : ''}{s.variacion.toFixed(2)}%
                                        </span>
                                    </td>
                                    <td className="py-2 text-right text-slate-500 font-mono hidden md:table-cell">
                                        {(s.volumen / 1000).toFixed(0)}K
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <p className="text-[9px] text-slate-700 mt-2 text-right">Precios estimados · act. c/30s · Datos referenciales BYMA</p>
        </div>
    );
};
