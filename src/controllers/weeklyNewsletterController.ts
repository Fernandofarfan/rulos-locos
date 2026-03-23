import { Request, Response } from 'express';
import { sendEmail } from '../services/emailService';
import dolarApiService from '../services/dolarApiService';
import cryptoYaService from '../services/cryptoYaService';
import bcraService from '../services/bcraService';
import logger from '../utils/logger';

/**
 * Genera un email HTML con el resumen semanal del mercado.
 */
async function buildWeeklyHTML(): Promise<string> {
    const [dolares, crypto, reservas] = await Promise.allSettled([
        dolarApiService.getAllDollars(),
        cryptoYaService.getBinanceP2P(),
        bcraService.getReserves(),
    ]);

    let bluePrice = '—', mepPrice = '—', cclPrice = '—';
    if (dolares.status === 'fulfilled' && dolares.value) {
        dolares.value.forEach((d: any) => {
            if (d.casa === 'blue') bluePrice = `$${d.venta}`;
            if (d.casa === 'bolsa') mepPrice = `$${d.venta}`;
            if (d.casa === 'contadoconliqui') cclPrice = `$${d.venta}`;
        });
    }

    const usdtPrice = crypto.status === 'fulfilled' && crypto.value ? `$${crypto.value.ask}` : '—';
    const reservasVal = reservas.status === 'fulfilled' && reservas.value ? `USD ${reservas.value.toLocaleString('es-AR')} M` : '—';

    const now = new Date();
    const weekStr = `Semana del ${now.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}`;

    return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0b0e14;font-family:'Inter',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:20px auto;background:#111827;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.05);">
        <tr><td style="padding:32px 24px;background:linear-gradient(135deg,#1e3a5f,#0f172a);text-align:center;">
            <h1 style="margin:0;color:#f1f5f9;font-size:24px;">⚡ Rulos Locos</h1>
            <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">${weekStr}</p>
        </td></tr>
        <tr><td style="padding:24px;">
            <h2 style="color:#f1f5f9;font-size:16px;margin:0 0 16px;">📊 Cotizaciones al cierre</h2>
            <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
                <tr style="background:rgba(59,130,246,0.1);border-radius:8px;">
                    <td style="color:#94a3b8;font-size:12px;font-weight:700;">DÓLAR BLUE</td>
                    <td style="color:#3b82f6;font-size:20px;font-weight:800;text-align:right;font-family:monospace;">${bluePrice}</td>
                </tr>
                <tr>
                    <td style="color:#94a3b8;font-size:12px;font-weight:700;">DÓLAR MEP</td>
                    <td style="color:#8b5cf6;font-size:20px;font-weight:800;text-align:right;font-family:monospace;">${mepPrice}</td>
                </tr>
                <tr style="background:rgba(16,185,129,0.05);">
                    <td style="color:#94a3b8;font-size:12px;font-weight:700;">DÓLAR CCL</td>
                    <td style="color:#10b981;font-size:20px;font-weight:800;text-align:right;font-family:monospace;">${cclPrice}</td>
                </tr>
                <tr>
                    <td style="color:#94a3b8;font-size:12px;font-weight:700;">USDT/ARS</td>
                    <td style="color:#f59e0b;font-size:20px;font-weight:800;text-align:right;font-family:monospace;">${usdtPrice}</td>
                </tr>
                <tr style="background:rgba(255,255,255,0.02);">
                    <td style="color:#94a3b8;font-size:12px;font-weight:700;">RESERVAS BCRA</td>
                    <td style="color:#f1f5f9;font-size:14px;font-weight:600;text-align:right;font-family:monospace;">${reservasVal}</td>
                </tr>
            </table>
        </td></tr>
        <tr><td style="padding:16px 24px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
            <a href="https://rulos-locos.vercel.app" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:700;">Ver Dashboard Completo →</a>
        </td></tr>
        <tr><td style="padding:16px;text-align:center;color:#475569;font-size:10px;">
            <em>Rulos Locos — Dashboard Financiero Argentino</em>
        </td></tr>
    </table>
</body>
</html>`;
}

/**
 * POST /api/newsletter/send — Enviar newsletter semanal.
 */
export async function sendWeeklyNewsletter(req: Request, res: Response) {
    try {
        const { email } = req.body;
        if (!email || typeof email !== 'string') {
            res.status(400).json({ error: 'Email requerido' });
            return;
        }

        const html = await buildWeeklyHTML();
        await sendEmail({ to: email, subject: '📊 Resumen Semanal — Rulos Locos', html });
        logger.info('Newsletter semanal enviada a %s', email);
        res.json({ success: true, message: 'Newsletter enviada' });
    } catch (error: any) {
        logger.error('Newsletter error: %s', error.message);
        res.status(500).json({ error: 'Error enviando newsletter' });
    }
}

/**
 * GET /api/newsletter/preview — Preview HTML del newsletter.
 */
export async function previewNewsletter(_req: Request, res: Response) {
    try {
        const html = await buildWeeklyHTML();
        res.type('html').send(html);
    } catch (error: any) {
        logger.error('Newsletter preview error: %s', error.message);
        res.status(500).json({ error: 'Error generando preview' });
    }
}
