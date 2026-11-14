export function cutoffMonths(months: number, now = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
    const get = (type: string) => Number(parts.find(p => p.type === type)?.value);
    const date = new Date(Date.UTC(get('year'), get('month') - 1 - months, 1));
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(get('day'), lastDay));
    return date.toISOString().slice(0, 10);
}

export function filterSeries(
    series: { labels: string[]; values: number[] }, months: number, now = new Date(),
): { labels: string[]; values: number[] } {
    const cutoff = cutoffMonths(months, now);
    const end = cutoffMonths(0, now);
    const result = { labels: [] as string[], values: [] as number[] };
    series.labels.forEach((label, i) => {
        const date = new Date(label);
        if (!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) >= cutoff && date.toISOString().slice(0, 10) <= end && i < series.values.length) {
            result.labels.push(label);
            result.values.push(series.values[i]);
        }
    });
    return result;
}

export function closestSeriesValue(series: { labels: string[]; values: number[] }, target: string): number | undefined {
    const targetMs = Date.parse(target);
    if (!Number.isFinite(targetMs)) return undefined;
    let best: { distance: number; value: number } | undefined;
    series.labels.forEach((label, index) => {
        const date = Date.parse(label);
        const value = series.values[index];
        if (!Number.isFinite(date) || !Number.isFinite(value) || value <= 0) return;
        const distance = Math.abs(date - targetMs);
        if (!best || distance < best.distance) best = { distance, value };
    });
    return best?.value;
}

export function filterLastHours<T extends { timestamp: number }>(points: T[], hours: number, now = Date.now()): T[] {
    const cutoff = now - hours * 60 * 60 * 1000;
    return points.filter(point => Number.isFinite(point.timestamp) && point.timestamp >= cutoff && point.timestamp <= now);
}
