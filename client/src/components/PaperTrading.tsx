import React, { useState, useEffect } from 'react';
import { Gamepad2, ArrowUpRight, ArrowDownRight, RefreshCw, LogIn } from 'lucide-react';
import { paperTradingApi } from '../services/paperTradingApi';
import type { VirtualBalance } from '../services/paperTradingApi';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAuth } from '../hooks/useAuth';
import { fireToast } from '../hooks/useToast';
import { formatInt } from '../utils/formatARS';

export const PaperTrading: React.FC = () => {
    const { arbitrage } = useDashboardData();
    const { user } = useAuth();
    const [balances, setBalances] = useState<VirtualBalance[]>([]);
    const [loading, setLoading] = useState(false);

    // Trade state
    const [amount, setAmount] = useState<string>('100');
    const [action, setAction] = useState<'BUY' | 'SELL'>('BUY');
    const [asset, setAsset] = useState<'MEP' | 'BLUE' | 'CRYPTO'>('MEP');

    useEffect(() => {
        if (user) {
            loadBalances();
        }
    }, [user]);

    const loadBalances = async () => {
        try {
            setLoading(true);
            const data = await paperTradingApi.initBalance();
            setBalances(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleTrade = async () => {
        try {
            setLoading(true);
            const price = getPriceFor(asset, action);
            const data = await paperTradingApi.trade(action, asset, Number(amount), price);
            setBalances(data);
            fireToast({
                type: action === 'BUY' ? 'price-up' : 'price-down',
                title: 'Orden Ejecutada',
                message: `${action === 'BUY' ? 'Compraste' : 'Vendiste'} ${amount} ${asset} a $${price.toLocaleString()}`,
                duration: 3000
            });
            setAmount('');
        } catch (error: any) {
            fireToast({
                type: 'error',
                title: 'Error ejecutando orden',
                message: error.response?.data?.error || 'Saldo insuficiente o error de conexión.',
                duration: 4000
            });
        } finally {
            setLoading(false);
        }
    };

    const getPriceFor = (asset: string, action: 'BUY' | 'SELL') => {
        const d = arbitrage?.dolares;
        if (!d) return 0;
        switch (asset) {
            case 'BLUE': return action === 'BUY' ? (d.blue?.venta ?? 0) : (d.blue?.compra ?? 0);
            case 'MEP': return action === 'BUY' ? (d.mep?.venta ?? 0) : (d.mep?.compra ?? 0);
            case 'CRYPTO': return action === 'BUY' ? ((arbitrage as any)?.crypto?.ask || 0) : ((arbitrage as any)?.crypto?.bid || 0);
            default: return 0;
        }
    };

    const price = getPriceFor(asset, action);
    const totalArs = Number(amount) * price;

    const arsBal = balances.find(b => b.currency === 'ARS')?.amount || 0;
    const assetBal = balances.find(b => b.currency === asset)?.amount || 0;

    if (!user) {
        return (
            <div className="glass-panel p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                <Gamepad2 size={48} className="text-slate-600 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Paper Trading</h3>
                <p className="text-sm text-slate-400 max-w-sm mb-6">
                    Iniciá sesión para recibir un bono de $1,000,000 ARS virtuales y poner a prueba tus estrategias de mercado sin riesgo.
                </p>
                <div className="px-6 py-2 bg-blue-600/20 text-blue-400 rounded-lg flex items-center gap-2 font-bold cursor-not-allowed">
                    <LogIn size={16} /> Requiere Cuenta
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel p-6 animate-fade-in relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                <Gamepad2 size={120} />
            </div>

            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-sky-500/20 rounded-xl border border-sky-500/30">
                        <Gamepad2 size={18} className="text-sky-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">Paper Trading <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full ml-1 uppercase tracking-wider">BETA</span></h3>
                        <p className="text-xs text-slate-400">Simulador de Inversiones en Tiempo Real</p>
                    </div>
                </div>

                <div className="text-right">
                    <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Saldo Virtual (ARS)</span>
                    <div className="text-xl font-black text-white font-mono flex items-center gap-2 justify-end">
                        ${formatInt(arsBal)}
                        <button onClick={loadBalances} className={`text-slate-500 hover:text-white transition-colors ${loading ? 'animate-spin' : ''}`}>
                            <RefreshCw size={14} />
                        </button>
                    </div>
                    {assetBal > 0 && <span className="text-xs text-emerald-400 font-bold">Tienes {assetBal.toFixed(2)} {asset}</span>}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
                {/* Panel de Orden */}
                <div className="md:col-span-7 bg-black/40 border border-white/5 rounded-2xl p-6">
                    <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl">
                        <button
                            onClick={() => setAction('BUY')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1 ${action === 'BUY' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white'}`}
                        >
                            <ArrowUpRight size={14} /> Comprar
                        </button>
                        <button
                            onClick={() => setAction('SELL')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1 ${action === 'SELL' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-400 hover:text-white'}`}
                        >
                            <ArrowDownRight size={14} /> Vender
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Activo</label>
                            <select
                                value={asset}
                                onChange={(e) => setAsset(e.target.value as any)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-sky-500/50 appearance-none"
                            >
                                <option value="MEP" className="bg-slate-900">Dólar MEP</option>
                                <option value="BLUE" className="bg-slate-900">Dólar Blue</option>
                                <option value="CRYPTO" className="bg-slate-900">Dólar Cripto (USDT)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Cantidad ({asset})</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-sky-500/50"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                </div>

                {/* Resumen */}
                <div className="md:col-span-5 bg-sky-500/10 border border-sky-500/20 rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-sky-200">Precio de Ejecución</span>
                            <span className="text-sm font-black text-white font-mono">${price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center mb-6 pt-4 border-t border-sky-500/20">
                            <span className="text-sm font-bold text-sky-200">Total en ARS</span>
                            <span className={`text-xl font-black font-mono ${action === 'BUY' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {action === 'BUY' ? '-' : '+'}${totalArs.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleTrade}
                        disabled={loading || Number(amount) <= 0 || price <= 0}
                        className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-lg ${action === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40 text-white disabled:bg-slate-800 disabled:text-slate-500' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/40 text-white disabled:bg-slate-800 disabled:text-slate-500'}`}
                    >
                        {loading ? 'Procesando...' : `Confirmar ${action === 'BUY' ? 'Compra' : 'Venta'}`}
                    </button>
                </div>
            </div>

            <div className="border border-sky-500/20 animate-pulse absolute inset-0 rounded-2xl pointer-events-none" />
        </div>
    );
};
