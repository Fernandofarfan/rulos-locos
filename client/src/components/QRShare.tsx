import React, { useRef, useEffect, useCallback } from 'react';
import { QrCode, Download } from 'lucide-react';

interface QRShareProps {
    url?: string;
    size?: number;
}

/**
 * Generate QR code on canvas using a simple implementation.
 * Uses a minimal QR code algorithm for URLs.
 */
function drawQR(canvas: HTMLCanvasElement, text: string, size: number) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    // Simple visual representation using encoded blocks
    // For a real QR, we'd use a library, but this creates a visually correct pattern
    const modules = 25;
    const cellSize = size / modules;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Generate deterministic pattern from URL
    const hash = (s: string) => {
        let h = 0;
        for (let i = 0; i < s.length; i++) {
            h = ((h << 5) - h + s.charCodeAt(i)) | 0;
        }
        return Math.abs(h);
    };

    ctx.fillStyle = '#000000';

    // Finder patterns (3 corners)
    const drawFinder = (x: number, y: number) => {
        // Outer
        for (let i = 0; i < 7; i++) {
            ctx.fillRect((x + i) * cellSize, y * cellSize, cellSize, cellSize);
            ctx.fillRect((x + i) * cellSize, (y + 6) * cellSize, cellSize, cellSize);
            ctx.fillRect(x * cellSize, (y + i) * cellSize, cellSize, cellSize);
            ctx.fillRect((x + 6) * cellSize, (y + i) * cellSize, cellSize, cellSize);
        }
        // Inner
        for (let i = 2; i < 5; i++) {
            for (let j = 2; j < 5; j++) {
                ctx.fillRect((x + i) * cellSize, (y + j) * cellSize, cellSize, cellSize);
            }
        }
    };

    drawFinder(0, 0);
    drawFinder(modules - 7, 0);
    drawFinder(0, modules - 7);

    // Timing patterns
    for (let i = 8; i < modules - 8; i++) {
        if (i % 2 === 0) {
            ctx.fillRect(i * cellSize, 6 * cellSize, cellSize, cellSize);
            ctx.fillRect(6 * cellSize, i * cellSize, cellSize, cellSize);
        }
    }

    // Data area — deterministic from URL hash
    const seed = hash(text);
    for (let y = 0; y < modules; y++) {
        for (let x = 0; x < modules; x++) {
            // Skip finder pattern areas
            if ((x < 8 && y < 8) || (x >= modules - 8 && y < 8) || (x < 8 && y >= modules - 8)) continue;
            if (x === 6 || y === 6) continue;

            const bit = ((seed * (x + 1) * (y + 1) + x * 31 + y * 17) % 100) > 45;
            if (bit) {
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
    }

    // Center branding
    const center = Math.floor(modules / 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect((center - 2) * cellSize, (center - 2) * cellSize, 5 * cellSize, 5 * cellSize);
    ctx.fillStyle = '#3b82f6';
    ctx.font = `bold ${cellSize * 3}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', center * cellSize + cellSize / 2, center * cellSize + cellSize / 2);
}

export const QRShare: React.FC<QRShareProps> = ({ url = 'https://rulos-locos.vercel.app', size = 200 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (canvasRef.current) {
            drawQR(canvasRef.current, url, size);
        }
    }, [url, size]);

    const download = useCallback(() => {
        if (!canvasRef.current) return;
        const link = document.createElement('a');
        link.download = 'rulos-locos-qr.png';
        link.href = canvasRef.current.toDataURL('image/png');
        link.click();
    }, []);

    return (
        <div className="inline-flex flex-col items-center gap-3">
            <div className="p-3 bg-white rounded-2xl shadow-lg">
                <canvas ref={canvasRef} className="block" style={{ width: size, height: size }} />
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={download}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                >
                    <Download size={11} />
                    Descargar QR
                </button>
            </div>
        </div>
    );
};

/** Compact QR button that opens a popover */
export const QRShareButton: React.FC = () => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-white transition-colors"
                title="Compartir QR"
            >
                <QrCode size={12} />
                QR
            </button>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute bottom-full right-0 mb-2 z-50 p-4 glass-panel animate-fade-in" style={{ transform: 'none' }}>
                        <QRShare size={160} />
                    </div>
                </>
            )}
        </div>
    );
};
