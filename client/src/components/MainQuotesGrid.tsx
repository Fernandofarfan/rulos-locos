import React from 'react';
import { TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight, Copy, Check, Share2, RefreshCcw } from 'lucide-react';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

interface QuoteCardData {
    id: string;
    title: string;
    badge?: string;
    badgeColor?: string;
    buy?: number;
    sell: number;
    change?: number;
    tag?: string;
}

interface MainQuotesGridProps {
    blue?: { compra?: number; venta?: number };
    mep?: { compra?: number; venta?: number };
    ccl?: { compra?: number; venta?: number };
    crypto?: { bid?: number; ask?: number };
    rateChange?: number;
    loading?: boolean;
}

export const MainQuotesGrid: React.FC<MainQuotesGridProps> = ({
    blue,
    mep,
    ccl,
    crypto,
    rateChange = 0,
    loading = false,
}) => {
    const { copy, copied } = useCopyToClipboard();

    const formatCurrency = (val?: number) => {
        if (!val || val <= 0) return '--';
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            maximumFractionDigits: 1,
        }).format(val);
    };

    const quotes: QuoteCardData[] = [
        {
            id: 'blue',
            title: 'Dólar Blue',
            badge: 'LIBRE',
            badgeColor: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
            buy: blue?.compra,
            sell: blue?.venta ?? 0,
            change: rateChange,
            tag: 'Cueva / Informal',
        },
        {
            id: 'mep',
            title: 'Dólar MEP',
            badge: 'BOLSA',
            badgeColor: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
            buy: mep?.compra,
            sell: mep?.venta ?? 0,
            tag: 'Bonaerense AL30',
        },
        {
            id: 'ccl',
            title: 'Dólar CCL',
            badge: 'EXTERIOR',
            badgeColor: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
            buy: ccl?.compra,
            sell: ccl?.venta ?? 0,
            tag: 'Liquidación en NY',
        },
        {
            id: 'crypto',
            title: 'Dólar Cripto',
            badge: 'P2P 24/7',
            badgeColor: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
            buy: crypto?.bid,
            sell: crypto?.ask ?? 0,
            tag: 'Binance USDT',
        },
    ];

    const shareQuote = (q: QuoteCardData) => {
        const text = `💵 ${q.title}\nVenta: ${formatCurrency(q.sell)}${q.buy ? `\nCompra: ${formatCurrency(q.buy)}` : ''}\n⏰ ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}\n🔗 rulos-locos.vercel.app`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quotes.map((q) => {
                const spread = q.buy && q.sell ? q.sell - q.buy : null;
                const spreadPct = spread && q.buy ? ((spread / q.buy) * 100).toFixed(1) : null;
                const isPositive = (q.change ?? 0) >= 0;

                return (
                    <div
                        key={q.id}
                        className="glass-panel p-4 flex flex-col justify-between hover-lift relative group transition-all"
                    >
                        {/* Header card */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-100">{q.title}</h3>
                                {q.badge && (
                                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${q.badgeColor}`}>
                                        {q.badge}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => shareQuote(q)}
                                    title="Compartir en WhatsApp"
                                    className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-white/5 transition-colors"
                                >
                                    <Share2 size={13} />
                                </button>
                                <button
                                    onClick={() => copy(String(q.sell))}
                                    title={copied ? "Copiado" : "Copiar cotización"}
                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                </button>
                            </div>
                        </div>

                        {/* Cotización Venta (Principal) */}
                        <div className="my-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">
                                Venta
                            </span>
                            <div className="flex items-baseline gap-2">
                                {loading && q.sell === 0 ? (
                                    <span className="text-2xl font-mono text-slate-600 animate-pulse font-bold">···</span>
                                ) : (
                                    <span className="text-3xl font-black font-mono tracking-tight text-white">
                                        {formatCurrency(q.sell)}
                                    </span>
                                )}

                                {q.change !== undefined && q.change !== 0 && (
                                    <span
                                        className={`inline-flex items-center text-[11px] font-bold px-1.5 py-0.5 rounded ${
                                            isPositive
                                                ? 'text-emerald-400 bg-emerald-500/10'
                                                : 'text-rose-400 bg-rose-500/10'
                                        }`}
                                    >
                                        {isPositive ? <TrendingUp size={11} className="mr-0.5" /> : <TrendingDown size={11} className="mr-0.5" />}
                                        {isPositive ? '+' : ''}{q.change}%
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Footer: Compra & Spread */}
                        <div className="pt-3 mt-3 border-t border-border-subtle flex items-center justify-between text-xs text-slate-400">
                            <div className="flex items-center gap-1 font-mono">
                                <span className="text-[10px] text-slate-500 uppercase">Compra</span>
                                <span className="font-semibold text-slate-300">
                                    {formatCurrency(q.buy)}
                                </span>
                            </div>

                            {spreadPct && (
                                <div className="text-[10px] font-mono text-slate-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                    Sprd <span className="text-slate-300 font-bold">{spreadPct}%</span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
