export function carryTradeHistory(series: { fecha: string; valor: number }[], tna: number) {
    if (!series.length) return [];
    const monthlyRate = tna / 1200;
    const initial = series[0];
    return series.map(point => {
        const elapsedDays = (Date.parse(point.fecha) - Date.parse(initial.fecha)) / 86400000;
        const currentARS = 1000 * initial.valor * Math.pow(1 + monthlyRate, elapsedDays / 30);
        return { fecha: point.fecha, usdHold: 1000, arsTasaInUSD: Number((currentARS / point.valor).toFixed(2)), dolarPrice: point.valor };
    });
}
