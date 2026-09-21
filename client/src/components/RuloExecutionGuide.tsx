import React, { useState } from 'react';
import { BookOpen, CheckCircle2, AlertTriangle, ShieldCheck, X, ArrowRight, HelpCircle } from 'lucide-react';

interface RuloExecutionGuideProps {
    isOpen: boolean;
    onClose: () => void;
}

export const RuloExecutionGuide: React.FC<RuloExecutionGuideProps> = ({ isOpen, onClose }) => {
    const [currentTab, setCurrentTab] = useState<'mep_blue' | 'crypto_blue'>('mep_blue');

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
            <div
                className="relative glass-panel p-6 w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-500/10 text-accent-primary rounded-xl border border-blue-500/20">
                            <BookOpen size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white tracking-tight">
                                Guía Operativa de Arbitraje (Rulos)
                            </h2>
                            <p className="text-xs text-slate-400">
                                Cómo ejecutar operaciones de spread de forma segura y legal
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Switcher de tipo de rulo */}
                <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10 mb-5">
                    <button
                        onClick={() => setCurrentTab('mep_blue')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                            currentTab === 'mep_blue'
                                ? 'bg-accent-primary text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        🏦 Rulo MEP → Blue (Bolsa a Físico)
                    </button>
                    <button
                        onClick={() => setCurrentTab('crypto_blue')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                            currentTab === 'crypto_blue'
                                ? 'bg-accent-primary text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        ⚡ Rulo Cripto (P2P USDT)
                    </button>
                </div>

                {/* Contenido MEP -> Blue */}
                {currentTab === 'mep_blue' && (
                    <div className="space-y-4 text-xs">
                        <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/15 flex items-start gap-3">
                            <ShieldCheck className="text-accent-primary shrink-0 mt-0.5" size={18} />
                            <div>
                                <p className="font-bold text-slate-200 mb-1">
                                    Objetivo: Comprar Dólar MEP más barato y arbitrar la brecha
                                </p>
                                <p className="text-slate-400 leading-relaxed">
                                    Aprovecha la diferencia entre el dólar formal bursátil (AL30) y el dólar informal en efectivo cuando el Blue cotiza por encima del MEP.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                                <span className="font-bold text-accent-primary uppercase tracking-wider text-[10px] block mb-1">
                                    Paso 1: Compra de Dólar MEP en Broker / ALyC
                                </span>
                                <p className="text-slate-300 leading-relaxed">
                                    Transferí ARS a tu broker regulado (IOL, Balanz, Cocos, etc.) y ejecutá la compra de Dólar MEP (Bono AL30). Recordá que suele haber un período de <strong className="text-white">parking de 24 hs hábiles</strong> para liquidar el bono en USD.
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                                <span className="font-bold text-accent-primary uppercase tracking-wider text-[10px] block mb-1">
                                    Paso 2: Transferencia a Cuenta Bancaria en USD
                                </span>
                                <p className="text-slate-300 leading-relaxed">
                                    Una vez acreditados los dólares en la cuenta comitente, transferilos a tu caja de ahorro en dólares en tu banco tradicional.
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                                <span className="font-bold text-accent-primary uppercase tracking-wider text-[10px] block mb-1">
                                    Paso 3: Retiro por ventanilla & Liquidación
                                </span>
                                <p className="text-slate-300 leading-relaxed">
                                    Retirá los billetes físicos por caja bancaria y vendelos al precio de compra de la contraparte o mercado libre.
                                </p>
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex gap-2">
                            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold">Advertencia regulatoria y comisiones:</span>
                                <ul className="list-disc list-inside mt-1 space-y-0.5 text-amber-200/80">
                                    <li>Comisión broker ALyC: típicamente 0.5% a 0.6% total.</li>
                                    <li>Límites BCRA: Los bancos pueden requerir justificación de ingresos si recibís transferencias frecuentes en USD.</li>
                                    <li>Riesgo precio: Durante el parking de 24h la cotización del bono puede oscilar.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Contenido Crypto P2P */}
                {currentTab === 'crypto_blue' && (
                    <div className="space-y-4 text-xs">
                        <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-start gap-3">
                            <ShieldCheck className="text-emerald-400 shrink-0 mt-0.5" size={18} />
                            <div>
                                <p className="font-bold text-slate-200 mb-1">
                                    Arbitraje Cripto USDT (Binance P2P / Lemon / Belo)
                                </p>
                                <p className="text-slate-400 leading-relaxed">
                                    Sin parking de 24hs. La operación es inmediata a través del mercado Peer-to-Peer.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                                <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px] block mb-1">
                                    Paso 1: Detección de Spread
                                </span>
                                <p className="text-slate-300 leading-relaxed">
                                    Revisá el spread entre el precio de compra P2P (Maker vs Taker) y el valor de venta en el mercado libre o MEP.
                                </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                                <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px] block mb-1">
                                    Paso 2: Transacción Segura
                                </span>
                                <p className="text-slate-300 leading-relaxed">
                                    Operá exclusivamente con comerciantes verificados con más de 98% de órdenes completadas para evitar bloqueos preventivos bancarios.
                                </p>
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex gap-2">
                            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold">Advertencia tributaria AFIP / ARCA:</span>
                                <p className="mt-1 text-rose-200/80">
                                    Las billeteras virtuales y exchanges locales informan automáticamente saldos y movimientos por encima de los límites vigentes de la resolución de ARCA.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};
