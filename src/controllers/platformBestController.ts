import { Request, Response } from 'express';
import { z } from 'zod';
import { referenceFees } from '../config/fees';
import dolarApiService from '../services/dolarApiService';
import config from '../config';

export interface PlatformQuote {
    platform: string; quote: number; finalPrice: number; totalArs: number;
    source: string; quoteSource: string; isEstimated: boolean; updatedAt?: string;
}

export function rankPlatforms(quotes: PlatformQuote[], side: 'buy' | 'sell'): PlatformQuote[] {
    return quotes.filter(q => Number.isFinite(q.finalPrice) && q.finalPrice > 0)
        .sort((a, b) => side === 'buy' ? a.finalPrice - b.finalPrice : b.finalPrice - a.finalPrice);
}

const schema = z.object({
    side: z.enum(['buy', 'sell']), asset: z.enum(['usdt', 'usd']),
    amount: z.coerce.number().finite().positive().max(100_000_000).default(1),
});

export async function getBestPlatforms(req: Request, res: Response): Promise<void> {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) { res.status(400).json({ error: 'Parámetros inválidos' }); return; }
    const { side, asset, amount } = parsed.data;
    try {
        let quotes: PlatformQuote[];
        if (asset === 'usd') {
            const dollars = await dolarApiService.getAllDollars();
            quotes = dollars.filter(d => ['oficial', 'blue', 'bolsa', 'contadoconliqui'].includes(d.casa)).map(d => {
                const quote = side === 'buy' ? d.venta : d.compra;
                const broker = ['bolsa', 'contadoconliqui'].includes(d.casa);
                const pct = broker ? (side === 'buy' ? referenceFees.brokerBuyPct : referenceFees.brokerSellPct) + referenceFees.marketRightsPct : referenceFees.bankTransferPct;
                const finalPrice = quote * (1 + (side === 'buy' ? pct : -pct) / 100);
                return { platform: d.nombre, quote, finalPrice, totalArs: finalPrice * amount,
                    source: 'estimado', quoteSource: d.source ?? 'DolarAPI', isEstimated: true, updatedAt: d.fechaActualizacion };
            });
        } else {
            const exchanges = ['binancep2p', 'ripio', 'buenbit', 'letsbit', 'lemoncash', 'satoshitango', 'fiwind'];
            const results = await Promise.allSettled(exchanges.map(async (platform): Promise<PlatformQuote> => {
                const response = await fetch(`${config.API_URLS.CRIPTOYA}/${platform}/USDT/ARS/${amount}`, {
                    headers: config.DEFAULT_HEADERS, signal: AbortSignal.timeout(5000),
                });
                if (!response.ok) throw new Error('Fuente no disponible');
                const data = await response.json() as { ask?: number; bid?: number; totalAsk?: number; totalBid?: number; time?: number };
                const quote = Number(side === 'buy' ? data.ask : data.bid);
                const total = Number(side === 'buy' ? data.totalAsk : data.totalBid);
                if (!Number.isFinite(quote) || quote <= 0) throw new Error('Cotización inválida');
                const included = Number.isFinite(total) && total > 0;
                const pct = platform === 'binancep2p' ? referenceFees.p2pPct : referenceFees.exchangeTradePct;
                const finalPrice = included ? total : quote * (1 + (side === 'buy' ? pct : -pct) / 100);
                return { platform, quote, finalPrice, totalArs: finalPrice * amount, source: included ? 'CriptoYa' : 'estimado',
                    quoteSource: 'CriptoYa', isEstimated: !included, updatedAt: data.time ? new Date(data.time * 1000).toISOString() : undefined };
            }));
            quotes = results.filter((r): r is PromiseFulfilledResult<PlatformQuote> => r.status === 'fulfilled').map(r => r.value);
        }
        const isEstimated = !quotes.length || quotes.some(q => q.isEstimated);
        res.json({ side, asset, amount, platforms: rankPlatforms(quotes, side), source: isEstimated ? 'estimado' : asset === 'usd' ? 'DolarAPI' : 'CriptoYa',
            isEstimated, updatedAt: new Date().toISOString() });
    } catch { res.status(503).json({ error: 'No se pudieron comparar las cotizaciones' }); }
}
