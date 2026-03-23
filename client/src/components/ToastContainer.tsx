import React, { useEffect, useState } from 'react';
import { X, TrendingUp, TrendingDown, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { useToast, type Toast, type ToastType } from '../hooks/useToast';

const CONFIG: Record<ToastType, { icon: React.FC<{ size?: number; className?: string }>; bg: string; border: string; accent: string }> = {
    'success': { icon: CheckCircle, bg: 'bg-emerald-950', border: 'border-emerald-500/30', accent: 'text-emerald-400' },
    'error': { icon: XCircle, bg: 'bg-red-950', border: 'border-red-500/30', accent: 'text-red-400' },
    'warning': { icon: AlertTriangle, bg: 'bg-amber-950', border: 'border-amber-500/30', accent: 'text-amber-400' },
    'info': { icon: Info, bg: 'bg-slate-900', border: 'border-slate-500/30', accent: 'text-blue-400' },
    'price-up': { icon: TrendingUp, bg: 'bg-emerald-950', border: 'border-emerald-400/40', accent: 'text-emerald-300' },
    'price-down': { icon: TrendingDown, bg: 'bg-red-950', border: 'border-red-400/40', accent: 'text-red-300' },
};

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
    const [visible, setVisible] = useState(false);
    const cfg = CONFIG[toast.type];
    const Icon = cfg.icon;

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 10);
        return () => clearTimeout(t);
    }, []);

    return (
        <div
            className={`
                flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-xl
                ${cfg.bg} ${cfg.border}
                transition-all duration-300 ease-out
                ${visible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}
                max-w-sm w-full cursor-pointer group
            `}
            onClick={onClose}
        >
            <Icon size={18} className={`${cfg.accent} flex-shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${cfg.accent}`}>{toast.title}</p>
                {toast.message && <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{toast.message}</p>}
            </div>
            <button
                onClick={e => { e.stopPropagation(); onClose(); }}
                className="text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0"
            >
                <X size={14} />
            </button>
        </div>
    );
}

export const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useToast();

    return (
        <div
            className="fixed bottom-24 right-4 z-[600] flex flex-col gap-2 items-end pointer-events-none"
            aria-live="polite"
            aria-atomic="false"
        >
            {toasts.map(toast => (
                <div key={toast.id} className="pointer-events-auto">
                    <ToastItem toast={toast} onClose={() => removeToast(toast.id)} />
                </div>
            ))}
        </div>
    );
};
