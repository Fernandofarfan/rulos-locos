import { useEffect, useRef } from 'react';

/**
 * useTabTitle — Muestra el precio del Blue (u otro valor) en el tab title del browser.
 * También cambia el favicon dinámicamente según la tendencia.
 */
export function useTabTitle(price: number, trend: number, label = 'Blue') {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        if (!price || price <= 0) return;

        // Update title
        const formatted = `$${Math.round(price).toLocaleString('es-AR')}`;
        const arrow = trend > 0 ? '▲' : trend < 0 ? '▼' : '●';
        document.title = `${formatted} ${arrow} ${label} | Rulos Locos`;

        // Dynamic favicon
        try {
            if (!canvasRef.current) {
                canvasRef.current = document.createElement('canvas');
                canvasRef.current.width = 32;
                canvasRef.current.height = 32;
            }
            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) return;

            // Background
            const color = trend > 0 ? '#10b981' : trend < 0 ? '#ef4444' : '#3b82f6';
            ctx.fillStyle = '#0b0e14';
            ctx.beginPath();
            ctx.arc(16, 16, 16, 0, Math.PI * 2);
            ctx.fill();

            // Border
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(16, 16, 14, 0, Math.PI * 2);
            ctx.stroke();

            // Text
            ctx.fillStyle = color;
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const shortPrice = price >= 1000 ? `${(price / 1000).toFixed(1)}k` : Math.round(price).toString();
            ctx.fillText(shortPrice, 16, 17);

            // Apply favicon
            const url = canvasRef.current.toDataURL('image/png');
            let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            link.href = url;
        } catch { /* ignore favicon errors */ }
    }, [price, trend, label]);
}
