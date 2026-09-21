/**
 * Vercel Cron Job — Resumen Diario
 * Se ejecuta a las 9:00 AM hora Argentina (12:00 UTC).
 * Configurado en vercel.json → crons.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow invocation from Vercel Cron
    const authHeader = req.headers.authorization;
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Resolve the canonical deployment URL. VERCEL_PROJECT_PRODUCTION_URL
        // points to the stable production domain when available.
        const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
        const baseUrl = host ? `https://${host}` : 'http://localhost:3001';

        const response = await fetch(`${baseUrl}/api/daily-summary/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // El endpoint acepta el CRON_SECRET como Bearer token
                'Authorization': `Bearer ${process.env.CRON_SECRET}`,
            },
        });

        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({ success: false, ...data });
        }
        return res.status(200).json({ success: true, ...data });
    } catch (error: any) {
        console.error('Cron daily-summary error:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
