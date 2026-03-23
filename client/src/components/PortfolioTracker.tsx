import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, Briefcase, Wallet, Cloud, CloudOff, RefreshCw, FileDown } from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { EmptyState } from './ui/EmptyState';

interface Position {
    id: string;
    asset: string;
    buyPrice: number;
    amount: number;
    date: string;
    note?: string;
}

interface PortfolioTrackerProps {
    currentPrices: {
        blue?: number;
        mep?: number;
        crypto?: number;
    };
}

const LS_KEY = 'rulos_portfolio';

export const PortfolioTracker: React.FC<PortfolioTrackerProps> = ({ currentPrices }) => {
    const { user } = useAuth();
    const [positions, setPositions] = useState<Position[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newPos, setNewPos] = useState({ asset: 'blue', buyPrice: '', amount: '' });
    const [syncing, setSyncing] = useState(false);
    const [syncMode, setSyncMode] = useState<'local' | 'api'>('local');

    const loadFromLocalStorage = () => {
        try {
            const saved = localStorage.getItem(LS_KEY);
            if (saved) setPositions(JSON.parse(saved));
        } catch { /* ignore */ }
    };

    const loadFromApi = useCallback(async () => {
        setSyncing(true);
        try {
            const data = await apiService.getPortfolio();
            const apiPositions: Position[] = (data?.positions ?? []).map((p: any) => ({
                id: String(p.id),
                asset: p.asset,
                buyPrice: Number(p.buyPrice),
                amount: Number(p.amount),
                date: p.date,
                note: p.note,
            }));
            setPositions(apiPositions);
            setSyncMode('api');
        } catch {
            loadFromLocalStorage();
            setSyncMode('local');
        } finally {
            setSyncing(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            loadFromApi();
        } else {
            loadFromLocalStorage();
            setSyncMode('local');
        }
    }, [user, loadFromApi]);

    useEffect(() => {
        if (syncMode === 'local') {
            localStorage.setItem(LS_KEY, JSON.stringify(positions));
        }
    }, [positions, syncMode]);

    const handleSync = async () => {
        if (!user) return;
        setSyncing(true);
        try {
            await apiService.syncPortfolio();
            await loadFromApi(); // Refresh the list
        } catch { /* alert error if needed */ }
        finally { setSyncing(false); }
    };

    const handleAdd = async () => {
        if (!newPos.buyPrice || !newPos.amount) return;
        const posData = {
            asset: newPos.asset,
            buyPrice: parseFloat(newPos.buyPrice),
            amount: parseFloat(newPos.amount),
            date: new Date().toLocaleDateString('es-AR'),
        };

        if (user && syncMode === 'api') {
            setSyncing(true);
            try {
                const data = await apiService.addPortfolioPosition(posData);
                setPositions(prev => [...prev, {
                    id: String(data?.position?.id ?? Date.now()),
                    ...posData,
                }]);
            } catch {
                setPositions(prev => [...prev, { id: Date.now().toString(), ...posData }]);
            } finally {
                setSyncing(false);
            }
        } else {
            setPositions(prev => [...prev, { id: Date.now().toString(), ...posData }]);
        }
        setNewPos({ asset: 'blue', buyPrice: '', amount: '' });
        setIsAdding(false);
    };

    const handleDelete = async (id: string) => {
        if (user && syncMode === 'api') {
            setSyncing(true);
            try { await apiService.deletePortfolioPosition(id); } catch { /* silent */ }
            finally { setSyncing(false); }
        }
        setPositions(prev => prev.filter(p => p.id !== id));
    };

    const getCurrentValue = (pos: Position) =>
        pos.amount * (currentPrices[pos.asset as keyof typeof currentPrices] || 0);

    const getProfit = (pos: Position) => getCurrentValue(pos) - pos.amount * pos.buyPrice;

    const totalInitial = positions.reduce((acc, p) => acc + p.amount * p.buyPrice, 0);
    const totalCurrent = positions.reduce((acc, p) => acc + getCurrentValue(p), 0);
    const totalProfit = totalCurrent - totalInitial;
    const profitPct = totalInitial > 0 ? (totalProfit / totalInitial) * 100 : 0;

    const exportCSV = () => {
        if (positions.length === 0) return;
        const headers = ['ID', 'Activo', 'Monto Original', 'Precio Compra (ARS)', 'Valor Actual Estimado (ARS)', 'Ganancia (ARS)', 'Ganancia (%)', 'Fecha'];
        const rows = positions.map(pos => {
            const currentVal = getCurrentValue(pos);
            const profit = currentVal - (pos.amount * pos.buyPrice);
            const pct = pos.buyPrice > 0 ? (profit / (pos.amount * pos.buyPrice)) * 100 : 0;
            return [
                pos.id, pos.asset.toUpperCase(), pos.amount, pos.buyPrice,
                currentVal.toFixed(2), profit.toFixed(2), pct.toFixed(2), pos.date
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `rulos_locos_portfolio_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="glass-panel p-6 flex flex-col min-h-[400px] md:h-[600px]" aria-busy={syncing}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-accent-primary/10 text-accent-primary">
                        <Briefcase size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white leading-tight flex items-center gap-2">
                            Mi Portafolio
                            {/* Sync badge */}
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 ${syncMode === 'api'
                                ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                                : 'text-slate-500 bg-slate-500/10 border-slate-500/20'
                                }`}>
                                {syncMode === 'api' ? <Cloud size={8} /> : <CloudOff size={8} />}
                                {syncMode === 'api' ? 'Cloud' : 'Local'}
                            </span>
                            {syncMode === 'api' && (
                                <button
                                    onClick={handleSync}
                                    disabled={syncing}
                                    title="Sincronizar APIs Externas (ej: Binance)"
                                    className="p-1 ml-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                                </button>
                            )}
                            {syncing && <span className="w-3 h-3 border-2 border-t-accent-primary border-white/10 rounded-full animate-spin ml-2" />}
                        </h2>
                        <p className="text-xs text-slate-400 font-medium">
                            {!user ? 'Iniciá sesión para sincronizar' : 'Seguimiento de inversiones'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={exportCSV}
                        disabled={positions.length === 0}
                        title="Descargar CSV (Excel)"
                        className="p-2 bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 rounded-xl transition-all border border-white/5 disabled:opacity-50"
                    >
                        <FileDown size={20} />
                    </button>
                    <div className="w-px h-6 bg-white/10 mx-1"></div>
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        aria-label={isAdding ? 'Cancelar' : 'Agregar posición'}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all border border-white/5"
                    >
                        <Plus size={20} className={`transition-transform duration-300 ${isAdding ? 'rotate-45' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Valor Total</span>
                    <span className="text-xl font-black text-white">$ {totalCurrent.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Rendimiento</span>
                    <div className={`flex items-center gap-1 font-black ${totalProfit >= 0 ? 'text-success' : 'text-error'}`}>
                        {totalProfit >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        <span className="text-lg">{profitPct.toFixed(2)}%</span>
                    </div>
                </div>
            </div>

            {/* Form nueva posiciÃ³n */}
            {isAdding && (
                <div className="bg-accent-primary/5 border border-accent-primary/20 rounded-2xl p-4 mb-4 animate-fade-in">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Activo</label>
                            <select
                                value={newPos.asset}
                                onChange={e => setNewPos({ ...newPos, asset: e.target.value })}
                                className="bg-bg-app border border-white/10 rounded-xl p-2 text-sm text-white outline-none focus:border-accent-primary/50"
                            >
                                <option value="blue">Dólar Blue</option>
                                <option value="mep">Dólar MEP</option>
                                <option value="crypto">USDT/Crypto</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Precio Compra</label>
                            <input
                                type="number"
                                placeholder="Ej: 1150"
                                value={newPos.buyPrice}
                                onChange={e => setNewPos({ ...newPos, buyPrice: e.target.value })}
                                className="bg-bg-app border border-white/10 rounded-xl p-2 text-sm text-white outline-none focus:border-accent-primary/50"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 mb-4">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Cantidad (USD)</label>
                        <input
                            type="number"
                            placeholder="Ej: 500"
                            value={newPos.amount}
                            onChange={e => setNewPos({ ...newPos, amount: e.target.value })}
                            className="bg-bg-app border border-white/10 rounded-xl p-2 text-sm text-white outline-none focus:border-accent-primary/50"
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        disabled={syncing || !newPos.buyPrice || !newPos.amount}
                        className="w-full py-2.5 bg-accent-primary hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-accent-primary/20"
                    >
                        {syncing ? 'Guardando…' : 'Agregar Posición'}
                    </button>
                </div>
            )}

            {/* Lista */}
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0">
                {positions.length === 0 ? (
                    <EmptyState
                        icon={Wallet}
                        title="Sin posiciones activas"
                        description={user
                            ? 'Agregá tu primera posición para comenzar el seguimiento.'
                            : 'Iniciá sesión para sincronizar tu cartera entre dispositivos.'}
                    />
                ) : (
                    <div className="space-y-3">
                        {positions.map(pos => {
                            const profit = getProfit(pos);
                            const currentVal = getCurrentValue(pos);
                            const pct = pos.buyPrice > 0 ? (profit / (pos.amount * pos.buyPrice)) * 100 : 0;
                            return (
                                <div key={pos.id} className="group relative bg-white/5 hover:bg-white/[0.08] border border-white/5 rounded-2xl p-4 transition-all overflow-hidden">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{pos.asset}</span>
                                            <span className="text-sm font-bold text-white">{pos.amount.toLocaleString('es-AR')} USD</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-black text-white block">
                                                $ {currentVal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                            </span>
                                            <span className={`text-[11px] font-bold ${profit >= 0 ? 'text-success' : 'text-error'}`}>
                                                {profit >= 0 ? '+' : ''}${profit.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ({pct.toFixed(1)}%)
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium mt-1">
                                        <span>Compra: $ {pos.buyPrice.toLocaleString('es-AR')}</span>
                                        <span>{pos.date}</span>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(pos.id)}
                                        aria-label="Eliminar posición"
                                        disabled={syncing}
                                        className="absolute top-0 right-0 h-full w-12 flex items-center justify-center bg-error/10 text-error translate-x-full group-hover:translate-x-0 transition-transform duration-300 disabled:opacity-50"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
