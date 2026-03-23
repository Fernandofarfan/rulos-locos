import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
    /** Título principal (e.g. "Sin datos disponibles") */
    title?: string;
    /** Descripción secundaria */
    description?: string;
    /** Icono personalizado (default: Inbox) */
    icon?: LucideIcon;
    /** Última actualización para contextualizar */
    lastUpdated?: Date | null;
    /** Acción opcional (botón Reintentar, etc.) */
    action?: React.ReactNode;
    /** Tamaño compacto para cards pequeñas */
    compact?: boolean;
}

/**
 * EmptyState — estado vacío genérico para cards y listados.
 * Muestra una UI amigable cuando el API devuelve [] / null.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
    title = 'Sin datos disponibles',
    description = 'No se encontraron datos para mostrar en este momento.',
    icon: Icon = Inbox,
    lastUpdated,
    action,
    compact = false,
}) => {
    const timeStr = lastUpdated
        ? lastUpdated.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        : null;

    if (compact) {
        return (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-slate-500">
                <Icon size={16} className="flex-shrink-0 opacity-50" />
                <span className="text-xs">{title}</span>
                {timeStr && (
                    <span className="ml-auto text-[10px] font-mono opacity-60">{timeStr}</span>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
            {/* Icono con glow sutil */}
            <div className="relative">
                <div className="absolute inset-0 rounded-full bg-accent-primary/10 blur-xl scale-150" />
                <div className="relative p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                    <Icon size={28} className="text-slate-500" />
                </div>
            </div>

            {/* Textos */}
            <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-300">{title}</p>
                <p className="text-xs text-slate-500 max-w-[240px] leading-relaxed">{description}</p>
            </div>

            {/* Última actualización */}
            {timeStr && (
                <span className="text-[10px] font-mono text-slate-600 bg-white/[0.03] border border-white/5 px-2.5 py-1 rounded-full">
                    Última sync: {timeStr}
                </span>
            )}

            {/* Acción opcional */}
            {action && <div className="mt-1">{action}</div>}
        </div>
    );
};
