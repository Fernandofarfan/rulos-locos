export interface DataPoint { day: number; price: number }

export function linearRegression(data: DataPoint[]) {
    if (data.length < 2) return { slope: 0, intercept: data[0]?.price ?? 0, r2: 0 };
    const meanX = data.reduce((sum, point) => sum + point.day, 0) / data.length;
    const meanY = data.reduce((sum, point) => sum + point.price, 0) / data.length;
    const xx = data.reduce((sum, point) => sum + (point.day - meanX) ** 2, 0);
    if (xx === 0) return { slope: 0, intercept: meanY, r2: 0 };
    const slope = data.reduce((sum, point) => sum + (point.day - meanX) * (point.price - meanY), 0) / xx;
    const intercept = meanY - slope * meanX;
    const total = data.reduce((sum, point) => sum + (point.price - meanY) ** 2, 0);
    const residual = data.reduce((sum, point) => sum + (point.price - (slope * point.day + intercept)) ** 2, 0);
    return { slope, intercept, r2: total > 0 ? Math.max(0, 1 - residual / total) : 0 };
}

export function walkForwardBacktest(data: DataPoint[], horizon: number) {
    const points = data.filter(point => Number.isFinite(point.day) && Number.isFinite(point.price) && point.price > 0)
        .sort((a, b) => a.day - b.day);
    let error = 0, hits = 0, count = 0;
    for (let i = 9; i < points.length; i++) {
        const origin = points[i];
        const targetDay = origin.day + horizon;
        const target = points.slice(i + 1).reduce<DataPoint | null>((best, point) =>
            !best || Math.abs(point.day - targetDay) < Math.abs(best.day - targetDay) ? point : best, null);
        if (!target || Math.abs(target.day - targetDay) > Math.max(3, horizon * 0.2)) continue;
        const model = linearRegression(points.slice(0, i + 1));
        const prediction = model.slope * target.day + model.intercept;
        error += Math.abs((prediction - target.price) / target.price) * 100;
        if (Math.sign(prediction - origin.price) === Math.sign(target.price - origin.price)) hits++;
        count++;
    }
    return { samples: count, mape: count ? error / count : null, hitRate: count ? hits / count * 100 : null };
}
