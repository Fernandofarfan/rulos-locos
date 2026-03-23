import { Request, Response } from 'express';
import logger from '../utils/logger';

const STORAGE_KEY = 'webhooks';

interface WebhookConfig {
    id: string;
    url: string;
    events: string[];
    active: boolean;
    createdAt: string;
}

// In-memory webhook store (in production use DB)
const webhooks: WebhookConfig[] = [];

/**
 * POST /api/webhooks — Register a new webhook URL.
 * Body: { url: string, events: string[] }
 * Events: 'price_alert', 'daily_summary', 'rulo_detected', 'market_crash'
 */
export async function registerWebhook(req: Request, res: Response) {
    try {
        const { url, events } = req.body;
        if (!url || !events?.length) {
            res.status(400).json({ error: 'URL and events required' });
            return;
        }

        // Validate URL
        try { new URL(url); } catch {
            res.status(400).json({ error: 'Invalid URL' });
            return;
        }

        const validEvents = ['price_alert', 'daily_summary', 'rulo_detected', 'market_crash'];
        const filtered = events.filter((e: string) => validEvents.includes(e));
        if (!filtered.length) {
            res.status(400).json({ error: `Invalid events. Valid: ${validEvents.join(', ')}` });
            return;
        }

        const config: WebhookConfig = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            url,
            events: filtered,
            active: true,
            createdAt: new Date().toISOString(),
        };

        webhooks.push(config);
        logger.info('Webhook registered: %s for events %s', url, filtered.join(','));
        res.json({ success: true, webhook: config });
    } catch (error: any) {
        logger.error('Webhook register error: %s', error.message);
        res.status(500).json({ error: 'Error registering webhook' });
    }
}

/**
 * GET /api/webhooks — List all registered webhooks.
 */
export async function listWebhooks(_req: Request, res: Response) {
    res.json({ webhooks, count: webhooks.length });
}

/**
 * DELETE /api/webhooks/:id — Remove a webhook.
 */
export async function deleteWebhook(req: Request, res: Response) {
    const idx = webhooks.findIndex(w => w.id === req.params.id);
    if (idx === -1) { res.status(404).json({ error: 'Webhook not found' }); return; }
    webhooks.splice(idx, 1);
    res.json({ success: true });
}

/**
 * Dispatch an event to all webhooks listening for it.
 */
export async function dispatchWebhookEvent(event: string, data: any) {
    const targets = webhooks.filter(w => w.active && w.events.includes(event));

    for (const wh of targets) {
        try {
            await fetch(wh.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Rulos-Event': event },
                body: JSON.stringify({ event, data, timestamp: new Date().toISOString() }),
            });
        } catch (err: any) {
            logger.error('Webhook dispatch error [%s]: %s', wh.url, err.message);
        }
    }
}
