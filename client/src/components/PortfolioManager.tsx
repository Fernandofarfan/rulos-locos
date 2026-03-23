import React, { useState, useMemo, useEffect } from 'react';
import { Wallet, Plus, Trash2, PieChart, RefreshCw } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';
import { formatInt } from '../utils/formatARS';
import { useAuth } from '../hooks/useAuth';
import { apiService as api } from '../services/api';
import { fireToast } from '../hooks/useToast';

interface PortfolioItem {
    id: string;
    asset: 'ARS' | 'USD' | 'USDT' | 'BTC' | 'ETH';
    amount: number;
}

export const PortfolioManager: React.FC = () => {
    const { arbitrage, rate } = useDashboardData();
    const cryptoExtended = (arbitrage as any)?.crypto;
    const { user } = useAuth();
    const [items, setItems] = useState<PortfolioItem[]>([]);
    const [isClient, setIsClient] = useState(false);
    const [syncing, setSyncing] = useState(false);

    // Initial Load
    useEffect(() => {
        setIsClient(true);
        const saved = localStorage.getItem('rulos-portfolio');
        if (saved) {
            try { setItems(JSON.parse(saved)); } catch (e) { console.error('Failed to parse portfolio', e); }
        } else {
            setItems([{ id: '1', asset: 'ARS', amount: 500000 }, { id: '2', asset: 'USD', amount: 1000 }]);
        }
    }, []);

    // Save on change
    useEffect(() => {
        if (isClient) {
            localStorage.setItem('rulos-portfolio', JSON.stringify(items));
        }
    }, [items, isClient]);

    const { totalARS, totalUSD, assetBreakdown } = useMemo(() => {
        const cclRate = arbitrage?.dolares?.ccl?.venta || 1000;
        const usdtRate = rate?.ask || cclRate;
        const btcUsd = cryptoExtended?.bitcoin?.usd || 65000;
        const ethUsd = cryptoExtended?.ethereum?.usd || 3500;

        let ars = 0;
        let usd = 0;

        const breakdown: Record<string, { ars: number, usd: number, pct: number, color: string }> = {
            'ARS': { ars: 0, usd: 0, pct: 0, color: 'bg-indigo-500' },
            'USD': { ars: 0, usd: 0, pct: 0, color: 'bg-emerald-500' },
            'USDT': { ars: 0, usd: 0, pct: 0, color: 'bg-teal-400' },
            'BTC': { ars: 0, usd: 0, pct: 0, color: 'bg-orange-500' },
            'ETH': { ars: 0, usd: 0, pct: 0, color: 'bg-blue-500' },
        };

        items.forEach(item => {
            let itemArs = 0;
            let itemUsd = 0;

            if (item.asset === 'ARS') {
                itemArs = item.amount;
                itemUsd = item.amount / cclRate;
            } else if (item.asset === 'USD') {
                itemArs = item.amount * cclRate; // valuing at CCL
                itemUsd = item.amount;
            } else if (item.asset === 'USDT') {
                itemArs = item.amount * usdtRate;
                itemUsd = item.amount;
            } else if (item.asset === 'BTC') {
                itemUsd = item.amount * btcUsd;
                itemArs = itemUsd * cclRate;
            } else if (item.asset === 'ETH') {
                itemUsd = item.amount * ethUsd;
                itemArs = itemUsd * cclRate;
            }

            ars += itemArs;
            usd += itemUsd;
            breakdown[item.asset].ars += itemArs;
            breakdown[item.asset].usd += itemUsd;
        });

        // Calculate %
        if (ars > 0) {
            Object.keys(breakdown).forEach(k => {
                breakdown[k].pct = (breakdown[k].ars / ars) * 100;
            });
        }

        return { totalARS: ars, totalUSD: usd, assetBreakdown: breakdown };
    }, [items, arbitrage, rate, cryptoExtended]);

    const addItem = (asset: PortfolioItem['asset']) => {
        setItems(prev => [...prev, { id: Date.now().toString(), asset, amount: 0 }]);
    };

    const updateAmount = (id: string, amount: number) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, amount } : item));
    };

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const handleSync = async () => {
        if (!user) {
            fireToast({ type: 'warning', title: 'Requiere Sesión', message: 'Iniciá sesión para usar la sincronización.' });
            return;
        }
        setSyncing(true);
        try {
            await api.post('/portfolio/sync', {});
            const dbItems = await api.get('/portfolio');
            if (Array.isArray(dbItems) && dbItems.length > 0) {
                const mapped = dbItems.map((dbItem: any) => ({
                    id: dbItem.id || Date.now().toString() + Math.random(),
                    asset: dbItem.asset || 'ARS',
                    amount: dbItem.amount || 0
                }));
                setItems(mapped);
                fireToast({ type: 'success', title: 'Sincronizado', message: 'Datos actualizados desde la nube / exchanges.' });
            } else {
                fireToast({ type: 'info', title: 'Sin datos', message: 'La sincronización se completó pero no hay balances.' });
            }
        } catch (error: any) {
            fireToast({ type: 'error', title: 'Sincronización Fallida', message: error.response?.data?.error || 'Revisá tus API Keys o intentá más tarde.' });
        } finally {
            setSyncing(false);
        }
    };

    if (!isClient) return null;

    return (
        <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50 flex flex-col h-full col-span-1 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
                        <Wallet size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-100">Mi Billetera</h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                            Valuación en tiempo real de tu cartera
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSync}
                        disabled={syncing || !user}
                        title={!user ? 'Iniciá sesión para sincronizar' : 'Sincronizar con Exchanges (Binance, Lemon, etc.)'}
                        className="p-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 rounded-lg transition-colors border border-indigo-500/20 disabled:opacity-50 flex items-center gap-2 text-xs font-bold"
                    >
                        <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">{syncing ? 'Sincronizando...' : 'Auto-Sync'}</span>
                    </button>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-white leading-none">{formatInt(totalARS)}</div>
                        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mt-1">USD {formatInt(totalUSD).replace('$', '')} al CCL</div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Formulario */}
                <div className="flex-1 space-y-3">
                    {items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-xl border border-slate-700/50">
                            <div className={`w-2 h-8 rounded-full ${assetBreakdown[item.asset].color}`}></div>
                            <span className="font-bold text-slate-200 w-12">{item.asset}</span>
                            <input
                                type="number"
                                value={item.amount === 0 ? '' : item.amount}
                                onChange={(e) => updateAmount(item.id, Number(e.target.value))}
                                placeholder="0.00"
                                className="flex-1 bg-transparent border-none text-right font-medium text-white focus:outline-none focus:ring-0 placeholder-slate-600"
                            />
                            <button onClick={() => removeItem(item.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}

                    <div className="flex gap-2 mt-2 flex-wrap">
                        {['ARS', 'USD', 'USDT', 'BTC', 'ETH'].map(asset => (
                            <button
                                key={asset}
                                onClick={() => addItem(asset as any)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-700/50 hover:bg-slate-700 hover:text-white transition-colors border border-slate-600/50"
                            >
                                <Plus size={12} /> {asset}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Gráfico de composición */}
                <div className="w-full lg:w-64 flex flex-col items-center justify-center p-4 bg-slate-900/30 rounded-xl border border-slate-700/30">
                    <div className="flex items-center gap-2 mb-4 text-slate-300 font-medium text-sm w-full">
                        <PieChart size={16} /> Composición
                    </div>
                    {totalARS > 0 ? (
                        <div className="w-full space-y-2">
                            {Object.entries(assetBreakdown)
                                .filter(([, data]) => data.pct > 0)
                                .sort((a, b) => b[1].pct - a[1].pct)
                                .map(([asset, data]) => (
                                    <div key={asset}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-slate-200 font-bold">{asset}</span>
                                            <span className="text-slate-400">{data.pct.toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div className={`h-full ${data.color}`} style={{ width: `${data.pct}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <div className="text-xs text-slate-500 text-center py-8">
                            Añadí balances para ver tu composición
                        </div>
                    )}
                </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-4 text-center">
                * Los activos se valúan usando Dólar CCL y precios en vivo de CoinGecko. Guardado localmente en tu navegador.
            </p>
        </div>
    );
};
