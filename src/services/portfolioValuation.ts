export interface InflationMonth { fecha: string; valor: number }
export interface PortfolioValueInput {
    amount: number; buyPrice: number; date: string; currentPrice: number | null;
    mep: number | null; historicalMep: number | null; inflation: InflationMonth[]; inflationEstimated: boolean; asOf?: Date;
}

export function valuePosition(input: PortfolioValueInput) {
    const { amount, buyPrice, currentPrice, mep, historicalMep } = input;
    const costArs = amount * buyPrice;
    const valueArs = currentPrice === null ? null : amount * currentPrice;
    const valueUsd = valueArs !== null && mep && mep > 0 ? valueArs / mep : null;
    const nominalPnlArs = valueArs === null ? null : valueArs - costArs;
    const pnlUsd = valueUsd !== null && historicalMep && historicalMep > 0 ? valueUsd - costArs / historicalMep : null;
    const buyMonth = input.date.slice(0, 7);
    const now = input.asOf ?? new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const months = input.inflation.filter(item => item.fecha.slice(0, 7) >= buyMonth && item.fecha.slice(0, 7) <= currentMonth)
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
    let expected = buyMonth;
    let complete = !!buyMonth && buyMonth <= currentMonth && months.length > 0;
    let multiplier = 1;
    for (const [index, month] of months.entries()) {
        if (month.fecha.slice(0, 7) !== expected || !Number.isFinite(month.valor) || month.valor <= -100) complete = false;
        const [buyYear, buyMonthNumber, buyDay] = input.date.split('-').map(Number);
        const daysInBuyMonth = new Date(Date.UTC(buyYear, buyMonthNumber, 0)).getUTCDate();
        const fraction = index === 0 ? (daysInBuyMonth - buyDay + 1) / daysInBuyMonth : 1;
        multiplier *= (1 + month.valor / 100) ** fraction;
        const [year, monthNumber] = expected.split('-').map(Number);
        expected = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 7);
    }
    const previousMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
    const staleInflation = !months.length || months[months.length - 1].fecha.slice(0, 7) < previousMonth;
    const realPnlArs = valueArs !== null && complete ? valueArs - costArs * multiplier : null;
    return { costArs, valueArs, valueUsd, nominalPnlArs, pnlUsd, realPnlArs,
        inflationMultiplier: complete ? multiplier : null, historicalMep,
        isEstimated: input.inflationEstimated || !complete || staleInflation || input.date.slice(8, 10) !== '01' || !historicalMep };
}
