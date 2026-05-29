/**
 * Formatea números para el mercado argentino.
 * Ejemplos:
 *   formatARS(1200)        → "$ 1.200"
 *   formatARS(1200.5)      → "$ 1.200,50"
 *   formatARS(1200, true)  → "$ 1.200" (sin decimales)
 *   formatCompact(41000000000000) → "$ 41,0 B"
 */

/** Formatea como moneda ARS con separadores locales */
export function formatARS(value: number | null | undefined, noDecimals = true): string {
  if (value == null || isNaN(value)) return '--';
  return '$ ' + value.toLocaleString('es-AR', {
    minimumFractionDigits: noDecimals ? 0 : 2,
    maximumFractionDigits: noDecimals ? 0 : 2,
  });
}

/** Formatea como porcentaje */
export function formatPct(value: number | null | undefined, decimals = 1): string {
  if (value == null || isNaN(value)) return '--';
  return value.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + '%';
}

/** Formatea números grandes en forma compacta (K, M, B) */
export function formatCompact(value: number | null | undefined, prefix = '$ '): string {
  if (value == null || isNaN(value)) return '--';
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${prefix}${(value / 1e12).toLocaleString('es-AR', { maximumFractionDigits: 1 })} B`;
  if (abs >= 1e9)  return `${prefix}${(value / 1e9).toLocaleString('es-AR',  { maximumFractionDigits: 1 })} M`;
  if (abs >= 1e6)  return `${prefix}${(value / 1e6).toLocaleString('es-AR',  { maximumFractionDigits: 1 })} MM`;
  if (abs >= 1e3)  return `${prefix}${(value / 1e3).toLocaleString('es-AR',  { maximumFractionDigits: 1 })} K`;
  return `${prefix}${value.toLocaleString('es-AR')}`;
}

/** Formatea puntos basicos / enteros sin simbolo */
export function formatInt(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '--';
  return value.toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

/** Formatea como USD */
export function formatUSD(value: number | null | undefined, decimals = 2): string {
  if (value == null || isNaN(value)) return '--';
  return '$' + value.toLocaleString('en-US', {
    minimumFractionDigits: value >= 1 ? decimals : 4,
    maximumFractionDigits: value >= 1 ? decimals : 4,
  });
}

/** Formatea cambio porcentual con signo */
export function formatChange(value: number | null | undefined, decimals = 2): string {
  if (value == null || isNaN(value)) return '--';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(decimals)}%`;
}

/** Formatea tiempo relativo (hace X minutos) */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return '--';
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}

/** Formatea etiqueta de riesgo con color */
export function formatRiskColor(risk: string): { color: string; label: string } {
  switch (risk) {
    case 'bajo': return { color: 'text-emerald-400', label: 'Bajo' };
    case 'medio': return { color: 'text-amber-400', label: 'Medio' };
    case 'alto': return { color: 'text-red-400', label: 'Alto' };
    default: return { color: 'text-slate-400', label: risk || '--' };
  }
}
