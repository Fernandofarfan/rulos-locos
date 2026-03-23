import React, { useState } from 'react';
import { X, LogIn, UserPlus, Mail, Lock, User, Eye, EyeOff, Loader } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { GoogleLogin } from '@react-oauth/google';
import type { CredentialResponse } from '@react-oauth/google';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Tab = 'login' | 'register';

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
    const { login, register, loginWithGoogle, error } = useAuth();
    const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
    const [tab, setTab] = useState<Tab>('login');
    const [showPass, setShowPass] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ email: '', password: '', name: '' });
    const [require2fa, setRequire2fa] = useState(false);
    const [twoFactorCode, setTwoFactorCode] = useState('');

    const handleGoogleSuccess = async (res: CredentialResponse) => {
        if (!res.credential) return;
        setSubmitting(true);
        const ok = await loginWithGoogle(res.credential);
        setSubmitting(false);
        if (ok) onClose();
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        let ok = false;

        if (tab === 'login') {
            const res = await login({ email: form.email, password: form.password, twoFactorCode });
            if (res && res.require2fa) {
                setRequire2fa(true);
                setSubmitting(false);
                return;
            }
            if (res && res.ok) ok = true;
        } else {
            const res = await register({ email: form.email, password: form.password, name: form.name });
            if (res && res.ok) ok = true;
        }

        setSubmitting(false);
        if (ok) onClose();
    };

    const inputClass = 'w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors';

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md glass-panel p-8 rounded-2xl relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <span className="text-xl">⚡</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Rulos Locos</h2>
                            <p className="text-xs text-slate-400">Accedé a tu cuenta</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {require2fa ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="text-center mb-6">
                            <Lock size={32} className="mx-auto text-indigo-400 mb-2" />
                            <h3 className="text-lg font-bold text-white">Verificación en dos pasos</h3>
                            <p className="text-sm text-slate-400">Ingresá el código de tu autenticador.</p>
                        </div>

                        <input
                            type="text"
                            maxLength={6}
                            required
                            placeholder="000000"
                            value={twoFactorCode}
                            onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                            className={`${inputClass} text-center font-mono text-xl tracking-widest`}
                            autoFocus
                        />

                        {error && (
                            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-center">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={submitting || twoFactorCode.length !== 6}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {submitting ? <Loader size={18} className="animate-spin" /> : 'Verificar y Entrar'}
                        </button>

                        <button
                            type="button"
                            onClick={() => { setRequire2fa(false); setTwoFactorCode(''); }}
                            className="w-full text-xs text-slate-500 hover:text-white py-2"
                        >
                            Volver al login
                        </button>
                    </form>
                ) : (
                    <>
                        {/* Tabs */}
                        <div className="flex gap-2 mb-6 bg-slate-900/40 p-1 rounded-xl">
                            {(['login', 'register'] as Tab[]).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTab(t)}
                                    className={[
                                        'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all',
                                        tab === t ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                                    ].join(' ')}
                                >
                                    {t === 'login' ? 'Iniciar sesión' : 'Registrarse'}
                                </button>
                            ))}
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {tab === 'register' && (
                                <div className="relative">
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Nombre (opcional)"
                                        value={form.name}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        className={`${inputClass} pl-10`}
                                    />
                                </div>
                            )}

                            <div className="relative">
                                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="email"
                                    placeholder="Email"
                                    required
                                    value={form.email}
                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    className={`${inputClass} pl-10`}
                                />
                            </div>

                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="Contraseña"
                                    required
                                    minLength={6}
                                    value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    className={`${inputClass} pl-10 pr-10`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(s => !s)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>

                            {error && (
                                <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {submitting ? (
                                    <Loader size={18} className="animate-spin" />
                                ) : tab === 'login' ? (
                                    <><LogIn size={16} /> Ingresar</>
                                ) : (
                                    <><UserPlus size={16} /> Crear cuenta</>
                                )}
                            </button>

                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-slate-700/60" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-[#1e293b] px-2 text-slate-500 font-medium">
                                        o continuar con
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-center">
                                {googleEnabled ? (
                                    <GoogleLogin
                                        onSuccess={handleGoogleSuccess}
                                        onError={() => error ? null : setSubmitting(false)}
                                        theme="filled_black"
                                        text={tab === 'login' ? 'signin_with' : 'signup_with'}
                                        shape="rectangular"
                                        width="100%"
                                    />
                                ) : (
                                    <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 w-full text-center">
                                        Google Login desactivado: falta <b>VITE_GOOGLE_CLIENT_ID</b> en el frontend.
                                    </p>
                                )}
                            </div>
                        </form>
                    </>
                )}

                <p className="text-center text-xs text-slate-500 mt-4">
                    Tu información está protegida con AES-256 y JWT
                </p>
            </div>
        </div>
    );
};
