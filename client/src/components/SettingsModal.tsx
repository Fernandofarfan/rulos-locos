import React from 'react';
import { X, Save, Shield, Percent, Globe, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../hooks/useTheme';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const [bankFee, setBankFee] = React.useState(0.6);
    const { theme, toggleTheme } = useTheme();

    if (!isOpen) return null;

    const handleSave = () => {
        // Here you would typically save to context or local storage
        toast.success('Configuración guardada', {
            description: 'Tus preferencias han sido actualizadas.'
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#0b0e14] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <h3 className="text-lg font-bold text-white">Configuración</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-accent-primary uppercase tracking-widest flex items-center gap-2">
                            <Shield size={14} /> General
                        </h4>

                        <div className="space-y-2">
                            <label className="text-sm text-slate-300">Tema de la aplicación</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => theme === 'light' && toggleTheme()}
                                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${theme === 'dark'
                                            ? 'bg-accent-primary/20 border-accent-primary text-white'
                                            : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                                        }`}
                                >
                                    <Moon size={14} />
                                    Dark Pro
                                </button>
                                <button
                                    onClick={() => theme === 'dark' && toggleTheme()}
                                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${theme === 'light'
                                            ? 'bg-amber-400/20 border-amber-400/60 text-amber-300'
                                            : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                                        }`}
                                >
                                    <Sun size={14} />
                                    Light
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-accent-secondary uppercase tracking-widest flex items-center gap-2">
                            <Percent size={14} /> Valores por Defecto
                        </h4>

                        <div className="space-y-2">
                            <label className="text-sm text-slate-300 flex justify-between">
                                Comisión Bancaria
                                <span className="text-xs text-slate-500">Impuesto al cheque, etc.</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={bankFee}
                                    onChange={(e) => setBankFee(parseFloat(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-3 pr-8 text-white focus:border-accent-primary/50 outline-none transition-colors"
                                />
                                <span className="absolute right-3 top-2 text-slate-500 text-sm">%</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-slate-300 flex justify-between">
                                Idioma
                            </label>
                            <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5 text-slate-400 text-sm">
                                <Globe size={16} />
                                Español (Argentina)
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 rounded-lg text-sm font-bold bg-accent-primary hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                    >
                        <Save size={16} />
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
};
