import React, { useState } from 'react';
import { KeyRound, Plus, Trash2, AlertCircle } from 'lucide-react';
import { apiService as api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { fireToast } from '../hooks/useToast';

export const ApiKeysManager: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [exchange, setExchange] = useState('BINANCE');
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [passthrough, setPassthrough] = useState('');

    const activeKeys = user?.apiKeys || [];

    const handleAddKey = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/exchange-keys', { exchange, apiKey, apiSecret, passthrough });
            fireToast({ type: 'success', title: 'Llave Guardada', message: `Conexión con ${exchange} exitosa.` });
            setApiKey('');
            setApiSecret('');
            setPassthrough('');
            await refreshUser(); // Update context
        } catch (error: any) {
            fireToast({ type: 'error', title: 'Error', message: error.response?.data?.error || 'Falló la conexión.' });
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveKey = async (id: string) => {
        try {
            await (api as any).delete(`/exchange-keys/${id}`);
            fireToast({ type: 'info', title: 'Llave Eliminada', message: 'La sincronización ha sido desactivada.' });
            await refreshUser();
        } catch (error) {
            fireToast({ type: 'error', title: 'Error', message: 'No se pudo eliminar la llave.' });
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
                <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                    <KeyRound size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Sincronización de Exchanges</h3>
                    <p className="text-sm text-slate-400">Conectá tus cuentas para auto-completar el Portfolio.</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Lista de llaves */}
                <div>
                    <h4 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Conexiones Activas</h4>
                    {activeKeys.length === 0 ? (
                        <div className="p-4 border border-dashed border-slate-700 rounded-xl text-center text-slate-500 text-sm">
                            No hay exchanges conectados.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activeKeys.map((k: any) => (
                                <div key={k.id} className="p-4 bg-slate-800/50 rounded-xl flex items-center justify-between border border-white/5">
                                    <div>
                                        <p className="font-bold text-slate-200">{k.exchange}</p>
                                        <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Conectado
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveKey(k.id)}
                                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Formulario */}
                <div>
                    <h4 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Nueva Conexión</h4>
                    <form onSubmit={handleAddKey} className="space-y-4 bg-black/20 p-5 rounded-xl border border-white/5">

                        <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex gap-3 text-blue-200 text-xs mb-4">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <p>Tus API Keys son cifradas. Asegurate de habilitar permisos de <strong>"Solo Lectura"</strong> en tu Exchange. Nunca te pediremos permisos de Retiro.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Exchange</label>
                            <select
                                value={exchange}
                                onChange={(e) => setExchange(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                            >
                                <option value="BINANCE">Binance</option>
                                <option value="LEMON">Lemon Cash</option>
                                <option value="BUENBIT">Buenbit</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">API Key</label>
                            <input
                                required type="text" value={apiKey} onChange={e => setApiKey(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm font-mono"
                                placeholder="Paste your API Key"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">API Secret</label>
                            <input
                                required type="password" value={apiSecret} onChange={e => setApiSecret(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm font-mono"
                                placeholder="•••••••••••••••••••••••••"
                            />
                        </div>
                        {exchange === 'OKX' || exchange === 'KUCOIN' ? (
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Passphrase</label>
                                <input
                                    type="password" value={passthrough} onChange={e => setPassthrough(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm font-mono"
                                />
                            </div>
                        ) : null}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={16} />}
                            Vincular Cuenta
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
