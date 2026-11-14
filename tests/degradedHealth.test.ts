let mockDatabaseConfigured = true;
let mockDatabase: { $queryRaw: jest.Mock } | null = { $queryRaw: jest.fn() };

jest.mock('../src/utils/db', () => ({
    __esModule: true,
    get default() { return mockDatabase; },
    get databaseConfigured() { return mockDatabaseConfigured; },
}));
jest.mock('../src/utils/cache', () => ({ getRedisClient: jest.fn() }));

import express from 'express';
import request from 'supertest';
import config from '../src/config';
import { getApiHealth, getHealth, getReady } from '../src/controllers/healthController';
import { getRedisClient } from '../src/utils/cache';

const app = express();
app.get('/api/health', getApiHealth);
app.get('/healthz', getHealth);
app.get('/readyz', getReady);

const oldRedis = process.env.REDIS_URL;
const oldEncryption = config.ENCRYPTION_AVAILABLE;

beforeEach(() => {
    jest.clearAllMocks();
    mockDatabase = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    mockDatabaseConfigured = true;
    config.ENCRYPTION_AVAILABLE = true;
    delete process.env.REDIS_URL;
});
afterAll(() => {
    if (oldRedis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = oldRedis;
    config.ENCRYPTION_AVAILABLE = oldEncryption;
});

it('reports missing DB and encryption as degraded liveness, while readiness fails', async () => {
    mockDatabase = null;
    mockDatabaseConfigured = false;
    config.ENCRYPTION_AVAILABLE = false;
    const response = await request(app).get('/api/health').expect(200);
    expect(response.body).toMatchObject({
        status: 'degraded',
        checks: { database: 'unconfigured', encryption: 'unavailable', redis: 'unconfigured' },
    });
    await request(app).get('/healthz').expect(200);
    await request(app).get('/readyz').expect(503);
});

it('reports healthy when the database works and Redis is unconfigured', async () => {
    const response = await request(app).get('/api/health').expect(200);
    expect(response.body).toMatchObject({ status: 'ok', checks: { database: 'ok', encryption: 'ok', redis: 'unconfigured' } });
    await request(app).get('/readyz').expect(200);
});

it('reports DB connection errors without failing liveness', async () => {
    mockDatabase!.$queryRaw.mockRejectedValue(new Error('unreachable'));
    const response = await request(app).get('/api/health').expect(200);
    expect(response.body).toMatchObject({ status: 'degraded', checks: { database: 'error' } });
    await request(app).get('/readyz').expect(503);
});

it('times out readiness when a configured database stalls', async () => {
    mockDatabase!.$queryRaw.mockReturnValue(new Promise(() => {}));
    const response = await request(app).get('/readyz').expect(503);
    expect(response.body).toEqual({ ready: false, reason: 'database_unavailable' });
});

it('reports Redis connection and ping status', async () => {
    process.env.REDIS_URL = 'redis://localhost:1';
    jest.mocked(getRedisClient).mockResolvedValueOnce(null);
    const unavailable = await request(app).get('/api/health').expect(200);
    expect(unavailable.body).toMatchObject({ status: 'degraded', checks: { redis: 'error' } });
    jest.mocked(getRedisClient).mockResolvedValueOnce({ ping: jest.fn().mockResolvedValue('PONG') } as never);
    const available = await request(app).get('/api/health').expect(200);
    expect(available.body).toMatchObject({ status: 'ok', checks: { redis: 'ok' } });
});
