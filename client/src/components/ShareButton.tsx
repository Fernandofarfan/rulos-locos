import React, { useCallback, useState } from 'react';
import { Share2, Check, Loader2 } from 'lucide-react';

interface ShareButtonProps {
    /** CSS selector or ref target element to capture */
    targetSelector: string;
    title?: string;
    className?: string;
}

async function captureElement(selector: string): Promise<HTMLCanvasElement | null> {
    try {
        // Dynamically import html2canvas to avoid bundle cost when not used
        const { default: html2canvas } = await import('html2canvas');
        const el = document.querySelector<HTMLElement>(selector);
        if (!el) return null;
        const canvas = await html2canvas(el, {
            backgroundColor: '#0a0f1a',
            scale: 2,
            useCORS: true,
            allowTaint: false,
            logging: false,
        });
        return canvas;
    } catch {
        return null;
    }
}

export const ShareButton: React.FC<ShareButtonProps> = ({ targetSelector, title = 'Rulos Locos', className = '' }) => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');

    const handleShare = useCallback(async () => {
        setStatus('loading');
        const canvas = await captureElement(targetSelector);
        if (!canvas) { setStatus('idle'); return; }

        canvas.toBlob(async (blob) => {
            if (!blob) { setStatus('idle'); return; }

            // Try native Web Share API first
            if (navigator.share && navigator.canShare?.({ files: [new File([blob], 'rulos-locos.png', { type: 'image/png' })] })) {
                try {
                    await navigator.share({
                        title,
                        text: '📊 Cotizaciones en tiempo real — Rulos Locos',
                        files: [new File([blob], 'rulos-locos.png', { type: 'image/png' })],
                    });
                    setStatus('done');
                    setTimeout(() => setStatus('idle'), 2000);
                    return;
                } catch { /* fall through to download */ }
            }

            // Fallback: download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rulos-locos-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
            setStatus('done');
            setTimeout(() => setStatus('idle'), 2000);
        }, 'image/png');
    }, [targetSelector, title]);

    const shareToTwitter = useCallback(() => {
        const text = encodeURIComponent(`📊 ${title} — Cotizaciones en tiempo real en Rulos Locos\n\n🔗 https://rulos-locos.vercel.app`);
        window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'width=550,height=420');
    }, [title]);

    const Icon = status === 'loading' ? Loader2
        : status === 'done' ? Check
            : Share2;

    return (
        <div className="inline-flex gap-1">
            <button
                onClick={handleShare}
                disabled={status === 'loading'}
                title="Compartir / Descargar imagen"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all
                ${status === 'done'
                        ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'}
                ${status === 'loading' ? 'cursor-wait' : ''}
                ${className}`}
            >
                <Icon size={11} className={status === 'loading' ? 'animate-spin' : ''} />
                {status === 'done' ? '¡Copiado!' : status === 'loading' ? 'Capturando...' : 'Compartir'}
            </button>
            <button
                onClick={shareToTwitter}
                title="Compartir en X/Twitter"
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold border bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all"
            >
                𝕏
            </button>
        </div>
    );
};

/** Convenience wrapper: adds share overlay to any panel */
export const ShareablePanel: React.FC<{ id: string; title?: string; children: React.ReactNode; className?: string }> = ({
    id, title, children, className = ''
}) => (
    <div className={`relative ${className}`} id={id}>
        {children}
        <div className="absolute top-3 right-3">
            <ShareButton targetSelector={`#${id}`} title={title} />
        </div>
    </div>
);
