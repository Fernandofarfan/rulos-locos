import React, { useState, useCallback, useEffect } from 'react';
import { Palette, X, Check } from 'lucide-react';

const STORAGE_KEY = 'rulos-locos-accent';

const ACCENT_PRESETS = [
    { id: 'blue', label: 'Azul', hue: '217', color: '#3b82f6' },
    { id: 'violet', label: 'Violeta', hue: '262', color: '#8b5cf6' },
    { id: 'emerald', label: 'Esmeralda', hue: '160', color: '#10b981' },
    { id: 'amber', label: 'Ámbar', hue: '38', color: '#f59e0b' },
    { id: 'rose', label: 'Rosa', hue: '350', color: '#f43f5e' },
    { id: 'cyan', label: 'Cyan', hue: '190', color: '#06b6d4' },
    { id: 'orange', label: 'Naranja', hue: '25', color: '#f97316' },
    { id: 'lime', label: 'Lima', hue: '85', color: '#84cc16' },
] as const;

function applyAccent(hue: string) {
    document.documentElement.style.setProperty('--accent-hue', hue);
    document.documentElement.style.setProperty('--accent-primary', `hsl(${hue}, 80%, 55%)`);
    document.documentElement.style.setProperty('--accent-secondary', `hsl(${hue}, 70%, 45%)`);
}

function loadAccent(): string {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved || '217'; // Default blue
}

export const ThemeCustomizer: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeHue, setActiveHue] = useState(loadAccent);

    useEffect(() => {
        applyAccent(activeHue);
    }, [activeHue]);

    const selectAccent = useCallback((hue: string) => {
        setActiveHue(hue);
        localStorage.setItem(STORAGE_KEY, hue);
        applyAccent(hue);
    }, []);

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-white transition-colors"
                title="Personalizar colores"
            >
                <Palette size={12} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute bottom-full right-0 mb-2 z-50 glass-panel p-4 animate-fade-in" style={{ transform: 'none' }}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-white">Color de acento</span>
                            <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white">
                                <X size={12} />
                            </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {ACCENT_PRESETS.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => selectAccent(preset.hue)}
                                    className={`relative w-10 h-10 rounded-xl border-2 transition-all hover:scale-110 ${
                                        activeHue === preset.hue
                                            ? 'border-white shadow-lg'
                                            : 'border-transparent'
                                    }`}
                                    style={{ backgroundColor: preset.color }}
                                    title={preset.label}
                                >
                                    {activeHue === preset.hue && (
                                        <Check size={14} className="absolute inset-0 m-auto text-white drop-shadow" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </>
    );
};
