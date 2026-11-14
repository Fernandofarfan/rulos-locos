jest.mock('../src/utils/db', () => ({ __esModule: true, default: null, databaseConfigured: false }));

import request from 'supertest';
import app from '../src/app';
import { signToken } from '../src/middleware/auth';
import cache from '../src/utils/cache';
import * as spreadHistory from '../src/utils/spreadHistory';
import arbitrageService from '../src/services/arbitrageService';
import arbitrageWorker from '../src/workers/arbitrageWorker';
import marketWorker from '../src/workers/marketWorker';
import alertWorker from '../src/workers/alertWorker';
import { recordRuloSnapshots } from '../src/services/ruloHistory';
import { pruneAnalytics } from '../src/controllers/analyticsController';

const originalEnv = {
    CRON_SECRET: process.env.CRON_SECRET,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
};
const snapshot = {
    dolares: { blue: null, mep: null, ccl: null, oficial: null },
    cryptos: {}, opportunities: [], timestamp: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret';
    process.env.TELEGRAM_BOT_TOKEN = '';
    process.env.TELEGRAM_CHAT_ID = '';
    jest.spyOn(arbitrageService, 'calculateArbitrage').mockResolvedValue(snapshot);
    jest.spyOn(marketWorker, 'runTask').mockResolvedValue();
    jest.spyOn(cache, 'setShared').mockResolvedValue();
    jest.spyOn(spreadHistory, 'ensureLoaded').mockResolvedValue();
    jest.spyOn(spreadHistory, 'appendResult').mockResolvedValue();
});
afterEach(() => { jest.restoreAllMocks(); });
afterAll(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
});

it('silently drops valid analytics while DB-dependent user endpoints respond 503', async () => {
    await request(app).post('/api/analytics/track').send({
        name: 'tool.open', path: '/', sessionHash: '5cd09afa-7cdd-4df3-92aa-079b46113285', props: { feature: 'uva' },
    }).expect(204);
    await request(app).post('/api/analytics/track').send({ name: 'bad event' }).expect(400);
    await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'password123' }).expect(503);
    await request(app).get('/api/arbitrage/history?route=mep-usdt&days=30').expect(503);
    const token = signToken({ id: 'test-user', email: 'test@example.com' }, '15m');
    await request(app).get('/api/portfolio/valuation').set('Authorization', `Bearer ${token}`).expect(503);
});

it('warms public arbitrage data while marking database work and alerts skipped', async () => {
    expect(await arbitrageWorker.runTask()).toBe('skipped');
    expect(cache.setShared).toHaveBeenCalledWith('arbitrage_data', snapshot, expect.any(Number));
    expect(await alertWorker.runTask()).toBe('skipped');
    await expect(recordRuloSnapshots(snapshot)).resolves.toBeUndefined();
    await expect(pruneAnalytics()).resolves.toBeUndefined();
    const response = await request(app).post('/api/cron/tick').set('Authorization', 'Bearer test-cron-secret').expect(200);
    expect(response.body).toMatchObject({ ok: true, results: { arbitrage: 'skipped', market: 'fulfilled', alerts: 'skipped' } });
});

it('still returns 500 if a non-database cron task rejects', async () => {
    jest.mocked(marketWorker.runTask).mockRejectedValueOnce(new Error('market failed'));
    const response = await request(app).post('/api/cron/tick').set('Authorization', 'Bearer test-cron-secret').expect(500);
    expect(response.body).toMatchObject({ ok: false, results: { arbitrage: 'skipped', market: 'rejected', alerts: 'skipped' },
        errors: { market: 'market failed' } });
});
