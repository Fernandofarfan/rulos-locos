import { Request, Response } from 'express';
import { z } from 'zod';
import { parseFeeOverride, referenceFees } from '../config/fees';
import arbitrageService, { type ArbitrageResult } from '../services/arbitrageService';
import { calculateRoutes } from '../services/netArbitrage';
import cache from '../utils/cache';

const querySchema = z.object({
    capital: z.coerce.number().finite().min(10_000).max(10_000_000_000).default(1_000_000),
    fees: z.string().optional(),
});

export async function getNetArbitrage(req: Request, res: Response): Promise<void> {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) { res.status(400).json({ error: 'Capital o comisiones inválidas' }); return; }
    let overrides;
    try { overrides = parseFeeOverride(parsed.data.fees); }
    catch { res.status(400).json({ error: 'Comisiones inválidas' }); return; }
    try {
        let result = await cache.get<ArbitrageResult>('arbitrage_data');
        if (!result) {
            result = await arbitrageService.calculateArbitrage();
            cache.set('arbitrage_data', result, 60_000);
        }
        res.json({ capitalArs: parsed.data.capital, referenceFees, overrides, routes: calculateRoutes(result, parsed.data.capital, overrides),
            source: 'estimado', isEstimated: true, updatedAt: result.timestamp });
    } catch {
        res.status(503).json({ error: 'No se pudieron calcular los rulos' });
    }
}
