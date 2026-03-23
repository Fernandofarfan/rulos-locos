import React, { useState } from 'react';
import { CreditCard, DollarSign, ShieldCheck, AlertCircle } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';

export const DolarTarjetaCalculator: React.FC = () => {
    const { arbitrage } = useDashboardData();
    const [usdAmount, setUsdAmount] = useState<number>(100);

    // Fallbacks if data is not available yet
    const dolares = arbitrage?.dolares;
    const tarjeta = dolares?.tarjeta ?? { venta: 1650 };
    const mep = dolares?.mep ?? { venta: 1150 };

    const priceTarjeta = tarjeta.venta ?? 1650;
    const priceMep = mep.venta ?? 1150;

    const costARSviaTarjeta = usdAmount * priceTarjeta;
    const costARSviaMEP = usdAmount * priceMep;
    const differenceARS = Math.abs(costARSviaTarjeta - costARSviaMEP);
    const mepIsCheaper = costARSviaMEP < costARSviaTarjeta;
    const differencePct = (differenceARS / (mepIsCheaper ? costARSviaTarjeta : costARSviaMEP)) * 100;

    return (
        <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold font-display text-white mb-1 flex items-center gap-2">
                        💳 Dólar Tarjeta vs MEP
                    </h2>
                    <p className="text-slate-400 text-sm">¿Cómo conviene pagar los consumos en dólares?</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <CreditCard size={20} />
                </div>
            </div>

            <div className="space-y-6">
                {/* Input section */}
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                        Monto a pagar en dólares (USD)
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <span className="text-slate-400 font-mono text-lg font-medium">$</span>
                        </div>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={usdAmount}
                            onChange={(e) => setUsdAmount(Math.max(1, Number(e.target.value)))}
                            className="w-full bg-slate-800 border-2 border-slate-700 text-white rounded-xl pl-8 pb-1 pt-1.5 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors font-mono text-xl"
                        />
                    </div>
                </div>

                {/* Comparison grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tarjeta Option */}
                    <div className={`p-4 rounded-xl border-2 transition-colors relative overflow-hidden ${!mepIsCheaper ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-800 border-slate-700'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2 text-slate-300">
                                <CreditCard size={16} />
                                <span className="font-medium">Pagar en Pesos</span>
                            </div>
                            <span className="text-xs font-mono text-slate-500">TC: ${priceTarjeta.toFixed(2)}</span>
                        </div>

                        <div className="mt-4">
                            <p className="text-xs text-slate-400 mb-1">Costo total (con impuestos)</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-sm font-bold text-slate-500">ARS</span>
                                <span className="text-2xl font-bold font-mono text-white">
                                    ${costARSviaTarjeta.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* MEP Option */}
                    <div className={`p-4 rounded-xl border-2 transition-colors relative overflow-hidden ${mepIsCheaper ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-800 border-slate-700'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2 text-slate-300">
                                <DollarSign size={16} />
                                <span className="font-medium">Comprar MEP y pagar</span>
                            </div>
                            <span className="text-xs font-mono text-slate-500">TC: ${priceMep.toFixed(2)}</span>
                        </div>

                        <div className="mt-4">
                            <p className="text-xs text-slate-400 mb-1">Costo total necesario</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-sm font-bold text-slate-500">ARS</span>
                                <span className="text-2xl font-bold font-mono text-white">
                                    ${costARSviaMEP.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Veredicto */}
                <div className={`mt-4 p-4 rounded-xl flex items-start gap-4 ${mepIsCheaper ? 'bg-blue-500/20 text-blue-200' : 'bg-rose-500/20 text-rose-200'}`}>
                    <div className="mt-1">
                        {mepIsCheaper ? <ShieldCheck size={24} className="text-blue-400" /> : <AlertCircle size={24} className="text-rose-400" />}
                    </div>
                    <div>
                        <h4 className="font-bold text-white mb-1">
                            Conviene pagar con {mepIsCheaper ? 'Dólares (comprando MEP)' : 'Pesos (Dólar Tarjeta)'}
                        </h4>
                        <p className="text-sm opacity-90">
                            Ahorrás <span className="font-mono font-bold">${differenceARS.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS</span> ({differencePct.toFixed(1)}%) comprando los dólares en la bolsa en vez de dejar que la tarjeta haga la conversión a pesos.
                        </p>
                        {mepIsCheaper && (
                            <p className="text-xs mt-2 opacity-75">
                                * Recordá hacer "Stop Debit" e indicar en el home banking que pagarás el saldo en USD con dólares de tu caja de ahorro para que no aplique impuestos.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
