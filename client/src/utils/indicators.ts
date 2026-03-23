/**
 * indicators.ts — Cálculo de indicadores técnicos financieros.
 * Funciones puras, sin dependencias externas, totalmente testeables.
 */

/**
 * Simple Moving Average (SMA)
 * Retorna null para los primeros (period-1) índices.
 * @example calcSMA([1,2,3,4,5], 3) → [null, null, 2, 3, 4]
 */
export function calcSMA(values: number[], period: number): (number | null)[] {
    const result: (number | null)[] = new Array(values.length).fill(null);
    if (values.length < period || period < 1) return result;
    for (let i = period - 1; i < values.length; i++) {
        const slice = values.slice(i - period + 1, i + 1);
        result[i] = slice.reduce((a, b) => a + b, 0) / period;
    }
    return result;
}

/**
 * Exponential Moving Average (EMA)
 * Semilla = SMA del primer `period` puntos, luego suavizado exponencial.
 * Retorna null para los primeros (period-1) índices.
 * Multiplicador k = 2 / (period + 1)
 */
export function calcEMA(values: number[], period: number): (number | null)[] {
    const result: (number | null)[] = new Array(values.length).fill(null);
    if (values.length < period || period < 1) return result;
    const k = 2 / (period + 1);
    // Seed usando SMA del primer bloque
    const seed = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    result[period - 1] = seed;
    for (let i = period; i < values.length; i++) {
        result[i] = values[i] * k + result[i - 1]! * (1 - k);
    }
    return result;
}

/**
 * Relative Strength Index (RSI) — método Wilder (suavizado exponencial).
 * Retorna null para los primeros `period` índices.
 * Overbought: RSI ≥ 70 — Oversold: RSI ≤ 30
 * @param values Array de precios de cierre
 * @param period Período (default 14)
 */
export function calcRSI(values: number[], period = 14): (number | null)[] {
    const result: (number | null)[] = new Array(values.length).fill(null);
    if (values.length < period + 1 || period < 1) return result;

    // Seed: promedio simple de ganancias/pérdidas del primer período
    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 1; i <= period; i++) {
        const diff = values[i] - values[i - 1];
        if (diff > 0) avgGain += diff / period;
        else avgLoss += Math.abs(diff) / period;
    }

    result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

    // Suavizado de Wilder (SMMA)
    for (let i = period + 1; i < values.length; i++) {
        const diff = values[i] - values[i - 1];
        avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
        avgLoss = (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period;
        result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }

    return result;
}

/**
 * Bollinger Bands
 * Retorna { upper, middle, lower } donde cada uno es un array de numbers con nulls al inicio.
 */
export function calcBollingerBands(
    values: number[],
    period = 20,
    multiplier = 2
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
    const middle = calcSMA(values, period);
    const upper: (number | null)[] = new Array(values.length).fill(null);
    const lower: (number | null)[] = new Array(values.length).fill(null);

    for (let i = period - 1; i < values.length; i++) {
        const slice = values.slice(i - period + 1, i + 1);
        const mean = middle[i]!;
        // Standard Deviation
        const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
        const stdDev = Math.sqrt(variance);

        upper[i] = mean + stdDev * multiplier;
        lower[i] = mean - stdDev * multiplier;
    }

    return { upper, middle, lower };
}

/**
 * MACD (Moving Average Convergence Divergence)
 * @param fastPeriod default 12
 * @param slowPeriod default 26
 * @param signalPeriod default 9
 */
export function calcMACD(
    values: number[],
    fastPeriod = 12,
    slowPeriod = 26,
    signalPeriod = 9
): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
    const fastEma = calcEMA(values, fastPeriod);
    const slowEma = calcEMA(values, slowPeriod);
    const macdLine: (number | null)[] = new Array(values.length).fill(null);

    for (let i = slowPeriod - 1; i < values.length; i++) {
        macdLine[i] = fastEma[i]! - slowEma[i]!;
    }

    // Calcular la Signal como la EMA de la línea MACD.
    // Como macdLine tiene nulls asimilamos un array recortado para la EMA:
    const validMacdLine = macdLine.slice(slowPeriod - 1) as number[];
    const signalLineRaw = calcEMA(validMacdLine, signalPeriod);

    const signalLine: (number | null)[] = new Array(values.length).fill(null);
    const histogram: (number | null)[] = new Array(values.length).fill(null);

    for (let i = 0; i < signalLineRaw.length; i++) {
        const globalIndex = i + slowPeriod - 1;
        signalLine[globalIndex] = signalLineRaw[i];
        if (signalLine[globalIndex] !== null && macdLine[globalIndex] !== null) {
            histogram[globalIndex] = macdLine[globalIndex]! - signalLine[globalIndex]!;
        }
    }

    return { macd: macdLine, signal: signalLine, histogram };
}

/**
 * Normalizes a date string for lightweight-charts.
 * Converts "yyyy-MM" → "yyyy-MM-dd" by appending "-01".
 */
export function normalizeDate(d: string): string {
    // yyyy-MM (7 chars) → yyyy-MM-01
    if (/^\d{4}-\d{2}$/.test(d)) return `${d}-01`;
    return d;
}

/**
 * Formatea un array con nulls en pares {time, value} para lightweight-charts.
 * Filtra los nulls y parsea a floating-point con la precisión indicada.
 */
export function toChartData(
    labels: string[],
    values: (number | null)[],
    precision = 2
): { time: string; value: number }[] {
    return labels
        .map((date, i) =>
            values[i] !== null
                ? { time: normalizeDate(date), value: parseFloat(values[i]!.toFixed(precision)) }
                : null
        )
        .filter((x): x is { time: string; value: number } => x !== null);
}
