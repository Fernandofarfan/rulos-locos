import express from 'express';
import rateController from '../controllers/rateController';
import platformController from '../controllers/platformController';
import bondController from '../controllers/bondController';
import { getBondsLive } from '../controllers/bondsController';
import arbitrageController from '../controllers/arbitrageController';
import dataController from '../controllers/dataController';
import economicsController from '../controllers/economicsController';
import notificationController from '../controllers/notificationController';
import portfolioController from '../controllers/portfolioController';
import alertController from '../controllers/alertController';
import { getRofexContracts } from '../controllers/rofexController';
import * as validate from '../middleware/validate';
import { authenticateToken } from '../middleware/auth';
import { swrCache } from '../utils/swr-cache';
import { rateLimiters } from '../middleware/rateLimiters';
import PortfolioSyncService from '../utils/ccxtSync';
import * as pushController from '../controllers/pushController';
import { aiController } from '../controllers/aiController';
import virtualTradingController from '../controllers/virtualTradingController';
import exchangeController from '../controllers/exchangeController';
import { getApiStatus } from '../controllers/statusController';
import { getDailySummary, sendDailySummary } from '../controllers/dailySummaryController';
import { trackEvent, getAnalyticsSummary } from '../controllers/analyticsController';
import { sendWeeklyNewsletter, previewNewsletter } from '../controllers/weeklyNewsletterController';
import dolarApiService from '../services/dolarApiService';
import { telegramBotController } from '../controllers/telegramBotController';
import { registerWebhook, listWebhooks, deleteWebhook } from '../controllers/webhookController';
import { getOGImage } from '../controllers/ogImageController';

// SWR presets
const swr30s = swrCache({ staleTTL: 30_000, maxTTL: 5 * 60_000 });
const swr60s = swrCache({ staleTTL: 60_000, maxTTL: 10 * 60_000 });
const swr5m = swrCache({ staleTTL: 5 * 60_000, maxTTL: 30 * 60_000 });

const router = express.Router();

router.get('/rate', swr30s, (req, res) => rateController.getRate(req, res));
router.get('/platforms', (req, res) => platformController.getPlatforms(req, res));
router.get('/bonds', swr5m, (req, res) => bondController.getBonds(req, res));
router.get('/bonds/live', swr30s, (req, res) => getBondsLive(req, res));
router.get('/arbitrage', swr30s, (req, res) => arbitrageController.getArbitrage(req, res));

router.get('/economics/dashboard', swr60s, (req, res) => economicsController.getDashboardData(req, res));
router.get('/economics/historical', validate.rangeQuery, (req, res) => economicsController.getHistoricalData(req, res));
router.get('/economics/historical/:indicator', validate.indicatorParam, validate.rangeQuery, (req, res) => economicsController.getHistoricalData(req, res));
router.get('/economics/market', swr60s, (req, res) => economicsController.getMarketData(req, res));
router.get('/economics/news', swr5m, (req, res) => economicsController.getNews(req, res));
router.get('/economics/rates', swr60s, (req, res) => economicsController.getRates(req, res));
router.get('/economics/yield-curve', swr5m, (req, res) => economicsController.getYieldCurve(req, res));
router.get('/economics/rofex', swr60s, (req, res) => getRofexContracts(req, res));
router.get('/economics/uva', (req, res) => economicsController.getUVA(req, res));
router.get('/economics/reservas', (req, res) => economicsController.getReservas(req, res));
router.get('/economics/carry-trade', (req, res) => economicsController.getCarryTradeData(req, res));
router.get('/economics/equilibrium', (req, res) => economicsController.getEquilibriumDollar(req, res));
router.get('/economics/holidays', (req, res) => economicsController.getHolidays(req, res));
router.get('/economics/calendar', (req, res) => economicsController.getCalendarEvents(req, res));
router.get('/economics/plazo-fijo-bancos', (req, res) => economicsController.getPlazoFijo(req, res));
router.get('/economics/fci', (req, res) => economicsController.getFCI(req, res));

router.get('/server/metals', (req, res) => dataController.getMetals(req, res));
router.get('/server/stocks', (req, res) => dataController.getStocks(req, res));
router.get('/server/indicators', (req, res) => dataController.getIndicators(req, res));
router.get('/server/commodities', (req, res) => dataController.getCommodities(req, res));

router.post('/notifications/test', validate.testBody, (req, res) => notificationController.testTelegram(req, res));
router.post('/notifications/alert', validate.alertBody, (req, res) => notificationController.sendPriceAlert(req, res));

// Inteligencia Artificial (Gemini)
router.get('/ai/insight', swr5m, (req, res) => aiController.getInsight(req, res));
router.post('/ai/chart-insight', (req, res) => aiController.getChartInsight(req, res));
router.get('/ai/rulo-del-dia', swr5m, (req, res) => aiController.getRuloDelDia(req, res));

// Mejor Rulo del momento
router.get('/arbitrage/best-rulo', swr30s, (req, res) => arbitrageController.getBestRulo(req, res));

// Estado de servicios externos
router.get('/status', (req, res) => getApiStatus(req, res));

