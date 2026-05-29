/**
 * indicators.ts -- Calculo de indicadores tecnicos financieros.
 * Funciones puras, sin dependencias externas, totalmente testeables.
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

export function calcEMA(values: number[], period: number): (number | null)[] {
    const result: (number | null)[] = new Array(values.length).fill(null);
    if (values.length < period || period < 1) return result;
    const k = 2 / (period + 1);
    const seed = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    result[period - 1] = seed;
    for (let i = period; i < values.length; i++) {
        result[i] = values[i] * k + result[i - 1]! * (1 - k);
    }
    return result;
}

export function calcRSI(values: number[], period = 14): (number | null)[] {
    const result: (number | null)[] = new Array(values.length).fill(null);
    if (values.length < period + 1 || period < 1) return result;
    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 1; i <= period; i++) {
        const diff = values[i] - values[i - 1];
        if (diff > 0) avgGain += diff / period;
        else avgLoss += Math.abs(diff) / period;
    }
    result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    for (let i = period + 1; i < values.length; i++) {
        const diff = values[i] - values[i - 1];
        avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
        avgLoss = (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period;
        result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }
    return result;
}

export function calcBollingerBands(values: number[], period = 20, multiplier = 2): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
    const middle = calcSMA(values, period);
    const upper: (number | null)[] = new Array(values.length).fill(null);
    const lower: (number | null)[] = new Array(values.length).fill(null);
    for (let i = period - 1; i < values.length; i++) {
        const slice = values.slice(i - period + 1, i + 1);
        const mean = middle[i]!;
        const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
        const stdDev = Math.sqrt(variance);
        upper[i] = mean + stdDev * multiplier;
        lower[i] = mean - stdDev * multiplier;
    }
    return { upper, middle, lower };
}

export function calcMACD(values: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
    const fastEma = calcEMA(values, fastPeriod);
    const slowEma = calcEMA(values, slowPeriod);
    const macdLine: (number | null)[] = new Array(values.length).fill(null);
    for (let i = slowPeriod - 1; i < values.length; i++) {
        macdLine[i] = fastEma[i]! - slowEma[i]!;
    }
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

/** Stochastic Oscillator %K y %D */
export function calcStoch(highs: number[], lows: number[], closes: number[], period = 14, smoothK = 3, smoothD = 3): { k: (number | null)[]; d: (number | null)[] } {
    const n = closes.length;
    const rawK: (number | null)[] = new Array(n).fill(null);
    for (let i = period - 1; i < n; i++) {
        const sliceH = highs.slice(i - period + 1, i + 1);
        const sliceL = lows.slice(i - period + 1, i + 1);
        const highest = Math.max(...sliceH);
        const lowest = Math.min(...sliceL);
        rawK[i] = highest === lowest ? 50 : ((closes[i] - lowest) / (highest - lowest)) * 100;
    }
    const validK = rawK.filter((v): v is number => v !== null);
    const smoothedKRaw = calcSMA(validK, smoothK);
    const k: (number | null)[] = new Array(n).fill(null);
    for (let i = 0; i < smoothedKRaw.length; i++) {
        k[i + period - 1] = smoothedKRaw[i];
    }
    const validSmoothedK = k.filter((v): v is number => v !== null);
    const dRaw = calcSMA(validSmoothedK, smoothD);
    const d: (number | null)[] = new Array(n).fill(null);
    for (let i = 0; i < dRaw.length; i++) {
        d[i + period + smoothK - 2] = dRaw[i];
    }
    return { k, d };
}

/** Average True Range (ATR) */
export function calcATR(highs: number[], lows: number[], closes: number[], period = 14): (number | null)[] {
    const n = closes.length;
    const tr: number[] = new Array(n).fill(0);
    tr[0] = highs[0] - lows[0];
    for (let i = 1; i < n; i++) {
        tr[i] = Math.max(
            highs[i] - lows[i],
            Math.abs(highs[i] - closes[i - 1]),
            Math.abs(lows[i] - closes[i - 1])
        );
    }
    const result: (number | null)[] = new Array(n).fill(null);
    result[period - 1] = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < n; i++) {
        result[i] = (result[i - 1]! * (period - 1) + tr[i]) / period;
    }
    return result;
}

/** Volume-Weighted Average Price */
export function calcVWAP(prices: number[], volumes: number[]): number {
    if (prices.length === 0 || volumes.length === 0) return 0;
    let totalPV = 0, totalV = 0;
    for (let i = 0; i < Math.min(prices.length, volumes.length); i++) {
        totalPV += prices[i] * volumes[i];
        totalV += volumes[i];
    }
    return totalV === 0 ? 0 : totalPV / totalV;
}

/** Fibonacci Retracement Levels */
export function calcFiboRetracement(high: number, low: number): { level: string; value: number }[] {
    const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    const diff = high - low;
    return ratios.map(r => ({
        level: `${(r * 100).toFixed(1)}%`,
        value: parseFloat((high - diff * r).toFixed(2)),
    }));
}

export function normalizeDate(d: string): string {
    if (/^\d{4}-\d{2}$/.test(d)) return `${d}-01`;
    return d;
}

export function toChartData(labels: string[], values: (number | null)[], precision = 2): { time: string; value: number }[] {
    return labels
        .map((date, i) =>
            values[i] !== null
                ? { time: normalizeDate(date), value: parseFloat(values[i]!.toFixed(precision)) }
                : null
        )
        .filter((x): x is { time: string; value: number } => x !== null);
}
