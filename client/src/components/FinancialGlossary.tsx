import React, { useState, useMemo } from 'react';
import { BookOpen, Search, X, ChevronRight } from 'lucide-react';

interface Term {
    word: string;
    category: string;
    definition: string;
    example?: string;
}

const GLOSSARY: Term[] = [
    { word: 'Blue Dollar', category: 'Cambio', definition: 'Tipo de cambio no oficial que opera en el mercado informal (paralelo). Su precio es determinado por la oferta y demanda, generalmente más alto que el oficial.', example: 'Si el oficial está en $950 y el blue en $1.250, la brecha es del 31%.' },
    { word: 'MEP / Bolsa', category: 'Cambio', definition: 'Mercado Electrónico de Pagos. Compra de dólares a través de la compra-venta de bonos en la bolsa porteña. Legal y sin restricciones de monto.', example: 'Comprás AL30 en ARS y lo vendés en USD.' },
    { word: 'CCL (Cable)', category: 'Cambio', definition: 'Contado Con Liquidación. Similar al MEP pero los dólares se acreditan en una cuenta en el exterior. Generalmente más caro que el MEP.', example: 'Precio CCL > Precio MEP > Precio Oficial.' },
    { word: 'Brecha Cambiaria', category: 'Macro', definition: 'Diferencia porcentual entre el tipo de cambio blue (o CCL) y el tipo de cambio oficial. Indica la presión sobre las reservas.', example: 'Brecha = (Blue - Oficial) / Oficial × 100.' },
    { word: 'BADLAR', category: 'Tasas', definition: 'Tasa de interés de referencia para depósitos bancarios a plazo fijo superiores a $1 millón. Publicada diariamente por el BCRA.', example: 'BADLAR del 110% TNA implica ~9.1% mensual.' },
    { word: 'TNA / TEM / TEA', category: 'Tasas', definition: 'TNA (Tasa Nominal Anual), TEM (Tasa Efectiva Mensual), TEA (Tasa Efectiva Anual). La TNA no capitaliza; la TEA sí.', example: 'TNA 120% = TEM 10% = TEA ~213%.' },
    { word: 'Plazo Fijo UVA', category: 'Ahorro', definition: 'Depósito a plazo cuya rentabilidad está atada a la variación del Índice de Precios al Consumidor (inflación). Garantiza tasa real positiva.', example: 'Si la inflación es 8%, el UVA te asegura ese 8% más un plus.' },
    { word: 'CEDEAR', category: 'Inversión', definition: 'Certificado de Depósito Argentino. Representa acciones de empresas extranjeras (Apple, Google) que se operan en ARS en BYMA.', example: 'AAPL CEDEAR con ratio 10: 10 CEDEARs = 1 ADR.' },
    { word: 'ROFEX / DI', category: 'Derivados', definition: 'Mercado de futuros de dólar. Los contratos DI implican una TNA implícita que el mercado espera para el tipo de cambio oficial futuro.', example: 'DI Mar $1.300 con DI Feb $1.200 implica ~8.3% mensual.' },
    { word: 'Dólar Soja', category: 'Export.', definition: 'Tipo de cambio especial y temporal que el gobierno ofrece a productores de soja para incentivar la liquidación de exportaciones.', example: 'Tipo de cambio diferencial transitorio, por encima del oficial.' },
    { word: 'Carry Trade', category: 'Estrategia', definition: 'Estrategia que consiste en tomar deuda en moneda de baja tasa (USD) e invertir en moneda de alta tasa (ARS) para capturar la diferencia.', example: 'Si la tasa ARS es 110% y el dólar sube solo 60%, hay carry positivo.' },
    { word: 'BCRA', category: 'Institución', definition: 'Banco Central de la República Argentina. Regula la política monetaria, las tasas de interés y el tipo de cambio oficial.', example: 'El BCRA fija la tasa de política monetaria.' },
    { word: 'INDEC', category: 'Estadística', definition: 'Instituto Nacional de Estadísticas y Censos. Publica mensualmente el IPC (Índice de Precios al Consumidor) y el EMAE (actividad económica).', example: 'El IPC de enero fue del 2.4% según INDEC.' },
    { word: 'FCI', category: 'Fondos', definition: 'Fondo Común de Inversión. Vehículo colectivo que permite invertir en una cartera diversificada con liquidez inmediata (T+0 los money market).', example: 'Un FCI money market rinde BADLAR diariamente.' },
    { word: 'Reservas BCRA', category: 'Macro', definition: 'Activos externos del BCRA. Las brutas incluyen swaps y encajes; las netas (o "líquidas") excluyen pasivos exigibles en el corto plazo.', example: 'Reservas brutas $27B vs. netas negativas.' },
    { word: 'Dólar Implícito', category: 'CEDEARs', definition: 'Tipo de cambio que surge de comparar el precio local (ARS) de un CEDEAR con el precio de su ADR en USD en el exterior usando el ratio de conversión.', example: 'AAPL ARS / ratio / AAPL USD = dólar implícito.' },
];

