/**
 * Vercel Cron Job — Resumen Diario
 * Se ejecuta a las 9:00 AM hora Argentina (12:00 UTC).
 * Configurado en vercel.json → crons.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow invocation from Vercel Cron
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Call the daily summary endpoint on our own API
        const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3001';

        const response = await fetch(`${baseUrl}/api/daily-summary/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json();
        return res.status(200).json({ success: true, ...data });
    } catch (error: any) {
        console.error('Cron daily-summary error:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
