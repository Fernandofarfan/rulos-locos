export type HistoricalRange = '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y' | 'ALL';

const monthsByRange: Record<Exclude<HistoricalRange, 'ALL'>, number> = {
    '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '2Y': 24, '5Y': 60,
};

export function argentinaDay(now = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
    const part = (name: string) => parts.find(p => p.type === name)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')}`;
}

export function cutoffDate(range: HistoricalRange, now = new Date()): string | null {
    if (range === 'ALL') return null;
    const [year, month, day] = argentinaDay(now).split('-').map(Number);
    const first = new Date(Date.UTC(year, month - 1 - monthsByRange[range], 1));
    const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    first.setUTCDate(Math.min(day, lastDay));
    return first.toISOString().slice(0, 10);
}

export function filterByDateRange<T>(
    seriesLabels: string[], seriesValues: T[], range: HistoricalRange, now = new Date(),
): { labels: string[]; values: T[] } {
    const cutoff = cutoffDate(range, now);
    if (!cutoff) return { labels: seriesLabels, values: seriesValues };
    const end = argentinaDay(now);
    const labels: string[] = [];
    const values: T[] = [];
    seriesLabels.forEach((label, index) => {
        const date = new Date(label);
        if (Number.isNaN(date.getTime()) || index >= seriesValues.length) return;
        const day = date.toISOString().slice(0, 10);
        if (day >= cutoff && day <= end) {
            labels.push(label);
            values.push(seriesValues[index]);
        }
    });
    return { labels, values };
}
