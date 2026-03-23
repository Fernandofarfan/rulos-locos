import React from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';

interface ErrorCardProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  variant?: 'inline' | 'full';
  type?: 'error' | 'network' | 'empty';
}

export const ErrorCard: React.FC<ErrorCardProps> = ({
  title,
  message,
  onRetry,
  variant = 'inline',
  type = 'error',
}) => {
  const icons = {
    error: AlertTriangle,
    network: WifiOff,
    empty: AlertTriangle,
  };

  const colors = {
    error: 'text-red-400',
    network: 'text-amber-400',
    empty: 'text-slate-500',
  };

  const defaultTitles = {
    error: 'Error al cargar datos',
    network: 'Sin conexión',
    empty: 'Sin datos disponibles',
  };

  const defaultMessages = {
    error: 'No se pudo obtener la información. Intentá de nuevo.',
    network: 'Verificá tu conexión o intentá más tarde.',
    empty: 'No hay datos para mostrar en este momento.',
  };

  const Icon = icons[type];
  const colorClass = colors[type];
  const displayTitle = title ?? defaultTitles[type];
  const displayMessage = message ?? defaultMessages[type];

  if (variant === 'full') {
    return (
      <div className="glass-panel p-6 flex flex-col items-center justify-center gap-4 min-h-[200px] text-center">
        <div className={`p-3 rounded-full bg-white/5 ${colorClass}`}>
          <Icon className="w-8 h-8" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-300">{displayTitle}</p>
          <p className="text-xs text-slate-500 mt-1">{displayMessage}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white transition-all border border-white/10 hover:border-white/20"
          >
            <RefreshCw className="w-3 h-3" />
            Reintentar
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-white/3 border border-white/8">
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${colorClass}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-400">{displayTitle}</p>
        <p className="text-xs text-slate-500 truncate">{displayMessage}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
          title="Reintentar"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
