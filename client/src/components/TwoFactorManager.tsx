import React, { useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Copy, Check } from 'lucide-react';
import { apiService as api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { fireToast } from '../hooks/useToast';

export const TwoFactorManager = () => {
    const { user, refreshUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [secret, setSecret] = useState<string | null>(null);
    const [token, setToken] = useState('');
    const [copied, setCopied] = useState(false);

    const isEnabled = user?.twoFactorEnabled;

    const handleEnable = async () => {
        setLoading(true);
        try {
            const res = await api.post('/2fa/generate') as any;
            setQrCode(res.data?.qrCode || res.qrCode);
            setSecret(res.data?.secret || res.secret);
            fireToast({ type: 'info', title: '2FA Generado', message: 'Escaneá el código QR.' });
        } catch (error) {
            fireToast({ type: 'error', title: 'Error', message: 'Fallo generando 2FA.' });
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/2fa/verify', { token });
            fireToast({ type: 'success', title: '2FA Activado', message: 'Tu cuenta ahora está protegida.' });
            setQrCode(null);
            setSecret(null);
            setToken('');
            await refreshUser();
        } catch (error: any) {
            fireToast({ type: 'error', title: 'Código Inválido', message: error.response?.data?.error || 'Verificá el código.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDisable = async () => {
        if (!confirm('¿Seguro que querés desactivar 2FA? Tu cuenta será vulnerable.')) return;
        setLoading(true);
        try {
            await api.post('/2fa/disable');
            fireToast({ type: 'info', title: '2FA Desactivado', message: 'Capa de seguridad removida.' });
            await refreshUser();
        } catch (error) {
            fireToast({ type: 'error', title: 'Error', message: 'Fallo al desactivar 2FA.' });
        } finally {
            setLoading(false);
        }
    };

    const copySecret = () => {
        if (secret) {
            navigator.clipboard.writeText(secret);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
                <div className={`p-2 rounded-xl ${isEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {isEnabled ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-white">Autenticación 2Pasos (2FA)</h3>
                    <p className="text-sm text-slate-400">Protegé tu cuenta con Google Authenticator o Authy.</p>
                </div>
                <div>
                    {isEnabled ? (
                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase rounded">Activado</span>
                    ) : (
                        <span className="px-2 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase rounded">Inactivo</span>
                    )}
                </div>
            </div>

            {isEnabled ? (
                <div className="text-center">
                    <p className="text-sm text-slate-400 mb-4">Tu cuenta actualmente se encuentra blindada vía TOTP.</p>
                    <button
                        onClick={handleDisable}
                        disabled={loading}
                        className="py-2.5 px-4 bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 hover:text-rose-300 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Procesando...' : 'Deshabilitar Seguridad 2FA'}
                    </button>
                </div>
            ) : qrCode && secret ? (
                <div className="bg-black/20 p-5 rounded-xl border border-white/5 space-y-4">
                    <p className="text-sm font-bold text-slate-300 text-center">1. Escaneá el Código QR</p>
                    <div className="flex justify-center">
                        <div className="bg-white p-2 rounded-xl">
                            <img src={qrCode} alt="2FA QR Code" className="w-32 h-32" />
                        </div>
                    </div>

                    <div className="text-center mt-2">
                        <p className="text-xs text-slate-500 mb-1">O ingresá el secreto manualmente:</p>
                        <button onClick={copySecret} className="inline-flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded text-xs font-mono text-slate-300 hover:bg-slate-700 transition">
                            {secret} {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                    </div>

                    <form onSubmit={handleVerify} className="mt-6 pt-6 border-t border-slate-700">
                        <p className="text-sm font-bold text-slate-300 text-center mb-4">2. Ingresá el Código de 6 Dígitos</p>
                        <div className="flex gap-3">
                            <input
                                required
                                type="text"
                                maxLength={6}
                                value={token}
                                onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                                placeholder="000000"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-center text-white text-xl tracking-widest font-mono focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || token.length !== 6}
                            className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Shield size={16} />}
                            Confirmar y Activar 2FA
                        </button>
                        <button
                            type="button"
                            onClick={() => { setQrCode(null); setSecret(null); }}
                            className="w-full mt-2 py-2 text-slate-500 hover:text-slate-300 text-xs font-bold"
                        >
                            Cancelar
                        </button>
                    </form>
                </div>
            ) : (
                <div className="text-center">
                    <p className="text-sm text-slate-400 mb-6">Asegurá el acceso a tu cuenta vinculando una app de autenticación de dos pasos.</p>
                    <button
                        onClick={handleEnable}
                        disabled={loading}
                        className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                    >
                        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Shield size={16} />}
                        Comenzar Configuración
                    </button>
                </div>
            )}
        </div>
    );
};
