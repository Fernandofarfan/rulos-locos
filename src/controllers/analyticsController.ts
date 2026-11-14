import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/db';

export const FEATURES = [
    'dashboard', 'mercado', 'arbitrage', 'herramientas', 'charts', 'portfolio',
    'tasas', 'mercados', 'consumo', 'creditos', 'inversion',
    'dolar-tarjeta', 'salario', 'inflacion', 'cer', 'ahorro', 'objetivos', 'canasta',
    'uva', 'prestamos', 'impuestos', 'comparador', 'tasa-real', 'bonos', 'backtester', 'recomendacion',
] as const;

export const TrackSchema = z.object({
    name: z.string().regex(/^[a-z0-9_.:-]{1,64}$/).refine(value => ['section.open', 'tab.open', 'tool.open'].includes(value)),
    path: z.literal('/').optional(),
    props: z.object({ feature: z.enum(FEATURES) }).strict()
        .refine(value => Buffer.byteLength(JSON.stringify(value), 'utf8') <= 1024).optional(),
    sessionHash: z.string().uuid(),
}).strict();

export async function track(req: Request, res: Response): Promise<void> {
    const parsed = TrackSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Evento inválido' }); return; }
    if (!prisma) { res.sendStatus(204); return; }
    try {
        await prisma.analyticsEvent.create({ data: {
            name: parsed.data.name, path: parsed.data.path, sessionHash: parsed.data.sessionHash,
            ...(parsed.data.props ? { props: parsed.data.props } : {}),
        } });
        res.status(202).json({ ok: true });
    } catch { res.status(503).json({ error: 'Analítica no disponible' }); }
}

export async function trackEvent(req: Request, res: Response): Promise<void> {
    const { event, section } = req.body as { event?: string; section?: string };
    req.body = { name: event, ...(section ? { props: { feature: section } } : {}), sessionHash: randomUUID() };
    await track(req, res);
}

export async function pruneAnalytics(): Promise<void> {
    if (!prisma) return;
    await prisma.analyticsEvent.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 180 * 86400_000) } } });
}

export async function getAnalyticsSummary(_req: Request, res: Response): Promise<void> {
    if (!prisma) { res.status(503).json({ error: 'Analítica no disponible' }); return; }
    try {
        const since7 = new Date(Date.now() - 7 * 86400_000);
        const since30 = new Date(Date.now() - 30 * 86400_000);
        const [week, month, features] = await Promise.all([
            prisma.analyticsEvent.groupBy({ by: ['name'], where: { createdAt: { gte: since7 } }, _count: { _all: true } }),
            prisma.analyticsEvent.groupBy({ by: ['name'], where: { createdAt: { gte: since30 } }, _count: { _all: true } }),
            prisma.$queryRaw<Array<{ feature: string; count: number }>>`
                SELECT props->>'feature' AS feature, count(*)::int AS count
                FROM "AnalyticsEvent" WHERE "createdAt" >= ${since30} AND props->>'feature' IS NOT NULL
                GROUP BY props->>'feature'
            `,
        ]);
        const counts = new Map(features.map(item => [item.feature, item.count]));
        const ranked = FEATURES.map(feature => ({ feature, count: counts.get(feature) ?? 0 }));
        res.json({
            days7: week.map(row => ({ name: row.name, count: row._count._all })),
            days30: month.map(row => ({ name: row.name, count: row._count._all })),
            topFeatures: [...ranked].sort((a, b) => b.count - a.count).slice(0, 10),
            leastUsed: [...ranked].sort((a, b) => a.count - b.count).slice(0, 10),
        });
    } catch { res.status(503).json({ error: 'Analítica no disponible' }); }
}
