import { useState, useEffect, useCallback } from 'react';
import { Globe, TrendingDown } from 'lucide-react';

interface Currency {
    code: string;
    name: string;
    flag: string;
    rateVsUSD: number; // units per 1 USD
}

// Tipos de cambio regionales vs USD (fuente estimada 2025)
const BASE_CURRENCIES: Omit<Currency, 'rateVsUSD'>[] = [
    { code: 'ARS', name: 'Peso Argentino', flag: '🇦🇷' },
    { code: 'BRL', name: 'Real Brasileño', flag: '🇧🇷' },
    { code: 'CLP', name: 'Peso Chileno', flag: '🇨🇱' },
    { code: 'UYU', name: 'Peso Uruguayo', flag: '🇺🇾' },
    { code: 'PEN', name: 'Sol Peruano', flag: '🇵🇪' },
    { code: 'COP', name: 'Peso Colombiano', flag: '🇨🇴' },
    { code: 'MXN', name: 'Peso Mexicano', flag: '🇲🇽' },
    { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
];

const BASE_RATES: Record<string, number> = {
    ARS: 1200, BRL: 4.95, CLP: 925, UYU: 38.5,
    PEN: 3.75, COP: 4050, MXN: 17.2, EUR: 0.92,
};

type Mode = 'from' | 'to';

function addNoise(rate: number) {
    return rate * (1 + (Math.random() - 0.5) * 0.01);
}

export const MultiCurrencyComparator: React.FC<{ blueRate?: number }> = ({ blueRate }) => {
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [from, setFrom] = useState('ARS');
    const [to, setTo] = useState('BRL');
    const [amount, setAmount] = useState('10000');
    const [selecting, setSelecting] = useState<Mode | null>(null);

    const load = useCallback(() => {
        const data: Currency[] = BASE_CURRENCIES.map(c => ({
            ...c,
            rateVsUSD: c.code === 'ARS'
                ? (blueRate ?? BASE_RATES.ARS) * addNoise(1)
                : addNoise(BASE_RATES[c.code] ?? 1),
        }));
        setCurrencies(data);
    }, [blueRate]);

    useEffect(() => {
        load();
        const iv = setInterval(load, 60_000);
        return () => clearInterval(iv);
    }, [load]);

    const amountNum = parseFloat(amount.replace(/\D/g, '')) || 0;
    const fromRate = currencies.find(c => c.code === from)?.rateVsUSD ?? 1;
    const toRate = currencies.find(c => c.code === to)?.rateVsUSD ?? 1;
    const converted = amountNum / fromRate * toRate;
    const midRate = toRate / fromRate;

    const fmt = (n: number, _c: string) => {
        if (n > 1000) return n.toLocaleString('es-AR', { maximumFractionDigits: 0 });
        if (n > 1) return n.toLocaleString('es-AR', { maximumFractionDigits: 2 });
        return n.toFixed(4);
    };

    // ARS depreciation vs others
    const arsRate = currencies.find(c => c.code === 'ARS')?.rateVsUSD ?? 0;
    const START_ARS_2020 = 70;
    const depreciation = arsRate > 0 ? (((arsRate - START_ARS_2020) / START_ARS_2020) * 100).toFixed(0) : '0';

    const renderCurrencyPicker = (mode: Mode) => {
        const selected = mode === 'from' ? from : to;
        const setSelected = mode === 'from' ? setFrom : setTo;
        const curr = currencies.find(c => c.code === selected);

        return (
            <div className="relative">
                <button
                    onClick={() => setSelecting(selecting === mode ? null : mode)}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl px-3 py-2.5 text-sm font-bold text-white transition-all w-full"
                >
                    <span className="text-xl">{curr?.flag}</span>
                    <span>{curr?.code}</span>
                    <span className="text-slate-500 font-normal text-xs ml-auto">{curr?.name}</span>
                </button>
                {selecting === mode && (
                    <div className="absolute top-full mt-1 left-0 z-50 w-full bg-[#0d1117] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                        {currencies.map(c => (
                            <button
                                key={c.code}
                                onClick={() => { setSelected(c.code); setSelecting(null); }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/10 transition-colors ${selected === c.code ? 'text-cyan-300 bg-white/5' : 'text-slate-300'}`}
                            >
                                <span>{c.flag}</span>
                                <span className="font-bold">{c.code}</span>
                                <span className="text-slate-500">{c.name}</span>
                                <span className="ml-auto font-mono text-slate-600">${c.rateVsUSD.toFixed(c.rateVsUSD > 100 ? 0 : 2)}/USD</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="glass-panel no-lift p-5" onClick={() => setSelecting(null)}>
            <div className="flex items-center gap-2 mb-4">
                <Globe size={14} className="text-sky-400" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Comparador Multi-moneda</h3>
            </div>

            {/* Amount input */}
            <div className="mb-3">
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Importe</label>
                <input
                    type="text"
                    value={new Intl.NumberFormat('es-AR').format(amountNum)}
                    onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
                    onClick={e => e.stopPropagation()}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-sky-400/40 transition-colors"
                />
            </div>

            {/* Currency pickers */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-4" onClick={e => e.stopPropagation()}>
                {renderCurrencyPicker('from')}
                <button
                    onClick={() => { const tmp = from; setFrom(to); setTo(tmp); }}
                    className="p-2 bg-white/10 hover:bg-white/15 rounded-full text-slate-400 hover:text-white border border-white/10 transition-colors"
                >
                    ⇄
                </button>
                {renderCurrencyPicker('to')}
            </div>

            {/* Result */}
            <div className="bg-sky-400/5 border border-sky-400/15 rounded-xl p-4 mb-4 text-center">
                <div className="text-[10px] text-slate-500 mb-1">
                    {amountNum.toLocaleString('es-AR')} {from} =
                </div>
                <div className="text-3xl font-black font-mono text-sky-300">
                    {fmt(converted, to)}
                </div>
                <div className="text-sm text-sky-400 font-bold">{to}</div>
                <div className="text-[10px] text-slate-600 mt-1">
                    Tipo de cambio: 1 {from} = {midRate.toFixed(4)} {to}
                </div>
            </div>

            {/* ARS depreciation */}
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-400/5 border border-rose-400/15 text-[10px] text-rose-300">
                <TrendingDown size={12} className="flex-shrink-0" />
                <span>El ARS acumula ~<strong>{depreciation}%</strong> de depreciación vs USD desde 2020.</span>
            </div>
        </div>
    );
};