const CATEGORIES = ['Todos', ...Array.from(new Set(GLOSSARY.map(t => t.category)))];

export const FinancialGlossary: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
    const [query, setQuery] = useState('');
    const [cat, setCat] = useState('Todos');
    const [expanded, setExpanded] = useState<string | null>(null);

    const filtered = useMemo(() =>
        GLOSSARY.filter(t => {
            const matchCat = cat === 'Todos' || t.category === cat;
            const matchQ = !query || t.word.toLowerCase().includes(query.toLowerCase()) || t.definition.toLowerCase().includes(query.toLowerCase());
            return matchCat && matchQ;
        }).sort((a, b) => a.word.localeCompare(b.word)),
        [query, cat]
    );

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div
                className="relative w-full max-w-2xl bg-[#0a0f1a] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <BookOpen size={16} className="text-amber-400" />
                        <h2 className="text-base font-bold text-white">Glosario Financiero</h2>
                        <span className="text-[9px] bg-amber-400/10 text-amber-400 border border-amber-400/20 px-1.5 py-0.5 rounded font-bold">{GLOSSARY.length} términos</span>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Search + filter */}
                <div className="p-4 border-b border-white/5 space-y-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar término..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            autoFocus
                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-amber-400/40 transition-colors"
                        />
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                        {CATEGORIES.map(c => (
                            <button
                                key={c}
                                onClick={() => setCat(c)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${cat === c ? 'bg-amber-400/15 border-amber-400/30 text-amber-300' : 'border-white/10 text-slate-500 hover:text-white'}`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Terms list */}
                <div className="overflow-y-auto flex-1 p-3 space-y-1 custom-scrollbar">
                    {filtered.length === 0 && (
                        <div className="text-center py-10 text-slate-500 text-sm">No se encontraron términos</div>
                    )}
                    {filtered.map(term => (
                        <div key={term.word} className="rounded-xl border border-white/5 overflow-hidden">
                            <button
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                                onClick={() => setExpanded(expanded === term.word ? null : term.word)}
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-white">{term.word}</span>
                                        <span className="text-[9px] bg-white/5 border border-white/10 text-slate-500 px-1.5 py-0.5 rounded">{term.category}</span>
                                    </div>
                                    {expanded !== term.word && (
                                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{term.definition}</p>
                                    )}
                                </div>
                                <ChevronRight size={14} className={`text-slate-600 flex-shrink-0 transition-transform ${expanded === term.word ? 'rotate-90' : ''}`} />
                            </button>
                            {expanded === term.word && (
                                <div className="px-4 pb-3 bg-white/2 text-xs text-slate-300 space-y-1.5">
                                    <p className="leading-relaxed">{term.definition}</p>
                                    {term.example && (
                                        <p className="text-slate-500 italic border-l-2 border-amber-400/30 pl-2">{term.example}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
