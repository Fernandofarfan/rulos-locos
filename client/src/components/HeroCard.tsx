import React from 'react';
import { TrendingUp, TrendingDown, RefreshCcw, Copy, Check, Share2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

interface HeroCardProps {
    price: number;
    bid?: number;
    source: string;
    loading?: boolean;
    trend?: number;
    updatedAt?: string; // ISO timestamp of when data was last fetched
}

export const HeroCard: React.FC<HeroCardProps> = ({ price, bid, source, loading, trend = 0, updatedAt }) => {
    const { copy, copied } = useCopyToClipboard();
    const isPositive = trend >= 0;
    const TrendIcon = isPositive ? TrendingUp : TrendingDown;
    const trendColorClass = isPositive
        ? 'text-success bg-success/10 border-success/20'
        : 'text-rose-400 bg-rose-400/10 border-rose-400/20';
    const formattedPrice = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
    }).format(price);
    const formattedBid = bid
        ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(bid)
        : null;
    const spread = bid && price ? price - bid : null;
    const spreadPct = spread && bid ? ((spread / bid) * 100).toFixed(2) : null;

    const shareOnWhatsApp = () => {
        const sign = isPositive ? '+' : '';
        const msg = [
            `💵 Dólar ${source}`,
            `Venta: ${formattedPrice}`,
            trend !== 0 ? `Variación: ${sign}${trend}%` : '',
            `⏰ ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`,
            '🔗 rulos-locos.vercel.app',
        ].filter(Boolean).join('\n');
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="glass-panel p-8 h-full flex flex-col justify-center relative overflow-hidden group min-h-[280px]">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/10 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent-primary/20 rounded-full blur-[80px] group-hover:bg-accent-primary/30 transition-all duration-500"></div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-xs font-bold uppercase tracking-wider shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse shadow-[0_0_10px_currentColor]"></span>
                            {source}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={shareOnWhatsApp}
                            aria-label="Compartir cotización en WhatsApp"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 text-slate-400 hover:text-emerald-400 transition-all text-[10px] font-medium"
                        >
                            <Share2 size={12} />
                            <span>Compartir</span>
                        </button>
                        <button
                            onClick={() => copy(String(price))}
                            aria-label={copied ? 'Cotización copiada' : 'Copiar cotización al portapapeles'}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all text-[10px] font-medium"
                        >
                            {copied
                                ? <><Check size={12} className="text-emerald-400" /><span className="text-emerald-400">Copiado</span></>
                                : <><Copy size={12} /><span>Copiar</span></>
                            }
                        </button>
                        {loading && <RefreshCcw size={16} className="text-slate-500 animate-spin" />}
                    </div>
                </div>

                <div className="flex flex-col">
                    <span className="text-slate-400 text-sm font-medium uppercase tracking-widest mb-1">Cotización Venta</span>
                    <div className="flex items-baseline gap-1">
                        {loading && price === 0 ? (
                            <span
                                role="status"
                                aria-label="Cargando cotización"
                                className="text-4xl font-mono font-bold text-slate-600 tracking-widest animate-pulse"
                            >
                                ···
                            </span>
                        ) : (
                            <h2
                                role="status"
                                aria-live="polite"
                                aria-label={`Cotización venta: ${formattedPrice}`}
                                aria-atomic="true"
                                className="text-7xl lg:text-8xl font-black tracking-tighter text-white drop-shadow-2xl font-mono leading-none"
                            >
                                {formattedPrice.split(',')[0]}
                                <span className="text-4xl lg:text-5xl opacity-60 font-sans tracking-normal font-bold text-accent-primary">,{formattedPrice.split(',')[1] || '00'}</span>
                            </h2>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 font-bold text-sm px-3 py-1.5 rounded-lg border ${trendColorClass}`}>
                            <TrendIcon size={16} />
                            {isPositive ? '+' : ''}{trend}%
                        </div>
                        <span className="text-slate-500 text-xs font-medium">Variación vs anterior</span>
                    </div>

                    {/* Bid / Ask / Spread */}
                    {formattedBid && (
                        <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono">
                            <div className="flex items-center gap-1 text-emerald-400">
                                <ArrowDownLeft size={11} />
                                <span className="text-slate-500 font-sans">Compra</span>
                                <span className="font-semibold">{formattedBid}</span>
                            </div>
                            <div className="w-px h-4 bg-white/10" />
                            <div className="flex items-center gap-1 text-rose-400">
                                <ArrowUpRight size={11} />
                                <span className="text-slate-500 font-sans">Venta</span>
                                <span className="font-semibold">{formattedPrice}</span>
                            </div>
                            {spreadPct && (
                                <>
                                    <div className="w-px h-4 bg-white/10" />
                                    <div className="flex items-center gap-1 text-amber-400">
                                        <span className="text-slate-500 font-sans">Spread</span>
                                        <span className="font-semibold">{spreadPct}%</span>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <div className="text-[10px] text-slate-600 font-mono flex flex-col items-end">
                        <span>Sincronizado via Binance P2P</span>
                        {updatedAt && (
                            <span className="text-slate-700">
                                ºlt;» {new Date(updatedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Progress Bar */}
            <div className="absolute bottom-0 left-0 h-1 w-full bg-white/5 overflow-hidden">
                <div className="h-full bg-accent-primary shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[loading_60s_linear_infinite]"></div>
            </div>
        </div>
    );
};

// CSS for the progress bar animation should be added to index.css if not there