// Portfolio (requiere JWT)
router.get('/portfolio', authenticateToken, rateLimiters.normal, (req, res) => portfolioController.list(req as any, res));
router.post('/portfolio', authenticateToken, rateLimiters.normal, (req, res) => portfolioController.create(req as any, res));
router.delete('/portfolio/:id', authenticateToken, rateLimiters.normal, (req, res) => portfolioController.remove(req as any, res));
router.get('/portfolio/stats', authenticateToken, rateLimiters.fast, (req, res) => portfolioController.stats(req as any, res));
router.get('/portfolio/export/json', authenticateToken, rateLimiters.fast, (req, res) => portfolioController.exportJSON(req as any, res));
router.get('/portfolio/export/csv', authenticateToken, rateLimiters.fast, (req, res) => portfolioController.exportCSV(req as any, res));
router.post('/portfolio/import/json', authenticateToken, rateLimiters.normal, (req, res) => portfolioController.importJSON(req as any, res));
router.post('/portfolio/import/csv', authenticateToken, rateLimiters.normal, (req, res) => portfolioController.importCSV(req as any, res));
router.post('/portfolio/sync', authenticateToken, async (req: any, res) => {
    try {
        await PortfolioSyncService.syncUserPortfolio(req.user.id);
        res.json({ success: true, message: 'Portfolio synchronizado' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Alerts (requiere JWT)
router.get('/alerts', authenticateToken, rateLimiters.fast, (req, res) => alertController.list(req as any, res));
router.post('/alerts', authenticateToken, rateLimiters.normal, (req, res) => alertController.create(req as any, res));
router.patch('/alerts/:id', authenticateToken, rateLimiters.normal, (req, res) => alertController.update(req as any, res));
router.delete('/alerts/:id', authenticateToken, rateLimiters.normal, (req, res) => alertController.delete(req as any, res));
router.post('/alerts/:id/test', authenticateToken, rateLimiters.strict, (req, res) => alertController.test(req as any, res));

// Paper Trading (requiere JWT)
router.get('/paper-trading/balance', authenticateToken, (req, res) => virtualTradingController.initBalance(req as any, res));
router.post('/paper-trading/trade', authenticateToken, (req, res) => virtualTradingController.trade(req as any, res));

// API Keys Externas (requiere JWT)
router.get('/exchange-keys', authenticateToken, (req, res) => exchangeController.listKeys(req as any, res));
router.post('/exchange-keys', authenticateToken, (req, res) => exchangeController.addKey(req as any, res));
router.delete('/exchange-keys/:id', authenticateToken, (req, res) => exchangeController.removeKey(req as any, res));

// Push Notifications PWA
router.get('/push/vapid-public-key', (req, res) => pushController.getVapidPublicKey(req, res));
router.post('/push/subscribe', (req, res) => pushController.subscribe(req, res));
router.delete('/push/unsubscribe', (req, res) => pushController.unsubscribe(req, res));

router.get('/health', (_req, res) => res.json({ status: 'ok', version: '3.0.0' }));

// Resumen diario (Telegram)
router.get('/daily-summary', (req, res) => getDailySummary(req, res));
router.post('/daily-summary/send', (req, res) => sendDailySummary(req, res));

// Analytics
router.post('/analytics/event', (req, res) => trackEvent(req, res));
router.get('/analytics/summary', (req, res) => getAnalyticsSummary(req, res));

// Newsletter
router.post('/newsletter/send', (req, res) => sendWeeklyNewsletter(req, res));
router.get('/newsletter/preview', (req, res) => previewNewsletter(req, res));

// Web Vitals
router.post('/analytics/vitals', (req, res) => {
    const { metric, value, page } = req.body;
    if (!metric) { res.status(400).json({ error: 'Missing metric' }); return; }
    // In production, store these in DB. For now, log.
    console.log(`[WebVital] ${metric}: ${value}ms (${page || '/'})`);
    res.json({ ok: true });
});

// SSE — Server-Sent Events for live rates
router.get('/sse/rates', async (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    res.write('data: {"connected":true}\n\n');

    const sendRates = async () => {
        try {
            const rates = await dolarApiService.getAllDollars();
            const blue = rates.find((r: any) => r.casa === 'blue');
            const mep = rates.find((r: any) => r.casa === 'bolsa');
            res.write(`data: ${JSON.stringify({ blue: blue?.venta, mep: mep?.venta, ts: Date.now() })}\n\n`);
        } catch { /* ignore */ }
    };

    await sendRates();
    const interval = setInterval(sendRates, 30000);

    req.on('close', () => {
        clearInterval(interval);
        res.end();
    });
});

// Telegram Bot Webhook
router.post('/telegram/webhook', (req, res) => telegramBotController.handleWebhook(req, res));
router.post('/telegram/register-webhook', (req, res) => telegramBotController.registerWebhook(req, res));

// Webhooks CRUD
router.post('/webhooks', (req, res) => registerWebhook(req, res));
router.get('/webhooks', (req, res) => listWebhooks(req, res));
router.delete('/webhooks/:id', (req, res) => deleteWebhook(req, res));

// Dynamic OG Image
router.get('/og-image', (req, res) => getOGImage(req, res));

export default router;
