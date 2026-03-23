import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface FocusModeProps {
    bluePrice: number;
    mepPrice: number;
    usdtPrice: number;
    blueTrend?: number;
    onClose: () => void;
}

/**
 * FocusMode — Vista minimalista con solo 3 métricas esenciales.
 * Pensado para consultar el Blue rápido desde el celular.
 * Shortcut: tecla 'F'.
 */
export const FocusMode: React.FC<FocusModeProps> = ({
    bluePrice,
    mepPrice,
    usdtPrice,
    blueTrend = 0,
    onClose,
}) => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const TrendIcon = blueTrend > 0 ? TrendingUp : blueTrend < 0 ? TrendingDown : Minus;
    const trendColor = blueTrend > 0 ? 'text-emerald-400' : blueTrend < 0 ? 'text-red-400' : 'text-slate-400';

    return (
        <div className="fixed inset-0 z-[9999] bg-[#050709] flex flex-col items-center justify-center select-none">
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/5 text-slate-600 hover:text-white transition"
            >
                <X size={18} />
            </button>

            {/* Clock */}
            <p className="text-slate-600 text-lg font-mono mb-12">
                {time.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </p>

            {/* Main price — Blue */}
            <div className="text-center mb-16">
                <div className="flex items-center justify-center gap-3 mb-2">
                    <TrendIcon size={24} className={trendColor} />
                    <span className="text-slate-500 text-sm font-bold uppercase tracking-widest">Dólar Blue</span>
                </div>
                <p className="text-6xl md:text-8xl font-black text-white tabular-nums tracking-tight">
                    ${Math.round(bluePrice).toLocaleString('es-AR')}
                </p>
                {blueTrend !== 0 && (
                    <p className={`text-lg font-bold mt-2 ${trendColor}`}>
                        {blueTrend > 0 ? '+' : ''}{blueTrend.toFixed(1)}%
                    </p>
                )}
            </div>

            {/* Secondary prices */}
            <div className="flex gap-12 md:gap-20">
                <div className="text-center">
                    <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest mb-1">MEP</p>
                    <p className="text-2xl md:text-3xl font-bold text-purple-400 tabular-nums">
                        ${Math.round(mepPrice).toLocaleString('es-AR')}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest mb-1">USDT</p>
                    <p className="text-2xl md:text-3xl font-bold text-amber-400 tabular-nums">
                        ${Math.round(usdtPrice).toLocaleString('es-AR')}
                    </p>
                </div>
            </div>

            {/* Footer */}
            <p className="absolute bottom-6 text-[9px] text-slate-700 font-mono">
                ESC para cerrar · F para toggle
            </p>
        </div>
    );
};
