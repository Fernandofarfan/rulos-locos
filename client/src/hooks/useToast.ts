import { useState, useCallback, useRef, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'price-up' | 'price-down';

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

let _addToast: ((toast: Omit<Toast, 'id'>) => void) | null = null;

/** Singleton para disparar toasts desde fuera de React (ej. servicios) */
export function fireToast(toast: Omit<Toast, 'id'>) {
    _addToast?.(toast);
}

export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
        const timer = timers.current.get(id);
        if (timer) { clearTimeout(timer); timers.current.delete(id); }
    }, []);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        setToasts(prev => [{ ...toast, id }, ...prev].slice(0, 5)); // max 5
        const duration = toast.duration ?? 4000;
        const timer = setTimeout(() => removeToast(id), duration);
        timers.current.set(id, timer);
    }, [removeToast]);

    // Register singleton securely inside effect
    useEffect(() => {
        _addToast = addToast;
    }, [addToast]);

    return { toasts, addToast, removeToast };
}
