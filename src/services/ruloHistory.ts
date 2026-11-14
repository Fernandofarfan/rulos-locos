import prisma from '../utils/db';
import { calculateRoutes } from './netArbitrage';
import type { ArbitrageResult } from './arbitrageService';

const HALF_HOUR = 30 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

export async function recordRuloSnapshots(result: ArbitrageResult, now = new Date()): Promise<void> {
    if (!prisma) throw new Error('Base de datos no disponible');
    const routes = calculateRoutes(result, 1_000_000);
    await prisma.$transaction(async tx => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('rulo_snapshots'))`;
        const latest = await tx.ruloSnapshot.groupBy({ by: ['routeId'], _max: { timestamp: true } });
        const lastByRoute = new Map(latest.map(row => [row.routeId, row._max.timestamp]));
        const data = routes.filter(route => {
            const last = lastByRoute.get(route.id);
            return !last || now.getTime() - last.getTime() >= HALF_HOUR;
        }).map(route => ({ routeId: route.id, timestamp: now, grossPct: route.net.grossPct, netPct: route.net.netPct }));
        if (data.length) await tx.ruloSnapshot.createMany({ data, skipDuplicates: true });
        await tx.ruloSnapshot.deleteMany({ where: { timestamp: { lt: new Date(now.getTime() - 400 * DAY) } } });
    });
}

export function summarizeHistory(points: { timestamp: Date; netPct: number }[], days: number) {
    const daily = new Map<string, number>();
    const calendar = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' });
    for (const point of points) {
        const date = calendar.format(point.timestamp);
        daily.set(date, Math.max(daily.get(date) ?? -Infinity, point.netPct));
    }
    const bestByDay = [...daily.values()];
    return {
        days,
        avgNetPct: points.length ? points.reduce((sum, point) => sum + point.netPct, 0) / points.length : null,
        bestNetPct: points.length ? Math.max(...points.map(point => point.netPct)) : null,
        worstNetPct: points.length ? Math.min(...points.map(point => point.netPct)) : null,
        positiveDaysPct: bestByDay.length ? bestByDay.filter(value => value > 0).length / bestByDay.length * 100 : null,
        simulatedReturnPct: bestByDay.length ? bestByDay.reduce((sum, value) => sum + value, 0) : null,
        note: 'Simulado, no considera límites ni tiempos de acreditación.',
    };
}
