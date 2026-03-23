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

/** Formatea puntos básicos / enteros sin símbolo */
export function formatInt(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '--';
  return value.toLocaleString('es-AR', { maximumFractionDigits: 0 });
}
