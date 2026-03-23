import React, { useState, useEffect, useRef } from 'react';
import { Search, X, BarChart3, Landmark, Zap, Wrench, LineChart, Newspaper, TrendingUp, Calculator, DollarSign, Activity } from 'lucide-react';

interface SearchResult {
    id: string;
    label: string;
    description: string;
    icon: React.FC<{ size?: number; className?: string }>;
    action: () => void;
    category: string;
}

const ALL_RESULTS: Omit<SearchResult, 'action'>[] = [
    // Secciones
    { id: 'dashboard', label: 'Dashboard Principal', description: 'Cotizaciones Blue, MEP, CCL en tiempo real', icon: BarChart3, category: 'Secciones' },
    { id: 'mercado', label: 'Tasas & Mercado', description: 'BCRA, plazo fijo, inflación, FCI', icon: Landmark, category: 'Secciones' },
    { id: 'arbitrage', label: 'Arbitraje & Cotizaciones', description: 'Oportunidades de arbitraje en tiempo real', icon: Zap, category: 'Secciones' },
    { id: 'herramientas', label: 'Herramientas & Calculadoras', description: 'Bonos, CER, UVA, tasa real', icon: Wrench, category: 'Secciones' },
    { id: 'charts', label: 'Análisis Técnico', description: 'Gráficos, Bollinger, MACD, RSI', icon: LineChart, category: 'Secciones' },
    { id: 'portfolio', label: 'Portfolio & Noticias', description: 'Cartera personal, noticias, calendario', icon: Newspaper, category: 'Secciones' },
    // Herramientas rápidas
    { id: 'cotizaciones', label: 'Plazo Fijo por banco', description: 'Ver TNA de cada banco en tiempo real', icon: DollarSign, category: 'Herramientas' },
    { id: 'news', label: 'Noticias del mercado', description: 'Últimas noticias financieras argentinas', icon: Activity, category: 'Herramientas' },
    { id: 'rofex-panel', label: 'Futuros ROFEX', description: 'Contratos a futuro y tasa implícita', icon: TrendingUp, category: 'Herramientas' },
    { id: 'calendar', label: 'Calendario económico', description: 'Vencimientos y eventos del BCRA/INDEC', icon: Calculator, category: 'Herramientas' },
];

interface GlobalSearchModalProps {
    open: boolean;
    onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ open, onClose }) => {
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const results: SearchResult[] = ALL_RESULTS
        .filter(r =>
            !query ||
            r.label.toLowerCase().includes(query.toLowerCase()) ||
            r.description.toLowerCase().includes(query.toLowerCase()) ||
            r.category.toLowerCase().includes(query.toLowerCase())
        )
        .map(r => ({
            ...r,
            action: () => {
                const el = document.getElementById(r.id);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                onClose();
            }
        }));

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setQuery('');
            setSelected(0);
        }
    }, [open]);

    useEffect(() => { setSelected(0); }, [query]);

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
        if (e.key === 'Enter' && results[selected]) { results[selected].action(); }
        if (e.key === 'Escape') onClose();
    };

    if (!open) return null;

    // Group by category
    const categories = [...new Set(results.map(r => r.category))];

    return (
        <div
            className="fixed inset-0 z-[300] flex items-start justify-center pt-[15vh] bg-black/70 backdrop-blur-md animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
                onKeyDown={handleKey}
            >
                {/* Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                    <Search size={16} className="text-slate-400 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Buscar sección o herramienta..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="flex-1 bg-transparent text-white text-sm placeholder:text-slate-600 outline-none"
                        id="global-search-input"
                        autoComplete="off"
                    />
                    {query && (
                        <button onClick={() => setQuery('')} className="text-slate-500 hover:text-white">
                            <X size={14} />
                        </button>
                    )}
                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 rounded text-slate-600">Esc</kbd>
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto py-2">
                    {results.length === 0 ? (
                        <div className="text-center py-10 text-slate-600 text-sm">Sin resultados para «{query}»</div>
                    ) : (
                        categories.map(cat => {
                            const catResults = results.filter(r => r.category === cat);
                            return (
                                <div key={cat}>
                                    <div className="px-4 py-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest">{cat}</div>
                                    {catResults.map(result => {
                                        const Icon = result.icon;
                                        const isSelected = results.indexOf(result) === selected;
                                        return (
                                            <button
                                                key={result.id}
                                                onClick={result.action}
                                                onMouseEnter={() => setSelected(results.indexOf(result))}
                                                className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${isSelected ? 'bg-accent-primary/10' : 'hover:bg-white/5'}`}
                                            >
                                                <div className={`p-1.5 rounded-lg flex-shrink-0 ${isSelected ? 'bg-accent-primary/20 text-accent-primary' : 'bg-white/5 text-slate-500'}`}>
                                                    <Icon size={13} />
                                                </div>
                                                <div>
                                                    <div className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>{result.label}</div>
                                                    <div className="text-[10px] text-slate-600">{result.description}</div>
                                                </div>
                                                {isSelected && <span className="ml-auto text-[10px] text-slate-600">↵ Enter</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="px-4 py-2 border-t border-white/5 flex items-center gap-4 text-[10px] text-slate-700">
                    <span><kbd className="px-1 bg-white/5 rounded">↑↓</kbd> navegar</span>
                    <span><kbd className="px-1 bg-white/5 rounded">↵</kbd> ir</span>
                    <span><kbd className="px-1 bg-white/5 rounded">Esc</kbd> cerrar</span>
                </div>
            </div>
        </div>
    );
};
