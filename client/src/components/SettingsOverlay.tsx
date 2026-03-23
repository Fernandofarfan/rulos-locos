import React from 'react';
import { X, Bell, Volume2, Save, SlidersHorizontal, TrendingUp } from 'lucide-react';

import { useSettings } from '../hooks/useSettings';
import { ApiKeysManager } from './ApiKeysManager';
import { TwoFactorManager } from './TwoFactorManager';
import { useAuth } from '../hooks/useAuth';

interface SettingsOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsOverlay: React.FC<SettingsOverlayProps> = ({ isOpen, onClose }) => {
    const settings = useSettings();
    const {
        alertThresholdPct: threshold,
        setAlertThresholdPct: setThreshold,
        soundEnabled,
        setSoundEnabled,
        telegramAlerts,
        setTelegramAlerts,
        voiceEnabled,
        setVoiceEnabled
    } = settings;

    const { user } = useAuth();

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Panel lateral */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Configuración de alertas"
                className={`fixed right-0 top-0 bottom-0 z-[100] w-80 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                            <SlidersHorizontal size={16} className="text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white">Configuración</h2>
                            <p className="text-[10px] text-slate-500">Alertas & Notificaciones</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
                        aria-label="Cerrar panel"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Contenido scrollable */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

                    {/* Umbral de ganancia */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <TrendingUp size={12} className="text-blue-400" /> Umbral de Ganancia
                        </label>
                        <input
                            type="range"
                            min="0.1"
                            max="5"
                            step="0.1"
                            value={threshold}
                            onChange={e => setThreshold(parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-600 uppercase">
                            <span>0.1%</span>
                            <span className="text-blue-400 font-black">{threshold.toFixed(1)}%</span>
                            <span>5%</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
                            Solo se notificará cuando la rentabilidad del arbitraje supere este umbral.
                        </p>
                    </div>

                    {/* Alertas sonoras */}
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                <Volume2 size={16} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white">Sonidos</div>
                                <div className="text-[10px] text-slate-500">Campana de notificación</div>
                            </div>
                        </div>
                        <button
                            role="switch"
                            aria-checked={soundEnabled}
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${soundEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
                        >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                    </div>

                    {/* Alertas de Voz (Bloomberg) */}
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-violet-500/30 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
                                <Volume2 size={16} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white">Voz IA (Bloomberg)</div>
                                <div className="text-[10px] text-slate-500">Lectura en voz alta de cotizaciones</div>
                            </div>
                        </div>
                        <button
                            role="switch"
                            aria-checked={voiceEnabled}
                            onClick={() => setVoiceEnabled(!voiceEnabled)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shadow-lg ${voiceEnabled ? 'bg-violet-600 shadow-violet-900/50' : 'bg-slate-700'}`}
                        >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${voiceEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                    </div>

                    {/* Alertas Telegram */}
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400">
                                <Bell size={16} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white">Telegram Broadcast</div>
                                <div className="text-[10px] text-slate-500">Alertas al celular 24/7</div>
                            </div>
                        </div>
                        <button
                            role="switch"
                            aria-checked={telegramAlerts}
                            onClick={() => setTelegramAlerts(!telegramAlerts)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${telegramAlerts ? 'bg-sky-600' : 'bg-slate-700'}`}
                        >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${telegramAlerts ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                    </div>

                    {telegramAlerts && (
                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2">
                            <p className="text-xs text-blue-200 font-bold">Instrucciones Telegram Bot:</p>
                            <ol className="list-decimal pl-4 text-xs text-slate-300 space-y-1">
                                <li>Buscá <strong>@RulosLocosBot</strong> en Telegram</li>
                                <li>Enviá el comando <code>/start</code></li>
                                <li>El bot automáticamente guardará tu ID y comenzarás a recibir Alertas de Oportunidades.</li>
                            </ol>
                            {user?.telegramId && (
                                <div className="mt-3 text-[10px] text-emerald-400 flex items-center gap-1 font-bold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Vinculado (ID: {user.telegramId})
                                </div>
                            )}
                        </div>
                    )}

                    <div className="pt-6 border-t border-white/10 space-y-6">
                        {user ? (
                            <>
                                <ApiKeysManager />
                                <TwoFactorManager />
                            </>
                        ) : <p className="text-xs text-slate-500 text-center">Iniciá sesión para vincular exchanges y habilitar 2FA.</p>}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-5 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 transition-all active:scale-[0.98]"
                    >
                        <Save size={16} />
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </>
    );
};

