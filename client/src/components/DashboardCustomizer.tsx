import React, { useState, useCallback, useEffect } from 'react';
import { GripVertical, X, LayoutGrid, RotateCcw } from 'lucide-react';

const STORAGE_KEY = 'rulos-locos-dashboard-layout';

export interface WidgetConfig {
    id: string;
    label: string;
    section: string;
    visible: boolean;
    order: number;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
    { id: 'hero', label: 'Dólar Blue', section: 'dashboard', visible: true, order: 0 },
    { id: 'stats', label: 'Stats Cards', section: 'dashboard', visible: true, order: 1 },
    { id: 'chart', label: 'Gráfico Histórico', section: 'dashboard', visible: true, order: 2 },
    { id: 'arbitrage', label: 'Hub de Arbitraje', section: 'dashboard', visible: true, order: 3 },
    { id: 'macro', label: 'Macro Dashboard', section: 'dashboard', visible: true, order: 4 },
    { id: 'ticker', label: 'Market Ticker', section: 'dashboard', visible: true, order: 5 },
    { id: 'news', label: 'Noticias', section: 'dashboard', visible: true, order: 6 },
    { id: 'calendar', label: 'Calendario', section: 'dashboard', visible: true, order: 7 },
    { id: 'backtester', label: 'Backtester', section: 'dashboard', visible: true, order: 8 },
    { id: 'comparator', label: 'Comparador', section: 'dashboard', visible: true, order: 9 },
    { id: 'predictor', label: 'Predictor IA', section: 'dashboard', visible: true, order: 10 },
];

function loadLayout(): WidgetConfig[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return DEFAULT_WIDGETS;
}

function saveLayout(widgets: WidgetConfig[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
}

interface DashboardCustomizerProps {
    onLayoutChange?: (widgets: WidgetConfig[]) => void;
}

export const DashboardCustomizer: React.FC<DashboardCustomizerProps> = ({ onLayoutChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [widgets, setWidgets] = useState<WidgetConfig[]>(loadLayout);
    const [dragIdx, setDragIdx] = useState<number | null>(null);

    useEffect(() => {
        onLayoutChange?.(widgets);
    }, [widgets, onLayoutChange]);

    const toggleWidget = useCallback((id: string) => {
        setWidgets(prev => {
            const updated = prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
            saveLayout(updated);
            return updated;
        });
    }, []);

    const moveWidget = useCallback((from: number, to: number) => {
        setWidgets(prev => {
            const arr = [...prev];
            const [item] = arr.splice(from, 1);
            arr.splice(to, 0, item);
            const reordered = arr.map((w, i) => ({ ...w, order: i }));
            saveLayout(reordered);
            return reordered;
        });
    }, []);

    const resetLayout = useCallback(() => {
        setWidgets(DEFAULT_WIDGETS);
        saveLayout(DEFAULT_WIDGETS);
    }, []);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-white px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                title="Personalizar Dashboard"
            >
                <LayoutGrid size={11} />
                Personalizar
            </button>
        );
    }

    return (
        <>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
                <div className="relative z-10 w-full max-w-md mx-4 glass-panel p-6 animate-fade-in" style={{ transform: 'none' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <LayoutGrid size={18} className="text-blue-400" />
                            <h3 className="text-lg font-bold text-white">Personalizar Dashboard</h3>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={resetLayout} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-amber-400 transition" title="Restaurar">
                                <RotateCcw size={14} />
                            </button>
                            <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500">
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    <p className="text-xs text-slate-500 mb-4">Arrastrá para reordenar · Click para mostrar/ocultar</p>

                    <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                        {widgets.map((widget, idx) => (
                            <div
                                key={widget.id}
                                draggable
                                onDragStart={() => setDragIdx(idx)}
                                onDragOver={e => { e.preventDefault(); }}
                                onDrop={() => {
                                    if (dragIdx !== null && dragIdx !== idx) moveWidget(dragIdx, idx);
                                    setDragIdx(null);
                                }}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-grab active:cursor-grabbing ${
                                    dragIdx === idx ? 'bg-blue-500/20 border border-blue-500/30' :
                                    widget.visible ? 'bg-white/5 hover:bg-white/8' : 'bg-white/[0.02] opacity-50'
                                }`}
                            >
                                <GripVertical size={14} className="text-slate-600 flex-shrink-0" />
                                <span className={`flex-1 text-sm ${widget.visible ? 'text-white' : 'text-slate-600'}`}>
                                    {widget.label}
                                </span>
                                <button
                                    onClick={() => toggleWidget(widget.id)}
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
                                        widget.visible
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : 'bg-white/5 text-slate-600'
                                    }`}
                                >
                                    {widget.visible ? 'ON' : 'OFF'}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 text-center">
                        <p className="text-[10px] text-slate-600">Configuración guardada automáticamente</p>
                    </div>
                </div>
            </div>
        </>
    );
};

/** Hook to get widget layout */
export function useWidgetLayout() {
    const [widgets] = useState<WidgetConfig[]>(loadLayout);
    const isVisible = useCallback((id: string) => {
        return widgets.find(w => w.id === id)?.visible ?? true;
    }, [widgets]);
    return { widgets, isVisible };
}
