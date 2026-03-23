import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, Zap, BarChart3, Settings, Download, Monitor, Bell } from 'lucide-react';

interface PaletteAction {
    id: string;
    label: string;
    description?: string;
    icon: React.FC<{ size?: number; className?: string }>;
    category: 'navigate' | 'action' | 'tool';
    handler: () => void;
}

interface CommandPaletteProps {
    onViewChange: (view: string) => void;
    onKioskMode?: () => void;
    onExportPDF?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ onViewChange, onKioskMode, onExportPDF }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIdx, setSelectedIdx] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const actions: PaletteAction[] = useMemo(() => [
        { id: 'dash', label: 'Ir al Dashboard', icon: BarChart3, category: 'navigate', handler: () => onViewChange('dashboard') },
        { id: 'arb', label: 'Ir a Arbitraje', icon: Zap, category: 'navigate', handler: () => onViewChange('arbitrage') },
        { id: 'tools', label: 'Ir a Herramientas', icon: Settings, category: 'navigate', handler: () => onViewChange('herramientas') },
        { id: 'port', label: 'Ir a Portfolio', icon: BarChart3, category: 'navigate', handler: () => onViewChange('portfolio') },
        { id: 'kiosk', label: 'Activar Modo Kiosco', description: 'Pantalla completa con cotizaciones', icon: Monitor, category: 'action', handler: () => onKioskMode?.() },
        { id: 'pdf', label: 'Exportar a PDF', description: 'Generar reporte del dashboard', icon: Download, category: 'action', handler: () => onExportPDF?.() },
        { id: 'alert', label: 'Configurar Alerta', description: 'Crear alerta de precio', icon: Bell, category: 'tool', handler: () => onViewChange('herramientas') },
        { id: 'dark', label: 'Cambiar Tema', description: 'Alternar modo oscuro/claro', icon: Settings, category: 'action', handler: () => { document.body.classList.toggle('light-theme'); } },
    ], [onViewChange, onKioskMode, onExportPDF]);

    const filtered = useMemo(() => {
        if (!query.trim()) return actions;
        const q = query.toLowerCase();
        return actions.filter(a => a.label.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q));
    }, [query, actions]);

    useEffect(() => setSelectedIdx(0), [filtered]);

    // Ctrl+K / Cmd+K toggle
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
                setQuery('');
            }
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
    }, [isOpen]);

    const runAction = useCallback((action: PaletteAction) => {
        action.handler();
        setIsOpen(false);
        setQuery('');
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
        if (e.key === 'Enter' && filtered[selectedIdx]) runAction(filtered[selectedIdx]);
    }, [filtered, selectedIdx, runAction]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
            <div className="relative z-10 w-full max-w-lg mx-4 glass-panel overflow-hidden animate-fade-in" style={{ transform: 'none' }}>
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                    <Search size={16} className="text-slate-500 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Buscar acciones, secciones..."
                        className="flex-1 bg-transparent text-white text-sm outline-none placeholder-slate-600"
                    />
                    <kbd className="text-[9px] text-slate-600 bg-white/5 px-1.5 py-0.5 rounded border border-white/10 font-mono">ESC</kbd>
                </div>

                {/* Results */}
                <div className="max-h-[40vh] overflow-y-auto py-2">
                    {filtered.length === 0 && (
                        <p className="text-center text-slate-600 text-xs py-6">Sin resultados para "{query}"</p>
                    )}
                    {filtered.map((action, idx) => {
                        const Icon = action.icon;
                        return (
                            <button
                                key={action.id}
                                onClick={() => runAction(action)}
                                onMouseEnter={() => setSelectedIdx(idx)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                                    idx === selectedIdx ? 'bg-white/5' : ''
                                }`}
                            >
                                <Icon size={16} className="text-slate-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white">{action.label}</p>
                                    {action.description && <p className="text-[10px] text-slate-600 truncate">{action.description}</p>}
                                </div>
                                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                    action.category === 'navigate' ? 'text-blue-400 bg-blue-500/10' :
                                    action.category === 'action' ? 'text-emerald-400 bg-emerald-500/10' :
                                    'text-amber-400 bg-amber-500/10'
                                }`}>{action.category === 'navigate' ? 'Ir' : action.category === 'action' ? 'Acción' : 'Tool'}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Footer hint */}
                <div className="px-4 py-2 border-t border-white/5 flex items-center gap-4 text-[9px] text-slate-600">
                    <span>↑↓ Navegar</span>
                    <span>↵ Ejecutar</span>
                    <span>ESC Cerrar</span>
                </div>
            </div>
        </div>
    );
};
