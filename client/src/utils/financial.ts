export interface UVAEntry { fecha: string; valor: number }

export function uvaEntryOneYearBefore(entries: UVAEntry[]): UVAEntry | undefined {
    const sorted = [...entries].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const latest = sorted[sorted.length - 1];
    if (!latest) return undefined;
    const target = new Date(`${latest.fecha.slice(0, 10)}T00:00:00Z`);
    target.setUTCFullYear(target.getUTCFullYear() - 1);
    const targetMs = target.getTime();
    return sorted.reduce((best, entry) =>
        Math.abs(Date.parse(entry.fecha) - targetMs) < Math.abs(Date.parse(best.fecha) - targetMs) ? entry : best
    );
}

export function uvaMonthlyGrowth(entries: UVAEntry[]): number {
    const sorted = [...entries].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const latest = sorted[sorted.length - 1];
    const previous = uvaEntryOneYearBefore(sorted);
    if (!latest || !previous || latest.valor <= 0) return 1;
    const elapsedMonths = (Date.parse(latest.fecha) - Date.parse(previous.fecha)) / (365.2425 / 12 * 86400000);
    if (previous.valor <= 0 || elapsedMonths <= 0) return 1;
    return Math.pow(latest.valor / previous.valor, 1 / elapsedMonths);
}

export function calculateUvaLoan(entries: UVAEntry[], amount: number, startDate: string, years: number, tna: number) {
    const sorted = [...entries].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const start = sorted.find(e => e.fecha >= startDate);
    const latest = sorted[sorted.length - 1];
    if (!start || !latest || start.valor <= 0 || amount <= 0 || years <= 0 || tna < 0) return null;
    const capital = amount / start.valor;
    const months = years * 12;
    const rate = tna / 1200;
    const payment = rate === 0 ? capital / months : capital * rate / (1 - Math.pow(1 + rate, -months));
    const growth = uvaMonthlyGrowth(sorted);
    const startMs = Date.parse(start.fecha);
    const latestMs = Date.parse(latest.fecha);
    const paymentARS: number[] = [];
    const paymentLabels: string[] = [];
    const startDay = new Date(startMs).getUTCDate();
    const startYear = new Date(startMs).getUTCFullYear();
    const startMonth = new Date(startMs).getUTCMonth();
    for (let m = 0; m < months; m++) {
        const target = new Date(Date.UTC(startYear, startMonth + m, 1));
        const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
        target.setUTCDate(Math.min(startDay, lastDay));
        const targetMs = target.getTime();
        const closest = sorted.reduce((prev, curr) =>
            Math.abs(Date.parse(curr.fecha) - targetMs) < Math.abs(Date.parse(prev.fecha) - targetMs) ? curr : prev);
        const monthsAhead = Math.round((targetMs - latestMs) / (30.44 * 86400000));
        const value = targetMs > latestMs ? latest.valor * Math.pow(growth, monthsAhead) : closest.valor;
        paymentARS.push(payment * value);
        paymentLabels.push(target.toISOString().slice(0, 7));
    }
    const total = paymentARS.reduce((sum, value) => sum + value, 0);
    return { capital, payment, start, latest, paymentARS, paymentLabels, total };
}

export function realRate(nominalRate: number, inflationRate: number): number {
    return (1 + nominalRate) / (1 + inflationRate) - 1;
}

export function inflationReturn(factor: number): number {
    return (1 / factor - 1) * 100;
}

export function purchasingPowerLoss(capital: number, inflation: number): number {
    return capital * (1 - 1 / (1 + inflation));
}

export function plazoFijoRate(rates: { plazoFijo?: { tna?: number } } | null): number {
    const tna = rates?.plazoFijo?.tna;
    return typeof tna === 'number' && Number.isFinite(tna) && tna > 0 ? tna : 35;
}

export function dollarSalePrice(quote: { compra?: number } | undefined, fallback: number): number {
    return quote?.compra && quote.compra > 0 ? quote.compra : fallback;
}

export function percentageReturn(initial: number, final: number): number {
    return Number.isFinite(initial) && initial > 0 && Number.isFinite(final) ? (final / initial - 1) * 100 : NaN;
}

export function projectSavings(amount: number, annualRate: number, months: number, monthly: number, nominal: boolean): number {
    const r = nominal ? annualRate / 1200 : Math.pow(1 + annualRate / 100, 1 / 12) - 1;
    let result = amount;
    for (let i = 0; i < months; i++) result = result * (1 + r) + monthly;
    return result;
}
