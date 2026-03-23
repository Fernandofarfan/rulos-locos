import { useState, useEffect, useCallback } from 'react';
import { Monitor, X, Play, Pause, Clock, LayoutGrid, Maximize2 } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';

// Formato de moneda para el kiosco
const formatKioskPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);
};
const formatCompact = (n: number) => {
    if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    return n.toLocaleString('es-AR');
};

export const KioskMode: React.FC<{ active: boolean; onExit: () => void }> = ({ active, onExit }) => {
    const { arbitrage, economics, rate } = useDashboardData();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [autoPlay, setAutoPlay] = useState(true);
    const [compactView, setCompactView] = useState(false);
    const INTERVAL_SEC = 8; // Rota cada 8 segundos
    const [progress, setProgress] = useState(0);

    const dolares = arbitrage?.dolares;

    // Tarjetas a mostrar en el kiosco
    const cards = [
        {
            id: 'blue',
            title: 'Dólar Blue',
            price: dolares?.blue?.venta ?? 0,
            buyPrice: dolares?.blue?.compra,
            color: 'from-blue-600 to-blue-900',
            textColor: 'text-blue-400'
        },
        {
            id: 'mep',
            title: 'Dólar MEP',
            price: dolares?.mep?.venta ?? 0,
            color: 'from-emerald-600 to-emerald-900',
            textColor: 'text-emerald-400'
        },
        {
            id: 'ccl',
            title: 'Dólar CCL',
            price: dolares?.ccl?.venta ?? 0,
            color: 'from-purple-600 to-purple-900',
            textColor: 'text-purple-400'
        },
        {
            id: 'crypto',
            title: 'Dólar Cripto',
            price: rate?.ask ?? 0,
            color: 'from-amber-500 to-amber-800',
            textColor: 'text-amber-400'
        },
        {
            id: 'risk',
            title: 'Riesgo País',
            price: Number(economics?.macro?.risk ?? 0),
            isPoints: true,
            color: 'from-rose-600 to-rose-900',
            textColor: 'text-rose-400'
        },
        {
            id: 'inflation',
            title: 'Inflación',
            price: economics?.macro?.inflation?.interanual ?? 0,
            isPoints: true,
            suffix: '%',
            color: 'from-orange-600 to-orange-900',
            textColor: 'text-orange-400'
        },
        {
            id: 'reserves',
            title: 'Reservas BCRA',
            price: economics?.macro?.reserves ?? 0,
            isCompact: true,
            color: 'from-teal-600 to-teal-900',
            textColor: 'text-teal-400'
        },
    ].filter(c => c.price > 0);

    const next = useCallback(() => {
        if (cards.length > 0) {
            setCurrentIndex(s => (s + 1) % cards.length);
            setProgress(0);
        }
    }, [cards.length]);

    const prev = useCallback(() => {
        if (cards.length > 0) {
            setCurrentIndex(s => (s - 1 + cards.length) % cards.length);
            setProgress(0);
        }
    }, [cards.length]);

    // Reloj
    const [time, setTime] = useState(new Date());

    // Enter Fullscreen on mount
    useEffect(() => {
        if (active) {
            document.documentElement.requestFullscreen().catch((e) => console.log('Fullscreen no permitido:', e));
        } else {
            if (document.fullscreenElement) {
                document.exitFullscreen().catch((e) => console.log('Fullscreen exit error:', e));
            }
        }
    }, [active]);

    // Timer & Autoplay
    useEffect(() => {
        if (!active) return;

        const clockIv = setInterval(() => setTime(new Date()), 1000);

        if (!autoPlay) return () => clearInterval(clockIv);

        const tickRate = 50; // ms
        const totalTicks = (INTERVAL_SEC * 1000) / tickRate;

        const progIv = setInterval(() => {
            setProgress(p => {
                if (p >= 100) {
                    next();
                    return 0;
                }
                return p + (100 / totalTicks);
            });
        }, tickRate);

        return () => {
            clearInterval(clockIv);
            clearInterval(progIv);
        };
    }, [active, autoPlay, next]);

    // Keyboard handlers
    useEffect(() => {
        if (!active) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
            if (e.key === 'Escape') onExit();
            if (e.key === 'p' || e.key === 'P') setAutoPlay(a => !a);
            if (e.key === 'g' || e.key === 'G') setCompactView(v => !v);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [active, next, prev, onExit]);

    if (!active || cards.length === 0) return null;

    const currentCard = cards[currentIndex];

    return (
        <div className="fixed inset-0 z-[9999] bg-black text-white flex flex-col font-sans overflow-hidden">
            {/* Background Gradient Animation */}
            <div className={`absolute inset-0 bg-gradient-to-br ${currentCard.color} opacity-20 transition-colors duration-1000 ease-in-out`} />

            {/* Header */}
            <header className="relative z-10 flex justify-between items-center p-8 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                        <Monitor size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">Rulos Locos</h1>
                        <p className="text-white/50 text-xl tracking-widest uppercase mt-1">Terminal</p>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3 text-3xl font-light text-white/80 tabular-nums">
                        <Clock size={28} className="text-white/40" />
                        {time.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>

                    <button
                        onClick={() => setCompactView(!compactView)}
                        className="bg-white/5 hover:bg-white/10 p-4 rounded-full transition-colors"
                        title={compactView ? 'Vista individual' : 'Vista compacta'}
                    >
                        {compactView ? <Maximize2 size={24} /> : <LayoutGrid size={24} />}
                    </button>
                    <button
                        onClick={() => setAutoPlay(!autoPlay)}
                        className="bg-white/5 hover:bg-white/10 p-4 rounded-full transition-colors"
                    >
                        {autoPlay ? <Pause size={24} /> : <Play size={24} />}
                    </button>
                    <button
                        onClick={onExit}
                        className="bg-red-500/20 text-red-400 hover:bg-red-500/40 p-4 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            {compactView ? (
                /* Compact multi-card grid view */
                <main className="relative z-10 flex-1 grid grid-cols-2 lg:grid-cols-3 gap-6 p-8">
                    {cards.map(c => (
                        <div key={c.id} className={`flex flex-col items-center justify-center p-6 rounded-3xl bg-gradient-to-br ${c.color} bg-opacity-20 border border-white/10`}>
                            <h3 className={`text-2xl md:text-4xl font-black uppercase tracking-tight mb-4 ${c.textColor}`}>{c.title}</h3>
                            <span className="text-5xl md:text-7xl font-black tabular-nums">
                                {(c as any).isCompact ? `$${formatCompact(c.price)}` : (c as any).suffix ? `${c.price.toFixed(1)}${(c as any).suffix}` : c.isPoints ? c.price.toFixed(0) : formatKioskPrice(c.price).replace(',00', '')}
                            </span>
                            {c.isPoints && !(c as any).suffix && !(c as any).isCompact && <span className="text-2xl text-white/50 mt-2">pts</span>}
                            {c.buyPrice && (
                                <div className="mt-3 text-lg text-white/60">
                                    C: {formatKioskPrice(c.buyPrice).replace(',00', '')} / V: {formatKioskPrice(c.price).replace(',00', '')}
                                </div>
                            )}
                        </div>
                    ))}
                </main>
            ) : (
                /* Single card massive view */
                <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 relative animate-fade-in" key={currentCard.id}>

                    <h2 className={`text-6xl md:text-8xl font-black uppercase tracking-tight mb-8 ${currentCard.textColor} drop-shadow-2xl`}>
                        {currentCard.title}
                    </h2>

                    <div className="flex items-baseline gap-4">
                        <span className="text-[12rem] md:text-[18rem] font-black leading-none tracking-tighter tabular-nums drop-shadow-2xl">
                            {(currentCard as any).isCompact
                                ? `$${formatCompact(currentCard.price)}`
                                : (currentCard as any).suffix
                                    ? `${currentCard.price.toFixed(1)}${(currentCard as any).suffix}`
                                    : currentCard.isPoints
                                        ? currentCard.price.toFixed(0)
                                        : formatKioskPrice(currentCard.price).replace(',00', '')}
                        </span>
                        {currentCard.isPoints && !(currentCard as any).suffix && !(currentCard as any).isCompact && <span className="text-6xl text-white/50 font-bold ml-4 pb-12">pts</span>}
                    </div>

                    {currentCard.buyPrice && (
                        <div className="mt-8 flex items-center gap-6 bg-white/5 backdrop-blur-md px-12 py-6 rounded-3xl border border-white/10">
                            <div className="text-center">
                                <p className="text-xl text-white/50 uppercase tracking-widest mb-1">Compra</p>
                                <p className="text-5xl font-bold">{formatKioskPrice(currentCard.buyPrice).replace(',00', '')}</p>
                            </div>
                            <div className="w-px h-24 bg-white/10 mx-4" />
                            <div className="text-center">
                                <p className="text-xl text-white/50 uppercase tracking-widest mb-1">Venta</p>
                                <p className="text-5xl font-bold">{formatKioskPrice(currentCard.price).replace(',00', '')}</p>
                            </div>
                        </div>
                    )}
                </main>
            )}

            {/* Footer / Progress */}
            <footer className="relative z-10">
                <div className="w-full h-2 bg-white/10">
                    <div
                        className={`h-full bg-white transition-all duration-[50ms] ease-linear`}
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Dots indicator */}
                <div className="flex justify-center gap-4 py-8 bg-black/50">
                    {cards.map((c, idx) => (
                        <div
                            key={c.id}
                            onClick={() => { setCurrentIndex(idx); setProgress(0); }}
                            className={`h-3 rounded-full cursor-pointer transition-all duration-300 ${idx === currentIndex ? 'w-16 bg-white' : 'w-3 bg-white/30 hover:bg-white/50'}`}
                        />
                    ))}
                </div>
            </footer>
        </div>
    );
};

// Trigger button - floating
export const KioskButton: React.FC<{ onActivate: () => void }> = ({ onActivate }) => (
    <button
        onClick={onActivate}
        aria-label="Activar Terminal de Cotizaciones"
        title="Terminal de Cotizaciones"
        className="fixed bottom-6 left-6 z-[100] flex items-center gap-2 bg-blue-600 hover:bg-blue-500 border border-blue-400 text-white font-bold px-4 py-3 rounded-2xl shadow-blue-900/50 shadow-2xl text-sm transition-all hover:scale-105"
    >
        <Monitor size={18} />
        <span className="hidden sm:inline tracking-wider">TERMINAL</span>
    </button>
);
