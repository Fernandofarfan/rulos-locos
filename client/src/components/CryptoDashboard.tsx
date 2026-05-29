import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Coins } from 'lucide-react';


interface CoinData {
    id: string;
    symbol: string;
    name: string;
    image: string;
    current_price: number; // USD
    price_change_percentage_24h: number;
    market_cap: number;
    total_volume: number;
    price_ars?: number; // derived
}

const EMOJI_MAP: Record<string, string> = {
    bitcoin: '₿', ethereum: 'Ξ', solana: '◎',
    cardano: '₳', ripple: '✕', polkadot: '●', chainlink: '⬡',
    tether: '💲', 'usd-coin': '💲', dai: '💲',
};

const STABLECOINS = new Set(['tether', 'usd-coin', 'dai']);

export const CryptoDashboard: React.FC<{ cclRate?: number }> = ({ cclRate = 1200 }) => {
    const [coins, setCoins] = useState<CoinData[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'grid' | 'table'>('grid');

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await window.fetch(
                'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,cardano,ripple,polkadot,chainlink,tether,usd-coin,dai&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h',
                { signal: AbortSignal.timeout(8000) }
            );
            if (!res.ok) throw new Error('CoinGecko no disponible');
            const data: CoinData[] = await res.json();
            setCoins(data.map(c => ({ ...c, price_ars: parseFloat((c.current_price * cclRate).toFixed(0)) })));
        } catch {
            setCoins([
                { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', image: '', current_price: 62000, price_change_percentage_24h: 1.2, market_cap: 1.2e12, total_volume: 3.2e10, price_ars: 62000 * cclRate },
                { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', image: '', current_price: 3100, price_change_percentage_24h: -0.8, market_cap: 3.7e11, total_volume: 1.5e10, price_ars: 3100 * cclRate },
                { id: 'solana', symbol: 'SOL', name: 'Solana', image: '', current_price: 165, price_change_percentage_24h: 2.5, market_cap: 7.2e10, total_volume: 4.1e9, price_ars: 165 * cclRate },
                { id: 'cardano', symbol: 'ADA', name: 'Cardano', image: '', current_price: 0.42, price_change_percentage_24h: -1.1, market_cap: 1.5e10, total_volume: 3.2e8, price_ars: 0.42 * cclRate },
                { id: 'ripple', symbol: 'XRP', name: 'Ripple', image: '', current_price: 0.52, price_change_percentage_24h: 0.4, market_cap: 2.9e10, total_volume: 1.2e9, price_ars: 0.52 * cclRate },
                { id: 'tether', symbol: 'USDT', name: 'Tether', image: '', current_price: 1.0, price_change_percentage_24h: 0.01, market_cap: 1.1e11, total_volume: 5e10, price_ars: 1.0 * cclRate },
                { id: 'usd-coin', symbol: 'USDC', name: 'USD Coin', image: '', current_price: 1.0, price_change_percentage_24h: 0.0, market_cap: 3.5e10, total_volume: 8e9, price_ars: 1.0 * cclRate },
            ]);
        } finally {
            setLoading(false);
        }
    }, [cclRate]);

    useEffect(() => {
        fetch();
        const iv = setInterval(fetch, 120_000); // 2 min (CoinGecko free limit)
        return () => clearInterval(iv);
    }, [fetch]);

    const formatUSD = (n: number) => n >= 1
        ? `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
        : `$${n.toFixed(4)}`;

    const formatARS = (n: number) =>
        `$${(n).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

    const formatMCap = (n: number) => {
        if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
        if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
        return `$${(n / 1e6).toFixed(0)}M`;
    };

    return (
        <div className="glass-panel no-lift p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Coins size={14} className="text-amber-400" />
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Criptomonedas</h3>
                    <span className="text-[9px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">USD · ARS</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex rounded-lg overflow-hidden border border-white/10">
                        {(['grid', 'table'] as const).map(v => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${view === v ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}
                            >
                                {v === 'grid' ? '⊞' : '≡'}
                            </button>
                        ))}
                    </div>
                    <button onClick={fetch} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="h-40 flex items-center justify-center">
                    <RefreshCw className="animate-spin text-slate-500" size={18} />
                </div>
            ) : view === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {coins.map(coin => {
                        const isPos = coin.price_change_percentage_24h >= 0;
                        const isStable = STABLECOINS.has(coin.id);
                        const spreadVsCCL = cclRate > 0 ? ((coin.price_ars ?? 0) - cclRate) / cclRate * 100 : 0;
                        return (
                            <div
                                key={coin.id}
                                className={`rounded-xl p-3 transition-all group border ${
                                    isStable
                                        ? 'bg-emerald-400/5 border-emerald-400/20 hover:border-emerald-400/40 hover:bg-emerald-400/10'
                                        : 'bg-white/5 border-white/10 hover:border-amber-400/20 hover:bg-amber-400/5'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    {coin.image ? (
                                        <img src={coin.image} alt={coin.symbol} className="w-5 h-5 rounded-full" />
                                    ) : (
                                        <span className="text-base">{EMOJI_MAP[coin.id] ?? '●'}</span>
                                    )}
                                    <div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] font-bold text-white uppercase">{coin.symbol}</span>
                                            {isStable && <span className="text-[7px] bg-emerald-400/20 text-emerald-300 px-1 rounded">STABLE</span>}
                                        </div>
                                        <div className="text-[8px] text-slate-600">{coin.name}</div>
                                    </div>
                                    <span className={`ml-auto text-[10px] font-bold flex items-center gap-0.5 ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {isPos ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                                        {isPos ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%
                                    </span>
                                </div>
                                <div className="text-sm font-bold font-mono text-white">{formatUSD(coin.current_price)}</div>
                                <div className="text-[10px] text-amber-300 font-mono mt-0.5">{formatARS(coin.price_ars ?? 0)} ARS</div>
                                {isStable && (
                                    <div className={`text-[9px] mt-0.5 font-mono ${spreadVsCCL > 2 ? 'text-emerald-400' : spreadVsCCL < -2 ? 'text-rose-400' : 'text-slate-500'}`}>
                                        vs CCL: {spreadVsCCL > 0 ? '+' : ''}{spreadVsCCL.toFixed(1)}%
                                    </div>
                                )}
                                <div className="text-[9px] text-slate-600 mt-1">MCap: {formatMCap(coin.market_cap)}</div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-slate-500 border-b border-white/5">
                            <th className="text-left py-2 pr-2">Activo</th>
                            <th className="text-right py-2 pr-2">USD</th>
                            <th className="text-right py-2 pr-2">ARS (CCL)</th>
                            <th className="text-right py-2 pr-2">Spread</th>
                            <th className="text-right py-2 pr-2">24h</th>
                            <th className="text-right py-2">MCap</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {coins.map(coin => {
                            const isPos = coin.price_change_percentage_24h >= 0;
                            const isStable = STABLECOINS.has(coin.id);
                            const spreadVsCCL = cclRate > 0 ? ((coin.price_ars ?? 0) - cclRate) / cclRate * 100 : 0;
                            return (
                                <tr key={coin.id} className="hover:bg-white/5 transition-colors">
                                    <td className="py-2 pr-2">
                                        <div className="flex items-center gap-1.5">
                                            {coin.image && <img src={coin.image} alt={coin.symbol} className="w-4 h-4 rounded-full" />}
                                            <span className="font-bold text-slate-200 uppercase">{coin.symbol}</span>
                                            {isStable && <span className="text-[7px] bg-emerald-400/20 text-emerald-300 px-1 rounded">STABLE</span>}
                                            <span className="text-slate-600 text-[10px] hidden sm:inline">{coin.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-2 pr-2 text-right font-mono text-slate-200">{formatUSD(coin.current_price)}</td>
                                    <td className="py-2 pr-2 text-right font-mono text-amber-300">{formatARS(coin.price_ars ?? 0)}</td>
                                    <td className={`py-2 pr-2 text-right font-mono ${spreadVsCCL > 2 ? 'text-emerald-400' : spreadVsCCL < -2 ? 'text-rose-400' : 'text-slate-500'}`}>
                                        {spreadVsCCL > 0 ? '+' : ''}{spreadVsCCL.toFixed(1)}%
                                    </td>
                                    <td className={`py-2 pr-2 text-right font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {isPos ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%
                                    </td>
                                    <td className="py-2 text-right text-slate-500">{formatMCap(coin.market_cap)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}

            <p className="text-[9px] text-slate-700 mt-3 text-right">Via CoinGecko API · act. c/2min</p>
        </div>
    );
};
