import { Request, Response } from 'express';
import logger from '../utils/logger';

// In-memory analytics store (in production, use DB)
interface AnalyticsEvent {
    event: string;
    section?: string;
    timestamp: string;
    ua?: string;
}

const events: AnalyticsEvent[] = [];
const MAX_EVENTS = 10000;

/**
 * POST /api/analytics/event — Track an anonymous user event.
 */
export async function trackEvent(req: Request, res: Response) {
    try {
        const { event, section } = req.body;
        if (!event || typeof event !== 'string') {
            res.status(400).json({ error: 'Missing event field' });
            return;
        }

        const entry: AnalyticsEvent = {
            event: event.slice(0, 50),
            section: section?.slice(0, 50),
            timestamp: new Date().toISOString(),
            ua: (req.headers['user-agent'] || '').slice(0, 100),
        };

        events.push(entry);
        if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);

        res.json({ ok: true });
    } catch (error: any) {
        logger.error('Analytics trackEvent error: %s', error.message);
        res.status(500).json({ error: 'Error tracking event' });
    }
}

/**
 * GET /api/analytics/summary — Get aggregated analytics.
 */
export async function getAnalyticsSummary(_req: Request, res: Response) {
    try {
        const now = Date.now();
        const last24h = events.filter(e => now - new Date(e.timestamp).getTime() < 86400000);

        // Aggregate by section
        const sectionCounts: Record<string, number> = {};
        const eventCounts: Record<string, number> = {};

        last24h.forEach(e => {
            if (e.section) sectionCounts[e.section] = (sectionCounts[e.section] || 0) + 1;
            eventCounts[e.event] = (eventCounts[e.event] || 0) + 1;
        });

        res.json({
            totalEvents: events.length,
            last24h: last24h.length,
            topSections: Object.entries(sectionCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([section, count]) => ({ section, count })),
            topEvents: Object.entries(eventCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([event, count]) => ({ event, count })),
        });
    } catch (error: any) {
        logger.error('Analytics summary error: %s', error.message);
        res.status(500).json({ error: 'Error generating summary' });
    }
}
