import React, { useMemo } from 'react';
import { ArrowRight, RefreshCcw, TrendingUp } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';
import { formatInt, formatPct } from '../utils/formatARS';

export const RulosMatrix: React.FC = () => {
    const { arbitrage, rate } = useDashboardData();

    const rulos = useMemo(() => {
        if (!arbitrage || !rate) return [];

        // Dolar prices
        const blueBuy = arbitrage.dolares?.blue?.compra || 0;
        const blueSell = arbitrage.dolares?.blue?.venta || 0;
        const mepSell = arbitrage.dolares?.mep?.venta || 0;

        // Crypto prices (USDT)
        const cryptoBuy = rate.ask || 0;    // Costo de comprar USDT
        const cryptoSell = rate.bid || 0;   // Ganancia al vender USDT

        const routes = [];

        // Rulo 1: Comprar Blue -> Vender Cripto
        // Lógica: Tenés Blue físico, lo vendés a Cripto? No, tenés pesos, comprás Blue físico, vas a la cueva Cripto, vendés.
        // Mejor: Dólar Puré (Pesos -> Oficial -> Blue) (ya no existe oficial barato sin trabas)
        // Rulo MEP-Cripto: Comprar MEP con pesos, retirarlo al banco, depositarlo en exchange, venderlo por pesos (Crypto bid)
        if (mepSell > 0 && cryptoSell > 0) {
            const spread = cryptoSell - mepSell; // ganancia en pesos por cada USD
            routes.push({
                name: 'Rulo MEP ➔ USDT',
                description: 'Comprar MEP en Broker, transferir a Exchange, vender P2P.',
                leg1: `Comprás MEP a $${mepSell.toFixed(2)}`,
                leg2: `Vendés USDT a $${cryptoSell.toFixed(2)}`,
                profit: spread,
                profitPct: (spread / mepSell) * 100,
                recommended: spread > 0
            });
        }

        // Rulo Blue-Cripto
        if (blueSell > 0 && cryptoSell > 0) {
            const spread = cryptoSell - blueSell;
            routes.push({
                name: 'Rulo Blue ➔ USDT',
                description: 'Comprar Blue en Cueva, fondear Exchange Físico, vender P2P.',
                leg1: `Comprás Blue a $${blueSell.toFixed(2)}`,
                leg2: `Vendés USDT a $${cryptoSell.toFixed(2)}`,
                profit: spread,
                profitPct: (spread / blueSell) * 100,
                recommended: spread > 0
            });
        }

        // Rulo Cripto-Blue (Cobrar exterior)
        if (cryptoBuy > 0 && blueBuy > 0) {
            // Tenés USDT saldo exterior -> lo vendés P2P por USD físico? o por ARS físico?
            // Vender USDT por Blue: comprás a precio cryptoBuy (en ARS) -> vas a la cueva -> te dan blueBuy
            const spread = blueBuy - cryptoBuy;
            routes.push({
                name: 'Cobro Inversa (USDT ➔ Blue)',
                description: 'Vender Cripto por Pesos P2P para comprar Blue (Cambio físico ideal).',
                leg1: `Entrás USDT a $${cryptoBuy.toFixed(2)}`,
                leg2: `Recibís Blue a $${blueBuy.toFixed(2)}`,
                profit: spread,
                profitPct: (spread / cryptoBuy) * 100,
                recommended: spread > 0
            });
        }

        // Rulo MEP-Blue (Puré Financiero)
        if (mepSell > 0 && blueBuy > 0) {
            const spread = blueBuy - mepSell;
            routes.push({
                name: 'Puré MEP ➔ Blue',
                description: 'Comprar MEP, retirar billetes por ventanilla, vender en cueva.',
                leg1: `Comprás MEP a $${mepSell.toFixed(2)}`,
                leg2: `Vendés Blue a $${blueBuy.toFixed(2)}`,
                profit: spread,
                profitPct: (spread / mepSell) * 100,
                recommended: spread > 0
            });
        }

        return routes.sort((a, b) => b.profitPct - a.profitPct).slice(0, 3);
    }, [arbitrage, rate]);

    if (rulos.length === 0) return null;

    return (
        <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50 flex flex-col h-full hover:border-slate-600/50 transition-colors">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-yellow-500/20 text-yellow-400 rounded-xl">
                        <RefreshCcw size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-100">Matriz de Rulos</h3>
                        <p className="text-xs text-slate-400">Arbitrajes (Spread P2P vs FIAT)</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {rulos.map((rulo, idx) => (
                    <div key={idx} className="bg-slate-900/40 rounded-xl p-4 border border-slate-700/50">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-bold text-sm text-white mb-0.5">{rulo.name}</h4>
                                <p className="text-[10px] text-slate-400 max-w-[200px] leading-tight">{rulo.description}</p>
                            </div>
                            <div className={`text-right ${rulo.recommended ? 'text-emerald-400' : 'text-red-400'}`}>
                                <div className="text-sm font-bold flex items-center justify-end gap-1">
                                    {rulo.recommended && <TrendingUp size={14} />}
                                    {rulo.profit > 0 ? '+' : ''}{formatPct(rulo.profitPct)}
                                </div>
                                <div className="text-[10px]">Brecha: {formatInt(rulo.profit)}</div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 text-xs bg-slate-800/50 p-2 rounded-lg">
                            <span className="text-slate-300 relative inline-flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                                {rulo.leg1.split(' a ')[0]}
                                <span className="font-mono text-white">${rulo.leg1.split(' a $')[1]}</span>
                            </span>
                            <ArrowRight size={14} className="text-slate-500" />
                            <span className="text-slate-300 relative inline-flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                {rulo.leg2.split(' a ')[0]}
                                <span className="font-mono text-white">${rulo.leg2.split(' a $')[1]}</span>
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <p className="text-[10px] text-slate-500 mt-4 text-center">
                * Los cálculos no incluyen comisiones de brokers o cuevas, que suelen rondar entre 0.5% y 2%. Se recomienda al menos 3% de spread bruto para rentabilidad real.
            </p>
        </div>
    );
};
