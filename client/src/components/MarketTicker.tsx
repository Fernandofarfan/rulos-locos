import React, { useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TickerItem {
    label: string;
    value: string;
    change?: number;
    prefix?: string;
    suffix?: string;
}

interface MarketTickerProps {
    rate?: any;
    dolares?: any;
    global?: any[];
    merval?: any[];
}

const TickerCell: React.FC<{ item: TickerItem }> = ({ item }) => {
    const isPos = item.change !== undefined && item.change > 0;
    const isNeg = item.change !== undefined && item.change < 0;
    const color = isPos ? 'text-emerald-400' : isNeg ? 'text-rose-400' : 'text-slate-300';

    return (
        <span className="inline-flex items-center gap-1.5 px-4 border-r border-white/5 shrink-0">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
            <span className={`font-mono font-bold text-xs ${color}`}>
                {item.prefix}{item.value}{item.suffix}
            </span>
            {item.change !== undefined && (
                <span className={`text-[9px] font-bold ${color} flex items-center gap-0.5`}>
                    {isPos ? <TrendingUp size={9} /> : isNeg ? <TrendingDown size={9} /> : <Minus size={9} />}
                    {Math.abs(item.change).toFixed(2)}%
                </span>
            )}
        </span>
    );
};

export const MarketTicker: React.FC<MarketTickerProps> = ({ rate, dolares, global = [], merval = [] }) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [paused, setPaused] = useState(false);

    // Build ticker items from available data
    const items: TickerItem[] = [
        rate?.ask && { label: 'USDT/ARS', value: rate.ask.toFixed(0), prefix: '$' },
        dolares?.blue?.venta && { label: 'BLUE', value: dolares.blue.venta.toFixed(0), prefix: '$' },
        dolares?.mep?.venta && { label: 'MEP', value: dolares.mep.venta.toFixed(0), prefix: '$' },
        dolares?.ccl?.venta && { label: 'CCL', value: dolares.ccl.venta.toFixed(0), prefix: '$' },
        dolares?.oficial?.venta && { label: 'OFICIAL', value: dolares.oficial.venta.toFixed(0), prefix: '$' },
        ...global.slice(0, 6).map((item: any) => ({
            label: item.symbol?.replace('-USD', '').replace('^', '').replace('=F', '') || item.name,
            value: item.price >= 1000
                ? item.price.toLocaleString('en-US', { maximumFractionDigits: 0 })
                : item.price.toFixed(2),
            change: item.change,
            prefix: item.symbol?.includes('=F') || !item.symbol?.includes('^') ? '$' : '',
        })),
        ...merval.slice(0, 4).map((s: any) => ({
            label: s.ticker,
            value: s.price?.toFixed(0) ?? '-',
            change: s.change,
            prefix: '$',
        })),
    ].filter(Boolean) as TickerItem[];

    // Duplicate for seamless loop
    const allItems = [...items, ...items];

    return (
        <div
            className="w-full bg-black/40 border-b border-white/[0.07] backdrop-blur-md overflow-hidden relative"
            style={{ height: '32px', boxShadow: '0 6px 20px rgba(0,0,0,0.35)' }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            {/* Left fade */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/60 to-transparent z-10 pointer-events-none" />
            {/* Right fade */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/60 to-transparent z-10 pointer-events-none" />

            {/* Paused indicator */}
            {paused && (
                <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                    <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 bg-black/70 border border-white/10 px-2 py-0.5 rounded-full backdrop-blur-sm">
                        ⏸ Pausado
                    </span>
                </div>
            )}

            <div
                ref={trackRef}
                className="flex items-center h-full"
                style={{
                    animation: paused ? 'none' : 'ticker-scroll 60s linear infinite',
                    whiteSpace: 'nowrap',
                }}
            >
                {allItems.map((item, i) => (
                    <TickerCell key={i} item={item} />
                ))}
            </div>

            <style>{`
                @keyframes ticker-scroll {
                    0%   { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
        </div>
    );
};
