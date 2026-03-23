import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
    /** Texto del tooltip */
    content: string;
    /** Elemento disparador */
    children: React.ReactNode;
    /** Posición relativa al trigger (default: top) */
    placement?: 'top' | 'bottom' | 'left' | 'right';
    /** Delay antes de aparecer en ms (default: 120) */
    delay?: number;
}

/**
 * Tooltip accesible con portal para evitar clipping por overflow.
 * Reemplaza los atributos title="..." nativos del navegador.
 *
 * Uso:
 *   <Tooltip content="Actualizar tasas">
 *     <button>...</button>
 *   </Tooltip>
 */
export const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    placement = 'top',
    delay = 120,
}) => {
    const [visible, setVisible] = useState(false);
    const [coords, setCoords] = useState<{ x: number; y: number; placement: typeof placement }>({ x: 0, y: 0, placement });
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wrapRef = useRef<HTMLSpanElement>(null);

    const show = () => {
        timerRef.current = setTimeout(() => {
            const el = wrapRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            const GAP = 8;
            // Estimación del ancho del tooltip para clamping horizontal
            const TOOLTIP_W = 220;
            const TOOLTIP_H = 36;
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            let x = 0;
            let y = 0;
            let resolvedPlacement = placement;

            if (placement === 'top') {
                x = r.left + r.width / 2;
                y = r.top - GAP;
                // Si no cabe arriba → flip a bottom
                if (y - TOOLTIP_H < 4) { y = r.bottom + GAP; resolvedPlacement = 'bottom'; }
            } else if (placement === 'bottom') {
                x = r.left + r.width / 2;
                y = r.bottom + GAP;
                // Si no cabe abajo → flip a top
                if (y + TOOLTIP_H > vh - 4) { y = r.top - GAP; resolvedPlacement = 'top'; }
            } else if (placement === 'left') {
                x = r.left - GAP;
                y = r.top + r.height / 2;
                if (x - TOOLTIP_W < 4) { x = r.right + GAP; resolvedPlacement = 'right'; }
            } else {
                x = r.right + GAP;
                y = r.top + r.height / 2;
                if (x + TOOLTIP_W > vw - 4) { x = r.left - GAP; resolvedPlacement = 'left'; }
            }

            // Clamp horizontal para placements top/bottom
            if (resolvedPlacement === 'top' || resolvedPlacement === 'bottom') {
                const half = TOOLTIP_W / 2;
                x = Math.max(half + 8, Math.min(vw - half - 8, x));
            }

            setCoords({ x, y, placement: resolvedPlacement });
            setVisible(true);
        }, delay);
    };

    const hide = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setVisible(false);
    };

    const resolvedPlacement = coords.placement;

    const transformMap: Record<string, string> = {
        top:    'translateX(-50%) translateY(-100%)',
        bottom: 'translateX(-50%)',
        left:   'translateX(-100%) translateY(-50%)',
        right:  'translateY(-50%)',
    };

    const arrowClass: Record<string, string> = {
        top:    'left-1/2 -translate-x-1/2 -bottom-1.5 border-l-transparent border-r-transparent border-b-transparent border-t-slate-700',
        bottom: 'left-1/2 -translate-x-1/2 -top-1.5 border-l-transparent border-r-transparent border-t-transparent border-b-slate-700',
        left:   'top-1/2 -translate-y-1/2 -right-1.5 border-t-transparent border-b-transparent border-r-transparent border-l-slate-700',
        right:  'top-1/2 -translate-y-1/2 -left-1.5 border-t-transparent border-b-transparent border-l-transparent border-r-slate-700',
    };

    return (
        <>
            {/* Wrapper con display:contents para no alterar el layout del hijo */}
            <span
                ref={wrapRef}
                style={{ display: 'contents' }}
                onMouseEnter={show}
                onMouseLeave={hide}
                onFocus={show}
                onBlur={hide}
            >
                {children}
            </span>
            {visible && createPortal(
                <div
                    role="tooltip"
                    style={{
                        position: 'fixed',
                        left: coords.x,
                        top: coords.y,
                        transform: transformMap[resolvedPlacement],
                        zIndex: 9999,
                        pointerEvents: 'none',
                    }}
                    className="animate-in fade-in zoom-in-95 duration-100"
                >
                    <div className="relative px-2.5 py-1.5 text-[11px] font-medium text-white bg-slate-800 border border-slate-700 rounded-lg shadow-xl whitespace-nowrap max-w-[220px] text-center">
                        {content}
                        {/* Flecha */}
                        <span
                            className={`absolute w-0 h-0 border-4 ${arrowClass[resolvedPlacement]}`}
                        />
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};




