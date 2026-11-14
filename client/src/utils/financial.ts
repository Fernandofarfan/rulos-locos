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

export function calculateInvestmentTax(invested: number, returned: number, rate: number, exempt: boolean) {
    const gain = returned - invested;
    const tax = exempt || gain <= 0 ? 0 : gain * rate / 100;
    const netGain = gain - tax;
    return { gain, tax, netGain, netReturn: invested + netGain };
}

export function calculateSalaryPower(initial: number, increasePct: number, inflationRates: number[]) {
    const multiplier = inflationRates.reduce((acc, value) => acc * (1 + value / 100), 1);
    const cumulIPC = (multiplier - 1) * 100;
    const currentNominal = initial * (1 + increasePct / 100);
    const realToday = initial * multiplier;
    const purchasingPower = realToday > 0 ? currentNominal / realToday * 100 : 0;
    return { cumulIPC, currentNominal, realToday, purchasingPower, lostARS: realToday - currentNominal };
}

// IPC nacional 2024; octubre: https://www.indec.gob.ar/uploads/informesdeprensa/ipc_11_246E0BFFA2AC.pdf
export const MONTHLY_INFLATION_2024 = [20.6, 13.2, 11, 8.8, 4.2, 4.6, 4, 4.2, 3.5, 2.7, 2.4, 2.7];

export function fixedDepositRates(tna: number, days = 30) {
    const period = tna / 100 * days / 365;
    return { period, annual: (1 + period) ** (365 / days) - 1 };
}

export function loanVsDeposit(amount: number, months: number, loanTna: number, depositTna: number) {
    const loanRate = loanTna / 1200;
    const monthlyInstallment = months <= 0 ? 0 : loanRate > 0
        ? amount * loanRate / (1 - (1 + loanRate) ** -months) : amount / months;
    const totalPaid = monthlyInstallment * months;
    const totalInterestsPaid = totalPaid - amount;
    const pfReturnAtMaturity = projectSavings(amount, depositTna, months, 0, true);
    const totalInterestsEarned = pfReturnAtMaturity - amount;
    return { monthlyInstallment, totalPaid, totalInterestsPaid, pfReturnAtMaturity, totalInterestsEarned, isLicuating: totalInterestsEarned > totalInterestsPaid };
}

export function adjustByUva(amount: number, initialUva: number, latestUva: number) {
    if (initialUva <= 0 || latestUva <= 0) return null;
    const ratio = latestUva / initialUva;
    const adjustedAmount = amount * ratio;
    return { ratio, adjustedAmount, nominalGain: adjustedAmount - amount, nominalGainPct: (ratio - 1) * 100 };
}

export function compareCardDollar(usdAmount: number, cardRate: number, mepRate: number) {
    const costARSviaTarjeta = usdAmount * cardRate;
    const costARSviaMEP = usdAmount * mepRate;
    const differenceARS = Math.abs(costARSviaTarjeta - costARSviaMEP);
    const mepIsCheaper = costARSviaMEP < costARSviaTarjeta;
    const higher = Math.max(costARSviaTarjeta, costARSviaMEP);
    return { costARSviaTarjeta, costARSviaMEP, differenceARS, mepIsCheaper, differencePct: higher > 0 ? differenceARS / higher * 100 : 0 };
}

export function savingsReturnPct(final: number, initial: number, monthly: number, months: number): number {
    const contributed = initial + monthly * months;
    return contributed > 0 ? (final - contributed) / contributed * 100 : 0;
}

export function realRateProjection(tna: number, days: number, capital: number, monthlyInflation: number) {
    const tasaEfectivaPeriodo = fixedDepositRates(tna, days).period;
    const inflacionPeriodo = (1 + monthlyInflation / 100) ** (days / 30) - 1;
    const tasaReal = realRate(tasaEfectivaPeriodo, inflacionPeriodo);
    const tasaRealAnualizada = (1 + tasaReal) ** (365 / days) - 1;
    const gananciasBruta = capital * tasaEfectivaPeriodo;
    const poderAdquisitivoPerdido = purchasingPowerLoss(capital, inflacionPeriodo);
    const gananciaReal = capital * tasaReal;
    const capitalFinal = capital + gananciasBruta;
    const tem = fixedDepositRates(tna).period * 100;
    const tea = fixedDepositRates(tna).annual * 100;
    return { tasaEfectivaPeriodo, inflacionPeriodo, tasaReal, tasaRealAnualizada, gananciasBruta,
        poderAdquisitivoPerdido, gananciaReal, capitalFinal, tem, tea };
}
