/**
 * Tests unitarios para formatARS utilities.
 * Requiere: vitest (npm install --save-dev vitest)
 * Ejecutar: npm test
 */
import { describe, it, expect } from 'vitest';
import { formatARS, formatPct, formatCompact, formatInt } from './formatARS';

// ────────────────────────────────────────────────────────────────────────────
// formatARS
// ────────────────────────────────────────────────────────────────────────────
describe('formatARS', () => {
  it('formatea número entero', () => {
    expect(formatARS(1200)).toBe('$ 1.200');
  });

  it('formatea con decimales cuando noDecimals=false', () => {
    expect(formatARS(1200.5, false)).toBe('$ 1.200,50');
  });

  it('retorna -- para null', () => {
    expect(formatARS(null)).toBe('--');
  });

  it('retorna -- para undefined', () => {
    expect(formatARS(undefined)).toBe('--');
  });

  it('retorna -- para NaN', () => {
    expect(formatARS(NaN)).toBe('--');
  });

  it('formatea cero correctamente', () => {
    expect(formatARS(0)).toBe('$ 0');
  });

  it('formatea valor negativo', () => {
    expect(formatARS(-500)).toBe('$ -500');
  });

  it('formatea millones con separador de miles', () => {
    expect(formatARS(1_000_000)).toBe('$ 1.000.000');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// formatPct
// ────────────────────────────────────────────────────────────────────────────
describe('formatPct', () => {
  it('formatea porcentaje con 1 decimal por defecto', () => {
    expect(formatPct(134.2)).toBe('134,2%');
  });

  it('formatea con 2 decimales', () => {
    expect(formatPct(33.5, 2)).toBe('33,50%');
  });

  it('retorna -- para null', () => {
    expect(formatPct(null)).toBe('--');
  });

  it('formatea cero', () => {
    expect(formatPct(0)).toBe('0,0%');
  });

  it('formatea negativo', () => {
    expect(formatPct(-5.3)).toBe('-5,3%');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// formatCompact
// ────────────────────────────────────────────────────────────────────────────
describe('formatCompact', () => {
  it('usa sufijo B para billones (1e12)', () => {
    expect(formatCompact(41_000_000_000_000)).toBe('$ 41 B');
  });

  it('usa sufijo M para miles de millones (1e9)', () => {
    expect(formatCompact(5_500_000_000)).toBe('$ 5,5 M');
  });

  it('usa sufijo MM para millones (1e6)', () => {
    expect(formatCompact(2_300_000)).toBe('$ 2,3 MM');
  });

  it('usa sufijo K para miles (1e3)', () => {
    expect(formatCompact(45_000)).toBe('$ 45 K');
  });

  it('no usa sufijo para valores < 1000', () => {
    expect(formatCompact(999)).toBe('$ 999');
  });

  it('retorna -- para null', () => {
    expect(formatCompact(null)).toBe('--');
  });

  it('acepta prefijo personalizado', () => {
    expect(formatCompact(1_000, 'USD ')).toBe('USD 1 K');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// formatInt
// ────────────────────────────────────────────────────────────────────────────
describe('formatInt', () => {
  it('formatea entero sin decimales', () => {
    expect(formatInt(950)).toBe('950');
  });

  it('redondea decimales', () => {
    expect(formatInt(1234.9)).toBe('1.235');
  });

  it('retorna -- para null', () => {
    expect(formatInt(null)).toBe('--');
  });
});
