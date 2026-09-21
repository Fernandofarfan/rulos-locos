import express from 'express';
import logger from '../utils/logger';
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
import { authenticateToken, requireAdmin, requireAdminOrCron } from '../middleware/auth';
import { swrCache } from '../utils/swr-cache';
import { rateLimiters } from '../middleware/rateLimiters';
import exchangeExtendedController from '../controllers/exchangeExtendedController';
import * as pushController from '../controllers/pushController';
import { aiController } from '../controllers/aiController';
import virtualTradingController from '../controllers/virtualTradingController';
import exchangeController from '../controllers/exchangeController';
import { getApiStatus } from '../controllers/statusController';
import { getDailySummary, sendDailySummary } from '../controllers/dailySummaryController';
import { trackEvent, getAnalyticsSummary } from '../controllers/analyticsController';
import { sendWeeklyNewsletter, previewNewsletter } from '../controllers/weeklyNewsletterController';
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
router.post('/ai/chart-insight', rateLimiters.normal, validate.validateBody(validate.ChartInsightSchema), (req, res) => aiController.getChartInsight(req, res));
router.get('/ai/rulo-del-dia', swr5m, (req, res) => aiController.getRuloDelDia(req, res));

// Mejor Rulo del momento
router.get('/arbitrage/best-rulo', swr30s, (req, res) => arbitrageController.getBestRulo(req, res));

// Estado de servicios externos
router.get('/status', (req, res) => getApiStatus(req, res));

// Portfolio (requiere JWT)
router.get('/portfolio', authenticateToken, rateLimiters.normal, (req, res) => portfolioController.list(req as any, res));
router.post('/portfolio', authenticateToken, rateLimiters.normal, validate.validateBody(validate.PortfolioCreateSchema), (req, res) => portfolioController.create(req as any, res));
router.delete('/portfolio/:id', authenticateToken, rateLimiters.normal, (req, res) => portfolioController.remove(req as any, res));
router.get('/portfolio/stats', authenticateToken, rateLimiters.fast, (req, res) => portfolioController.stats(req as any, res));
router.get('/portfolio/export/json', authenticateToken, rateLimiters.fast, (req, res) => portfolioController.exportJSON(req as any, res));
router.get('/portfolio/export/csv', authenticateToken, rateLimiters.fast, (req, res) => portfolioController.exportCSV(req as any, res));
router.post('/portfolio/import/json', authenticateToken, rateLimiters.normal, (req, res) => portfolioController.importJSON(req as any, res));
router.post('/portfolio/import/csv', authenticateToken, rateLimiters.normal, (req, res) => portfolioController.importCSV(req as any, res));
router.post('/portfolio/sync', authenticateToken, rateLimiters.normal, (req: any, res) => exchangeExtendedController.syncPortfolio(req, res));

// Alerts (requiere JWT)
router.get('/alerts', authenticateToken, rateLimiters.fast, (req, res) => alertController.list(req as any, res));
router.post('/alerts', authenticateToken, rateLimiters.normal, validate.validateBody(validate.AlertCreateSchema), (req, res) => alertController.create(req as any, res));
router.patch('/alerts/:id', authenticateToken, rateLimiters.normal, (req, res) => alertController.update(req as any, res));
router.delete('/alerts/:id', authenticateToken, rateLimiters.normal, (req, res) => alertController.delete(req as any, res));
router.post('/alerts/:id/test', authenticateToken, rateLimiters.strict, (req, res) => alertController.test(req as any, res));

// Paper Trading (requiere JWT)
router.get('/paper-trading/balance', authenticateToken, (req, res) => virtualTradingController.initBalance(req as any, res));
router.post('/paper-trading/trade', authenticateToken, rateLimiters.normal, validate.validateBody(validate.PaperTradeSchema), (req, res) => virtualTradingController.trade(req as any, res));

// API Keys Externas (requiere JWT)
router.get('/exchange-keys', authenticateToken, (req, res) => exchangeController.listKeys(req as any, res));
router.post('/exchange-keys', authenticateToken, rateLimiters.normal, validate.validateBody(validate.ExchangeKeySchema), (req, res) => exchangeController.addKey(req as any, res));
router.delete('/exchange-keys/:id', authenticateToken, (req, res) => exchangeController.removeKey(req as any, res));

