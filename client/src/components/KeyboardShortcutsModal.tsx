import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { SHORTCUT_LIST } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsModalProps {
    open: boolean;
    onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ open, onClose }) => {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <Keyboard size={16} className="text-accent-primary" />
                        <h2 className="font-bold text-white text-sm uppercase tracking-widest">Atajos de Teclado</h2>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-2">
                    {SHORTCUT_LIST.map((s, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                            <span className="text-sm text-slate-400">{s.description}</span>
                            <div className="flex items-center gap-1">
                                {s.keys.map((k, j) => (
                                    <React.Fragment key={k}>
                                        <kbd className="px-2 py-0.5 text-[10px] font-mono font-bold bg-white/10 border border-white/15 rounded-md text-slate-300 shadow-sm">
                                            {k}
                                        </kbd>
                                        {j < s.keys.length - 1 && <span className="text-slate-600 text-[10px]">+</span>}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <p className="text-[10px] text-slate-600 mt-4 text-center">
                    Presioná <kbd className="px-1 py-0.5 bg-white/10 rounded text-[9px]">Ctrl+K</kbd> en cualquier momento
                </p>
            </div>
        </div>
    );
};
