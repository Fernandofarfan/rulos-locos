import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Calculator, ArrowRight, DollarSign, Settings, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { formatARS } from '../utils/formatARS';

interface ArbitrageCalculatorProps {
    blueBid: number;
    mepAsk: number;
    cryptoAsk: number;
    loading?: boolean;
}

export const ArbitrageCalculator: React.FC<ArbitrageCalculatorProps> = ({ blueBid, mepAsk, cryptoAsk, loading: _loading = false }) => {
    const [amount, setAmount] = useState<string>('1000000');
    const [strategy, setStrategy] = useState<'mep_blue' | 'crypto_blue'>('mep_blue');

    // Detailed Simulation State
    const [buyAmount, setBuyAmount] = useState<number>(0);
    const [buyFeeAmount, setBuyFeeAmount] = useState<number>(0);
    const [netBuyAmount, setNetBuyAmount] = useState<number>(0);
    const [usdObtained, setUsdObtained] = useState<number>(0);
    const [networkFeeAmount, setNetworkFeeAmount] = useState<number>(0); // In USD/USDT
    const [, setNetUsdToSell] = useState<number>(0);
    const [finalArs, setFinalArs] = useState<number>(0);
    const [profit, setProfit] = useState<number>(0);
    const [profitPercentage, setProfitPercentage] = useState<number>(0);

    // Commission & Advanced Config
    const [configOpen, setConfigOpen] = useState(false);
    const [bankFee, setBankFee] = useState<number>(0.6); // Impuesto DB/CR (0.6% standard in Arg)
    const [exchangeFee, setExchangeFee] = useState<number>(0.5); // Exchange/Broker Fee
    const [networkFee, setNetworkFee] = useState<number>(1); // USDT Fixed Withdrawal
    const [parkingDays, setParkingDays] = useState<number>(1); // Normal parking for MEP

    const presets = [100000, 500000, 1000000, 5000000];

    const resetCalculation = () => {
        setFinalArs(0);
        setProfit(0);
        setProfitPercentage(0);
        setBuyFeeAmount(0);
        setNetBuyAmount(0);
        setUsdObtained(0);
    };

    function formatCurrency(value: number) {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
    }

    function formatUSD(value: number) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
    }

    useEffect(() => {
        if (profit > 100000) {
            toast.success('¡Gran oportunidad detectada!', {
                description: `Ganancia potencial: ${formatCurrency(profit)}`,
                duration: 3000,
            });
        }
    }, [profit]);

    useEffect(() => {
        // Calculate
        const initialAmount = parseFloat(amount);
        if (isNaN(initialAmount) || initialAmount <= 0) {
            resetCalculation();
            return;
        }

        const buyPrice = strategy === 'mep_blue' ? mepAsk : cryptoAsk;
        const sellPrice = blueBid;

        // 1. Initial Fees (Bank Transfer + Broker In)
        const initialBankFee = initialAmount * (bankFee / 100);
        const brokerFee = initialAmount * (exchangeFee / 100);
        const totalEntryFees = initialBankFee + brokerFee;

        const netInvestment = initialAmount - totalEntryFees;

        // 2. Buy Phase
        const obtained = netInvestment / buyPrice;

        // 3. Network/Transfer Fees (Deducted from USD/USDT)
        let withdrawFee = 0;
        if (strategy === 'crypto_blue') {
            withdrawFee = networkFee; // Fixed USDT fee
        } else {
            withdrawFee = 0;
        }

        let netUsd = obtained - withdrawFee;
        if (netUsd < 0) netUsd = 0;

        // 4. Sell Phase
        const finalResult = netUsd * sellPrice;

        // Set States
        setBuyAmount(initialAmount);
        setBuyFeeAmount(totalEntryFees);
        setNetBuyAmount(netInvestment);
        setUsdObtained(obtained);
        setNetworkFeeAmount(withdrawFee);
        setNetUsdToSell(netUsd);
        setFinalArs(finalResult);
        setProfit(finalResult - initialAmount);
        setProfitPercentage(((finalResult - initialAmount) / initialAmount) * 100);
    }, [amount, strategy, blueBid, mepAsk, cryptoAsk, bankFee, exchangeFee, networkFee, parkingDays]);



    return (
        <div className="glass-panel relative overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-white/5 bg-white/5 flex justify-between items-center z-10 relative">
                <div>
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <span className="p-1.5 bg-accent-primary/20 rounded-md text-accent-primary">
                            <Calculator size={18} />
                        </span>
                        Simulador de Arbitraje
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1">Simulación financiera en tiempo real</p>
                </div>
                <button
                    onClick={() => setConfigOpen(!configOpen)}
                    className={`p-2 rounded-lg transition-colors ${configOpen ? 'bg-accent-primary text-white' : 'hover:bg-white/10 text-slate-400'}`}
                >
                    <Settings size={18} />
                </button>
            </div>

            <div className="p-5 space-y-6 relative z-10">
                {/* Configuration Panel (Collapsible) */}
                {configOpen && (
                    <div className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2 fade-in">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                            <Settings size={12} /> Configuración Avanzada
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 uppercase font-bold">Comisión Bancaria (%)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={bankFee}
                                        onChange={e => setBankFee(parseFloat(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-accent-primary/50 outline-none"
                                    />
                                    <span className="absolute right-2 top-1.5 text-xs text-slate-500">%</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 uppercase font-bold">Comisión Exchange (%)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={exchangeFee}
                                        onChange={e => setExchangeFee(parseFloat(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-accent-primary/50 outline-none"
                                    />
                                    <span className="absolute right-2 top-1.5 text-xs text-slate-500">%</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 uppercase font-bold">Fee Red (USDT)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={networkFee}
                                        onChange={e => setNetworkFee(parseFloat(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-accent-primary/50 outline-none"
                                    />
                                    <span className="absolute right-2 top-1.5 text-xs text-slate-500">USD</span>
                                </div>
                            </div>
                            {strategy === 'mep_blue' && (
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500 uppercase font-bold">Parking (Días)</label>
                                    <input
                                        type="number"
                                        value={parkingDays}
                                        onChange={e => setParkingDays(parseFloat(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-accent-primary/50 outline-none"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Amount Input */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex justify-between">
                        Capital Inicial
                        <span className="text-white font-mono opacity-50">{formatCurrency(parseFloat(amount))}</span>
                    </label>
                    <div className="relative group">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-primary group-focus-within:text-white transition-colors" size={20} />
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-xl font-bold text-white placeholder-slate-600 focus:outline-none focus:border-accent-primary/50 focus:bg-white/5 transition-all font-mono shadow-inner"
                            placeholder="Monto a invertir..."
                        />
                    </div>
                    {/* Quick Presets */}
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {presets.map(val => (
                            <button
                                key={val}
                                onClick={() => setAmount(val.toString())}
                                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 text-xs text-slate-400 hover:text-white transition-all whitespace-nowrap"
                            >
                                {new Intl.NumberFormat('es-AR', { notation: "compact", compactDisplay: "short", maximumFractionDigits: 1 }).format(val)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Strategy Selector */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setStrategy('mep_blue')}
                        className={`relative p-3 rounded-xl border transition-all text-left group overflow-hidden ${strategy === 'mep_blue' ? 'bg-gradient-to-br from-accent-primary/20 to-accent-primary/5 border-accent-primary text-white shadow-[0_0_20px_-10px_var(--accent-primary)]' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                    >
                        <div className="relative z-10">
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 block mb-1">Rulo MEP</span>
                            <div className="flex items-end gap-1">
                                <span className="text-xl font-mono font-bold">{formatARS(mepAsk)}</span>
                                <span className="text-[10px] mb-1 opacity-60">/USD</span>
                            </div>
                            {strategy === 'mep_blue' && <div className="mt-2 text-[10px] flex items-center gap-1 text-accent-primary"><Clock size={10} /> Parking {parkingDays}d</div>}
                        </div>
                        {strategy === 'mep_blue' && <div className="absolute right-0 top-0 w-20 h-20 bg-accent-primary/10 blur-xl rounded-full -translate-y-1/2 translate-x-1/2"></div>}
                    </button>

                    <button
                        onClick={() => setStrategy('crypto_blue')}
                        className={`relative p-3 rounded-xl border transition-all text-left group overflow-hidden ${strategy === 'crypto_blue' ? 'bg-gradient-to-br from-accent-secondary/20 to-accent-secondary/5 border-accent-secondary text-white shadow-[0_0_20px_-10px_var(--accent-secondary)]' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                    >
                        <div className="relative z-10">
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 block mb-1">Rulo Crypto</span>
                            <div className="flex items-end gap-1">
                                <span className="text-xl font-mono font-bold">{formatARS(cryptoAsk)}</span>
                                <span className="text-[10px] mb-1 opacity-60">/USDT</span>
                            </div>
                            {strategy === 'crypto_blue' && <div className="mt-2 text-[10px] flex items-center gap-1 text-accent-secondary"><TrendingUp size={10} /> Inmediato</div>}
                        </div>
                        {strategy === 'crypto_blue' && <div className="absolute right-0 top-0 w-20 h-20 bg-accent-secondary/10 blur-xl rounded-full -translate-y-1/2 translate-x-1/2"></div>}
                    </button>
                </div>

                {/* Simulation Breakdown Timeline */}
                <div className="relative">
                    {/* Vertical Line */}
                    <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>

                    <div className="space-y-4 py-2">
                        {/* 1. Start */}
                        <div className="relative pl-10">
                            <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center z-10">
                                <span className="text-[8px] font-bold text-white">1</span>
                            </div>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-slate-400 font-medium">Capital Inicial</p>
                                    <p className="text-sm font-mono text-white">{formatCurrency(buyAmount)}</p>
                                </div>
                            </div>
                        </div>

                        {/* 2. Fees & Purchase */}
                        <div className="relative pl-10">
                            <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center z-10">
                                <span className="text-[8px] font-bold text-white">2</span>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-500">Comisiones (Bco+Exch)</span>
                                    <span className="text-rose-400 font-mono">-{formatCurrency(buyFeeAmount)}</span>
                                </div>
                                <div className="flex justify-between text-xs mb-2">
                                    <span className="text-slate-500">Neto para compra</span>
                                    <span className="text-slate-300 font-mono">{formatCurrency(netBuyAmount)}</span>
                                </div>
                                <div className="flex items-center gap-2 py-2 border-t border-white/5 border-dashed">
                                    <ArrowRight size={14} className="text-slate-500" />
                                    <div className="flex-1">
                                        <p className="text-[10px] text-slate-500 uppercase">Obtenés</p>
                                        <p className="text-sm text-accent-secondary font-mono font-bold">
                                            {formatUSD(usdObtained)} {strategy === 'crypto_blue' ? 'USDT' : 'USD'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-500 uppercase">Cotización</p>
                                        <p className="text-xs text-slate-300 font-mono">{formatARS(strategy === 'mep_blue' ? mepAsk : cryptoAsk)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Sale */}
                        <div className="relative pl-10">
                            <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center z-10">
                                <span className="text-[8px] font-bold text-white">3</span>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                                {networkFeeAmount > 0 && (
                                    <div className="flex justify-between text-xs mb-2 border-b border-white/5 pb-2 border-dashed">
                                        <span className="text-slate-500">Fee Retiro</span>
                                        <span className="text-rose-400 font-mono">-{networkFeeAmount} USDT</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <ArrowRight size={14} className="text-slate-500" />
                                    <div className="flex-1">
                                        <p className="text-[10px] text-slate-500 uppercase">Venta Blue</p>
                                        <p className="text-sm text-white font-mono font-bold">
                                            {formatCurrency(finalArs)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-500 uppercase">Cotización</p>
                                        <p className="text-xs text-slate-300 font-mono">${blueBid}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Result */}
                        <div className="relative pl-10">
                            <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-accent-primary border-4 border-slate-900 flex items-center justify-center z-10 shadow-[0_0_10px_var(--accent-primary)]">
                                <DollarSign size={12} className="text-white" />
                            </div>
                            <div className={`rounded-xl p-4 border transition-all ${profit > 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Resultado Neto</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${profit > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                        {profitPercentage.toFixed(2)}%
                                    </span>
                                </div>
                                <div className="text-3xl font-mono font-bold text-white tracking-tight">
                                    {profit > 0 ? '+' : ''}{formatCurrency(profit)}
                                </div>
                                {strategy === 'mep_blue' && (
                                    <div className="mt-3 flex gap-2 items-start p-2 bg-black/20 rounded-lg">
                                        <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                                        <p className="text-[10px] text-slate-400 leading-tight">
                                            <span className="text-amber-400 font-bold block mb-0.5">Riesgo de Parking</span>
                                            Al operar MEP, debés esperar {parkingDays} día(s) hábil(es). La cotización puede variar y afectar este resultado final.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Calculator size={120} />
            </div>
        </div>
    );
};