// Push Notifications PWA
router.get('/push/vapid-public-key', (req, res) => pushController.getVapidPublicKey(req, res));
router.post('/push/subscribe', authenticateToken, rateLimiters.strict, validate.validateBody(validate.PushSubscribeSchema), (req, res) => pushController.subscribe(req as any, res));
router.delete('/push/unsubscribe', authenticateToken, rateLimiters.strict, (req, res) => pushController.unsubscribe(req as any, res));

router.get('/health', (_req, res) => res.json({ status: 'ok', version: '3.0.0' }));

// Resumen diario (Telegram)
router.get('/daily-summary', (req, res) => getDailySummary(req, res));
router.post('/daily-summary/send', requireAdminOrCron, (req, res) => sendDailySummary(req, res));

// Analytics
router.post('/analytics/event', rateLimiters.fast, validate.validateBody(validate.AnalyticsEventSchema), (req, res) => trackEvent(req, res));
router.get('/analytics/summary', (req, res) => getAnalyticsSummary(req, res));

// Newsletter
router.post('/newsletter/send', authenticateToken, requireAdmin, (req, res) => sendWeeklyNewsletter(req, res));
router.get('/newsletter/preview', (req, res) => previewNewsletter(req, res));

// Web Vitals
router.post('/analytics/vitals', rateLimiters.fast, (req, res) => {
    const { metric, value, page } = req.body;
    if (!metric) { res.status(400).json({ error: 'Missing metric' }); return; }
    logger.info('[WebVital] %s: %sms (%s)', metric, value, page || '/');
    res.json({ ok: true });
});

// SSE — Server-Sent Events for live rates (singleton broadcaster)
import { sseBroadcaster } from '../utils/sse-broadcaster';
router.get('/sse/rates', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    res.write('data: {"connected":true}\n\n');

    sseBroadcaster.addClient(res);

    req.on('close', () => {
        sseBroadcaster.removeClient(res);
    });
});

// Telegram Bot Webhook
router.post('/telegram/webhook', (req, res) => telegramBotController.handleWebhook(req, res));
router.post('/telegram/register-webhook', authenticateToken, requireAdmin, (req, res) => telegramBotController.registerWebhook(req, res));

// Webhooks CRUD
router.post('/webhooks', authenticateToken, requireAdmin, (req, res) => registerWebhook(req, res));
router.get('/webhooks', authenticateToken, requireAdmin, (req, res) => listWebhooks(req, res));
router.delete('/webhooks/:id', authenticateToken, requireAdmin, (req, res) => deleteWebhook(req, res));

// Dynamic OG Image
router.get('/og-image', (req, res) => getOGImage(req, res));

// Obligaciones Negociables y FCI Ranking
import onsFciController from '../controllers/onsFciController';
router.get('/economics/ons', swr60s, (req, res) => onsFciController.getONs(req, res));
router.get('/economics/fci-ranking', swr60s, (req, res) => onsFciController.getFCIRanking(req, res));
router.get('/economics/renta-fija', swr60s, (req, res) => onsFciController.getRentaFija(req, res));

// Exchange real connection
router.get('/exchange/:name/balance', authenticateToken, rateLimiters.normal, (req: any, res) => exchangeExtendedController.getBalance(req, res));
router.get('/exchange/:name/validate', authenticateToken, rateLimiters.fast, (req: any, res) => exchangeExtendedController.validateKeys(req, res));
router.get('/exchange/prices/:symbol', rateLimiters.normal, (req, res) => exchangeExtendedController.getPrices(req, res));

// Paper Trading tier limits (usage tracking)
router.get('/paper-trading/usage', authenticateToken, rateLimiters.fast, (req: any, res) => exchangeExtendedController.getUsage(req, res));

// Newsletter via email
router.post('/newsletter/subscribe', rateLimiters.strict, validate.validateBody(validate.NewsletterSubscribeSchema), (req, res) => exchangeExtendedController.subscribeNewsletter(req, res));

export default router;
