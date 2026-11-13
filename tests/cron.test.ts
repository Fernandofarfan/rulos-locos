jest.mock('../src/workers/arbitrageWorker', () => ({ __esModule: true, default: { runTask: jest.fn().mockResolvedValue(undefined) } }));
jest.mock('../src/workers/marketWorker', () => ({ __esModule: true, default: { runTask: jest.fn().mockResolvedValue(undefined) } }));
jest.mock('../src/workers/alertWorker', () => ({ __esModule: true, default: { runTask: jest.fn().mockResolvedValue(undefined) } }));

import request from 'supertest';
import app from '../src/app';
import alertWorker from '../src/workers/alertWorker';

describe('/api/cron/tick', () => {
    const oldSecret = process.env.CRON_SECRET;
    beforeAll(() => { process.env.CRON_SECRET = 'test-cron-secret'; });
    afterAll(() => {
        if (oldSecret === undefined) delete process.env.CRON_SECRET;
        else process.env.CRON_SECRET = oldSecret;
    });
    it('rejects missing and wrong tokens', async () => {
        await request(app).post('/api/cron/tick').expect(401);
        await request(app).post('/api/cron/tick').set('Authorization', 'Bearer wrong').expect(401);
    });
    it('runs all workers with the secret', async () => {
        const response = await request(app).post('/api/cron/tick').set('Authorization', 'Bearer test-cron-secret').expect(200);
        expect(response.body).toMatchObject({ ok: true, results: { arbitrage: 'fulfilled', market: 'fulfilled', alerts: 'fulfilled' } });
    });
    it('reports worker failures', async () => {
        jest.mocked(alertWorker.runTask).mockRejectedValueOnce(new Error('failure'));
        const response = await request(app).post('/api/cron/tick').set('Authorization', 'Bearer test-cron-secret').expect(200);
        expect(response.body).toMatchObject({ ok: false, results: { alerts: 'rejected' } });
    });
});
