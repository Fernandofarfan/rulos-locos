import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Wallet, AlertTriangle, ArrowRight, Bell, BellRing, PlayCircle, History, Download, ArrowUpDown, ChevronUp, ChevronDown, X } from 'lucide-react';
import { Tooltip } from './ui/Tooltip';
import type { ArbitrageOpportunity, SpreadHistoryPoint } from '../types';
import MarketInsight from './MarketInsight';
import { exportToCSV } from '../utils/exportCSV';

interface ArbitrageHubProps {
    opportunities: ArbitrageOpportunity[];
    history?: SpreadHistoryPoint[];
    loading?: boolean;
}

export const ArbitrageHub: React.FC<ArbitrageHubProps> = ({ opportunities, history = [], loading }) => {
    // Alert State
    const [alertThreshold, setAlertThreshold] = useState<number>(3); // %
    const [alertsEnabled, setAlertsEnabled] = useState(false);
    const [showConfig, setShowConfig] = useState(false);

    // Simulation State
    const [simulatedTrades, setSimulatedTrades] = useState<any[]>([]);
    const [showSimHistory, setShowSimHistory] = useState(false);

    // Sort State
    type SortKey = 'rentabilidad' | 'ganancia' | 'riesgo';
    const [sortKey, setSortKey] = useState<SortKey>('rentabilidad');
    const [sortAsc, setSortAsc] = useState(false);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortAsc(v => !v);
        else { setSortKey(key); setSortAsc(false); }
    };

    const sortedOpportunities = useMemo(() => {
        return [...opportunities].sort((a, b) => {
            let aVal: number, bVal: number;
            if (sortKey === 'riesgo') {
                const riskOrder: Record<string, number> = { bajo: 0, medio: 1, alto: 2 };
                aVal = riskOrder[(a.riesgo ?? '').toLowerCase()] ?? 1;
                bVal = riskOrder[(b.riesgo ?? '').toLowerCase()] ?? 1;
            } else {
                aVal = a[sortKey] ?? 0;
                bVal = b[sortKey] ?? 0;
            }
            return sortAsc ? aVal - bVal : bVal - aVal;
        });
    }, [opportunities, sortKey, sortAsc]);

    // Professional Simulation Modal State
    const [simModalOpen, setSimModalOpen] = useState(false);
    const [selectedOp, setSelectedOp] = useState<ArbitrageOpportunity | null>(null);
    const [simAmount, setSimAmount] = useState<string>('100000');
    const [simFees, setSimFees] = useState(0.6); // Default 0.6% total fees

    useEffect(() => {
        // Load simulated trades
        const stored = localStorage.getItem('sim_trades');
        if (stored) setSimulatedTrades(JSON.parse(stored));

        // Check alerts
        if (alertsEnabled && opportunities.length > 0) {
            const bestOp = opportunities[0];
            if (bestOp.rentabilidad >= alertThreshold) {
                if (Notification.permission === 'granted') {
                    // Notification logic
                }
            }
        }
    }, [opportunities, alertsEnabled, alertThreshold]);

    const toggleAlerts = async () => {
        if (!alertsEnabled) {
            if ('Notification' in window) {
                const perm = await Notification.requestPermission();
                if (perm === 'granted') setAlertsEnabled(true);
            }
        } else {
            setAlertsEnabled(false);
        }
    };

    const openSimulationModal = (op: ArbitrageOpportunity) => {
        setSelectedOp(op);
        setSimModalOpen(true);
    };

    const executeSimulation = () => {
        if (!selectedOp) return;

        const amount = parseFloat(simAmount);
        const feesAmount = amount * (simFees / 100);
        const grossProfit = amount * (selectedOp.rentabilidad / 100);
        const netProfit = grossProfit - feesAmount;
        const netRentabilidad = ((netProfit) / amount) * 100;

        const trade = {
            id: Date.now(),
            date: new Date().toLocaleString(),
            ...selectedOp,
            investedAmount: amount,
            fees: feesAmount,
            finalProfit: netProfit,
            realRentabilidad: netRentabilidad,
            status: 'Simulated'
        };

        const newTrades = [trade, ...simulatedTrades];
        setSimulatedTrades(newTrades);
        localStorage.setItem('sim_trades', JSON.stringify(newTrades));

        // Show feedback
        toast.success('Operación simulada con éxito', {
            description: `Ganancia estimada: $${netProfit.toFixed(2)}`,
        });
        setSimModalOpen(false);
    };

    // Simple Sparkline SVG
    const renderSparkline = () => {
        if (!history || history.length < 2) return null;

        const width = 100; // viewBox units
        const height = 40;
        const minVal = Math.min(...history.map(h => h.value));
        const maxVal = Math.max(...history.map(h => h.value));
        const range = maxVal - minVal || 1; // avoid /0

        // Map points
        const points = history.map((h, i) => {
            const x = (i / (history.length - 1)) * width;
            const y = height - ((h.value - minVal) / range) * height;
            return `${x},${y}`;
        }).join(' ');

        return (
            <div className="absolute bottom-4 right-6 w-32 h-10 opacity-50 pointer-events-none">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                    <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} className="text-accent-primary" />
                    {/* Last dot */}
                    <circle cx={width} cy={height - ((history[history.length - 1].value - minVal) / range) * height} r="3" className="fill-accent-primary animate-pulse" />
                </svg>
                <div className="text-[9px] text-right text-accent-primary mt-1 font-mono">
                    Spread Trend (1h)
                </div>
            </div>
        );
    };

    const handleExportCSV = () => {
        if (opportunities.length === 0) { toast.error('No hay oportunidades para exportar'); return; }
        exportToCSV(
            opportunities.map(op => ({
                descripcion: op.description,
                rentabilidad_pct: op.rentabilidad,
                ganancia_estimada_usd: op.ganancia,
                precio_compra: op.buyPrice ?? '',
                precio_venta: op.sellPrice ?? '',
            })),
            'oportunidades_arbitraje'
        );
        toast.success('CSV exportado correctamente');
    };

    return (
        <div className="glass-panel no-lift p-0 h-full flex flex-col overflow-hidden relative" aria-busy={loading}>
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-white/[0.02] relative">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 shadow-[0_0_15px_-5px_var(--accent-primary)]">
                            <Wallet size={20} className="text-accent-primary" />
                        </div>
                        Oportunidades
                    </h3>

                    <div className="flex items-center gap-2">
                        {/* CSV Export */}
                        <Tooltip content="Exportar CSV" placement="bottom">
                            <button
                                onClick={handleExportCSV}
                                className="p-2 rounded-lg border border-transparent text-slate-500 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/10 transition-colors"
                            >
                                <Download size={16} />
                            </button>
                        </Tooltip>
                        {/* Simulation History Toggle */}
                        <Tooltip content={showSimHistory ? 'Ocultar historial' : 'Ver historial simulado'} placement="bottom">
                            <button
                                onClick={() => setShowSimHistory(!showSimHistory)}
                                className={`p-2 rounded-lg border transition-colors ${showSimHistory ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-slate-500 hover:text-white'}`}
                            >
                                <History size={16} />
                            </button>
                        </Tooltip>

                        {/* Alert Toggle */}
                        <div className="relative">
                            <button
                                onClick={() => setShowConfig(!showConfig)}
                                className={`p-2 rounded-lg border transition-colors flex items-center gap-2 ${alertsEnabled ? 'bg-accent-primary/20 border-accent-primary/50 text-accent-primary' : 'bg-white/5 border-white/5 text-slate-400'}`}
                            >
                                {alertsEnabled ? <BellRing size={16} /> : <Bell size={16} />}
                                {alertsEnabled && <span className="text-xs font-bold">{alertThreshold}%</span>}
                            </button>

                            {/* Alert Config Popover */}
                            {showConfig && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900 border border-white/10 rounded-xl p-3 shadow-xl z-50">
                                    <h4 className="text-xs font-bold text-white mb-2">Alerta de Spread</h4>
                                    <div className="flex items-center gap-2 mb-3">
                                        <input
                                            type="range"
                                            min="0.5"
                                            max="10"
                                            step="0.5"
                                            value={alertThreshold}
                                            onChange={(e) => setAlertThreshold(parseFloat(e.target.value))}
                                            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <span className="text-xs font-mono text-accent-primary min-w-[30px]">{alertThreshold}%</span>
                                    </div>
                                    <button
                                        onClick={toggleAlerts}
                                        className={`w-full py-1.5 rounded-lg text-xs font-bold transition-colors ${alertsEnabled ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
                                    >
                                        {alertsEnabled ? 'Desactivar' : 'Activar Alertas'}
                                    </button>
                                </div>
                            )}
                        </div>

                        <span className="text-[10px] bg-accent-primary/10 text-accent-primary px-3 py-1 rounded-full border border-accent-primary/20 font-bold uppercase tracking-wider shadow-sm ml-2">
                            {opportunities.length}
                        </span>
                    </div>
                </div>



                {renderSparkline()}

                {/* Sort Controls */}
                {!showSimHistory && opportunities.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-3">
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mr-1">Ordenar:</span>
                        {([['rentabilidad', 'Rentab.'], ['ganancia', 'Ganancia'], ['riesgo', 'Riesgo']] as [SortKey, string][]).map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => toggleSort(key)}
                                className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                                    sortKey === key
                                        ? 'bg-accent-primary/10 border-accent-primary/30 text-accent-primary'
                                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                                }`}
                            >
                                {label}
                                {sortKey === key
                                    ? (sortAsc ? <ChevronUp size={10} /> : <ChevronDown size={10} />)
                                    : <ArrowUpDown size={9} className="opacity-40" />}
                            </button>
                        ))}
                    </div>
                )}

                {/* AI Market Insight Integration */}
                <MarketInsight arbitrageOpportunities={opportunities} />
            </div>

            {/* Content: List or Simulation History */}
            <div className="custom-scrollbar flex-1 overflow-y-auto p-4 space-y-3 relative">
                {showSimHistory ? (
                    <div className="space-y-2">
                        <h4 className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-3 pl-2">Trades Simulados</h4>
                        {simulatedTrades.length === 0 ? (
                            <div className="text-center text-slate-500 text-sm py-10">No hay operaciones simuladas</div>
                        ) : (
                            simulatedTrades.map((trade: any) => (
                                <div key={trade.id} className="bg-white/5 p-3 rounded-lg border border-white/5 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-xs text-slate-400">{trade.date}</div>
                                            <div className="text-sm font-bold text-white">{trade.description}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-success font-bold font-mono">+{trade.rentabilidad}%</div>
                                        </div>
                                    </div>
                                    {/* Price Details */}
                                    <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-white/5 pt-2">
                                        <span>Compra: <span className="text-slate-300">${trade.buyPrice}</span></span>
                                        <ArrowRight size={10} />
                                        <span>Venta: <span className="text-slate-300">${trade.sellPrice}</span></span>
                                        <span className="text-emerald-400 font-mono">+${trade.ganancia}</span>
                                    </div>
                                </div>
                            ))
                        )}
                        <button
                            onClick={() => setShowSimHistory(false)}
                            className="w-full text-xs text-slate-400 hover:text-white py-2 border border-white/10 rounded-lg mt-2 mb-2"
                        >
                            ← Volver a Oportunidades
                        </button>
                        {simulatedTrades.length > 0 && (
                            <button
                                onClick={() => { setSimulatedTrades([]); localStorage.removeItem('sim_trades'); }}
                                className="w-full text-xs text-red-400 hover:text-red-300 py-2 border border-dashed border-red-500/20 rounded-lg"
                            >
                                Borrar Historial
                            </button>
                        )}
                    </div>
                ) : (
                    /* Existing List Logic */
                    loading ? (
                        [1, 2].map(i => (
                            <div key={i} className="p-5 bg-white/5 rounded-2xl border border-white/5 animate-pulse h-28"></div>
                        ))
                    ) : opportunities.length > 0 ? (
                        sortedOpportunities.map((op, idx) => (
                            <div key={idx} className="group relative p-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl border border-white/5 hover:border-accent-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-accent-primary/5 hover:-translate-y-0.5">
                                {/* Hover Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/0 via-accent-primary/0 to-accent-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none"></div>

                                <div className="flex justify-between items-center relative z-10">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{op.description}</span>
                                        <span className="text-white font-bold font-mono tracking-tight text-sm">Est. ${op.ganancia}</span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-end">
                                            <span className="text-success font-black text-lg tracking-tight leading-none">+{op.rentabilidad}%</span>
                                        </div>
                                        <Tooltip content="Simular operación" placement="left">
                                        <button
                                            onClick={() => openSimulationModal(op)}
                                            aria-label="Simular operación de arbitraje"
                                            className="p-1.5 bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary rounded-lg border border-accent-primary/20 transition-colors"
                                        >
                                            <PlayCircle size={14} />
                                        </button>
                                        </Tooltip>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-4">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                <AlertTriangle size={32} className="text-slate-600" />
                            </div>
                            <p className="text-slate-400 text-sm font-medium">
                                No se encontraron oportunidades significativas
                            </p>
                        </div>
                    )
                )}
            </div>

            {/* ── Modal de Simulación ── */}
            {simModalOpen && selectedOp && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    onClick={() => setSimModalOpen(false)}
                >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div
                        className="relative glass-panel p-6 w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <PlayCircle size={18} className="text-accent-primary" />
                                Simular Arbitraje
                            </h3>
                            <button
                                onClick={() => setSimModalOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Operación seleccionada */}
                        <div className="mb-5 p-3 rounded-xl bg-white/5 border border-white/10">
                            <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">{selectedOp.description}</div>
                            <div className="flex items-center justify-between">
                                <span className="text-white text-sm font-semibold">{selectedOp.buyIn} → {selectedOp.sellIn}</span>
                                <span className="text-success font-black text-lg">+{selectedOp.rentabilidad}%</span>
                            </div>
                        </div>

                        {/* Monto a invertir */}
                        <div className="mb-4">
                            <label className="text-xs text-slate-400 font-medium block mb-1.5">Monto a invertir (ARS)</label>
                            <input
                                type="number"
                                value={simAmount}
                                onChange={e => setSimAmount(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-accent-primary/50"
                            />
                        </div>

                        {/* Comisiones */}
                        <div className="mb-5">
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs text-slate-400 font-medium">Comisiones totales</label>
                                <span className="text-xs font-mono text-accent-primary">{simFees}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="5"
                                step="0.1"
                                value={simFees}
                                onChange={e => setSimFees(parseFloat(e.target.value))}
                                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        {/* Preview resultado */}
                        {(() => {
                            const amt = parseFloat(simAmount) || 0;
                            const gross = amt * (selectedOp.rentabilidad / 100);
                            const fees = amt * (simFees / 100);
                            const net = gross - fees;
                            return (
                                <div className="mb-5 grid grid-cols-2 gap-2">
                                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Ganancia bruta</div>
                                        <div className="text-sm font-bold text-white font-mono">+${gross.toFixed(0)}</div>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-success/10 border border-success/20 text-center">
                                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Ganancia neta</div>
                                        <div className={`text-sm font-bold font-mono ${net >= 0 ? 'text-success' : 'text-rose-400'}`}>+${net.toFixed(0)}</div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Botón ejecutar */}
                        <button
                            onClick={executeSimulation}
                            className="w-full py-2.5 rounded-xl bg-accent-primary/20 hover:bg-accent-primary/30 border border-accent-primary/30 text-accent-primary font-bold text-sm transition-colors"
                        >
                            Guardar simulación
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
