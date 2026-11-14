import { Request, Response } from 'express';
import dolarApiService from '../services/dolarApiService';
import cryptoYaService from '../services/cryptoYaService';
import bcraService from '../services/bcraService';
import notificationService from '../services/notificationService';
import { sendPriceAlertEmail } from '../services/emailService';
import prisma from '../utils/db';
import logger from '../utils/logger';

/**
 * Genera un resumen de mercado formateado para Telegram.
 */
async function buildSummary(): Promise<{ summary: string; source: string; isEstimated: boolean; sources: Record<string, { source: string; isEstimated: boolean }> }> {
    const [dolares, crypto, reservas] = await Promise.allSettled([
        dolarApiService.getAllDollars(),
        cryptoYaService.getBinanceP2P(),
        bcraService.getReservesWithSource(),
    ]);

    const lines: string[] = [
        `📊 <b>Resumen Diario — Rulos Locos</b>`,
        `📅 ${new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
        '',
    ];

    if (dolares.status === 'fulfilled' && dolares.value) {
        const d = dolares.value;
        const blue = d.find?.((x: any) => x.casa === 'blue');
        const mep = d.find?.((x: any) => x.casa === 'bolsa');
        const ccl = d.find?.((x: any) => x.casa === 'contadoconliqui');
        const oficial = d.find?.((x: any) => x.casa === 'oficial');

        lines.push('💵 <b>Cotizaciones Dólar</b>');
        if (blue) lines.push(`  • Blue: $${blue.venta} (C: $${blue.compra})`);
        if (mep) lines.push(`  • MEP: $${mep.venta}`);
        if (ccl) lines.push(`  • CCL: $${ccl.venta}`);
        if (oficial) lines.push(`  • Oficial: $${oficial.venta}`);
        lines.push('');
    }

    if (crypto.status === 'fulfilled' && crypto.value) {
        const c = crypto.value;
        lines.push(`⚡ <b>Cripto</b>`);
        lines.push(`  • USDT/ARS: $${c.totalAsk ?? c.ask ?? '—'}`);
        lines.push('');
    }

    if (reservas.status === 'fulfilled' && reservas.value) {
        const r = reservas.value;
        lines.push(`🏦 <b>Reservas</b>`);
        lines.push(`  • Reservas: USD ${r.value.toLocaleString('es-AR')} M`);
        lines.push('');
    }

    lines.push('🔗 <a href="https://rulos-locos.vercel.app">Ver Dashboard</a>');
    lines.push('<i>Generado automáticamente por Rulos Locos</i>');

    const sources = {
        dolares: {
            source: dolares.status === 'fulfilled' && !dolares.value.some(item => item.isEstimated) ? 'DolarAPI' : 'estimado',
            isEstimated: dolares.status !== 'fulfilled' || dolares.value.some(item => item.isEstimated === true),
        },
        crypto: {
            source: crypto.status === 'fulfilled' && !crypto.value.isFallback ? 'CriptoYa' : 'estimado',
            isEstimated: crypto.status !== 'fulfilled' || !!crypto.value.isFallback,
        },
        reservas: {
            source: reservas.status === 'fulfilled' && reservas.value ? reservas.value.source : 'estimado',
            isEstimated: reservas.status !== 'fulfilled' || !reservas.value,
        },
    };
    const isEstimated = Object.values(sources).some(item => item.isEstimated);
    return { summary: lines.join('\n'), sources, isEstimated, source: isEstimated ? 'estimado' : Object.values(sources).map(item => item.source).join(', ') };
}

/**
 * GET /api/daily-summary — Devuelve el texto del resumen.
 */
export async function getDailySummary(_req: Request, res: Response) {
    try {
        const result = await buildSummary();
        res.json({ ...result, timestamp: new Date().toISOString() });
    } catch (error: any) {
        logger.error('Error generando resumen diario: %s', error.message);
        res.status(500).json({ error: 'Error generando resumen' });
    }
}

/**
 * POST /api/daily-summary/send — Genera y envía resumen por Telegram.
 */
export async function sendDailySummary(_req: Request, res: Response) {
    try {
        const { summary } = await buildSummary();
        await notificationService.sendTelegramMessage(summary);
        logger.info('Resumen diario enviado por Telegram');

        if (prisma) {
            const users = await prisma.user.findMany({
                select: { email: true, name: true },
                take: 100,
            });
            const plainText = summary.replace(/<[^>]+>/g, '');
            let sent = 0;
            for (const user of users) {
                if (!user.email) continue;
                try {
                    await sendPriceAlertEmail({
                        to: user.email,
                        message: plainText,
                        prices: undefined,
                    });
                    sent++;
                } catch {
                    // skip failed emails
                }
            }
            logger.info('Newsletter enviada por email a %d usuarios', sent);
        }

        res.json({ success: true, message: 'Resumen enviado por Telegram y Email' });
    } catch (error: any) {
        logger.error('Error enviando resumen diario: %s', error.message);
        res.status(500).json({ error: 'Error enviando resumen' });
    }
}
