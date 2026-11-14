import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/db';
import { ROUTE_IDS } from '../services/netArbitrage';
import { summarizeHistory } from '../services/ruloHistory';

const schema = z.object({
    route: z.string().refine(value => ROUTE_IDS.includes(value)),
    days: z.coerce.number().refine(value => [7, 30, 90, 365].includes(value)),
});

export async function getRuloHistory(req: Request, res: Response): Promise<void> {
    const query = schema.safeParse(req.query);
    if (!query.success) { res.status(400).json({ error: 'Ruta o período inválido' }); return; }
    if (!prisma) { res.status(503).json({ error: 'Historial no disponible' }); return; }
    try {
        const points = await prisma.ruloSnapshot.findMany({
            where: { routeId: query.data.route, timestamp: { gte: new Date(Date.now() - query.data.days * 86400_000) } },
            orderBy: { timestamp: 'asc' }, select: { timestamp: true, grossPct: true, netPct: true },
        });
        res.json({ route: query.data.route, points, summary: summarizeHistory(points, query.data.days),
            source: 'estimado', isEstimated: true });
    } catch { res.status(503).json({ error: 'Historial no disponible' }); }
}
