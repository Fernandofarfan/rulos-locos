jest.mock('../src/utils/db', () => ({
    __esModule: true,
    default: {
        user: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
        exchangeKey: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    },
}));
jest.mock('../src/utils/totp', () => ({
    getTotp: jest.fn().mockResolvedValue({
        generateSecret: () => 'JBSWY3DPEHPK3PXP',
        generateURI: () => 'otpauth://totp/test',
        verify: jest.fn().mockResolvedValue({ valid: true }),
    }),
}));
jest.mock('google-auth-library', () => {
    process.env.GOOGLE_CLIENT_ID = 'test-google-client';
    return {
        OAuth2Client: jest.fn().mockImplementation(() => ({
            verifyIdToken: jest.fn().mockResolvedValue({
                getPayload: () => ({ email: 'test@example.com', email_verified: true, sub: 'google-id' }),
            }),
        })),
    };
});

import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/app';
import prisma from '../src/utils/db';
import config from '../src/config';
import { signToken } from '../src/middleware/auth';
import { EncryptionUnavailableError } from '../src/utils/crypto';
import exchangeService from '../src/services/exchangeService';
import portfolioSync from '../src/utils/ccxtSync';

const message = 'Función temporalmente no disponible: falta configurar el cifrado.';
const user = {
    id: 'test-user', email: 'test@example.com', name: 'Test', tokenVersion: 0,
    password: bcrypt.hashSync('password123', 4), twoFactorEnabled: true,
    twoFactorSecret: 'JBSWY3DPEHPK3PXP', googleId: 'google-id',
};
const originalAvailability = config.ENCRYPTION_AVAILABLE;
let accessToken: string;

beforeEach(() => {
    jest.clearAllMocks();
    config.ENCRYPTION_AVAILABLE = false;
    accessToken = signToken({ id: user.id, email: user.email }, '15m');
    jest.mocked(prisma!.user.findFirst).mockResolvedValue(user as never);
    jest.mocked(prisma!.user.findUnique).mockResolvedValue(user as never);
});
afterAll(() => { config.ENCRYPTION_AVAILABLE = originalAvailability; });

function noSession(response: request.Response) {
    expect(response.body).toEqual({ error: message });
    expect(response.body.token).toBeUndefined();
    expect(response.headers['set-cookie']).toBeUndefined();
}

it.each([undefined, '123456'])('never issues a password login session for a 2FA user with unavailable encryption (code %s)', async code => {
    const response = await request(app).post('/api/auth/login')
        .send({ email: user.email, password: 'password123', ...(code ? { twoFactorCode: code } : {}) }).expect(503);
    noSession(response);
});

it.each([undefined, '123456'])('never issues a Google login session for a 2FA user with unavailable encryption (code %s)', async code => {
    const response = await request(app).post('/api/auth/google')
        .send({ credential: 'google-token', ...(code ? { twoFactorCode: code } : {}) }).expect(503);
    noSession(response);
    expect(prisma!.user.update).not.toHaveBeenCalled();
});

it('does not issue a 2FA session when a v2 keyring exists but the legacy v1 key is missing', async () => {
    const originalKey = config.ENCRYPTION_KEY;
    config.ENCRYPTION_AVAILABLE = true;
    config.ENCRYPTION_KEY = '';
    jest.mocked(prisma!.user.findFirst).mockResolvedValue({ ...user, twoFactorSecret: 'v1:iv:tag:ciphertext' } as never);
    try {
        const password = await request(app).post('/api/auth/login')
            .send({ email: user.email, password: 'password123', twoFactorCode: '123456' }).expect(503);
        noSession(password);
        const google = await request(app).post('/api/auth/google')
            .send({ credential: 'google-token', twoFactorCode: '123456' }).expect(503);
        noSession(google);
    } finally { config.ENCRYPTION_KEY = originalKey; }
});

it('allows password and Google login for users without 2FA', async () => {
    jest.mocked(prisma!.user.findFirst).mockResolvedValue({ ...user, twoFactorEnabled: false } as never);
    const password = await request(app).post('/api/auth/login').send({ email: user.email, password: 'password123' }).expect(200);
    expect(password.body.token).toBeDefined();
    expect(password.headers['set-cookie']).toBeDefined();
    const google = await request(app).post('/api/auth/google').send({ credential: 'google-token' }).expect(200);
    expect(google.body.token).toBeDefined();
    expect(google.headers['set-cookie']).toBeDefined();
});

it('returns 503 without persisting a new 2FA secret', async () => {
    jest.mocked(prisma!.user.findUnique).mockResolvedValue({ ...user, twoFactorEnabled: false } as never);
    const response = await request(app).post('/api/auth/2fa/generate').set('Authorization', `Bearer ${accessToken}`).expect(503);
    expect(response.body).toEqual({ error: message });
    expect(prisma!.user.update).not.toHaveBeenCalled();
});

it('returns 503 without enabling 2FA when decryption is unavailable', async () => {
    jest.mocked(prisma!.user.findUnique).mockResolvedValue({ ...user, twoFactorEnabled: false } as never);
    const response = await request(app).post('/api/auth/2fa/verify').set('Authorization', `Bearer ${accessToken}`)
        .send({ token: '123456' }).expect(503);
    noSession(response);
    expect(prisma!.user.update).not.toHaveBeenCalled();
});

it('returns 503 without disabling 2FA when decryption is unavailable', async () => {
    const response = await request(app).post('/api/auth/2fa/disable').set('Authorization', `Bearer ${accessToken}`)
        .send({ token: '123456' }).expect(503);
    noSession(response);
    expect(prisma!.user.update).not.toHaveBeenCalled();
});

it('returns 503 without storing an exchange key', async () => {
    const response = await request(app).post('/api/exchange-keys').set('Authorization', `Bearer ${accessToken}`)
        .send({ exchange: 'binance', apiKey: 'public-key', apiSecret: 'secret-key' }).expect(503);
    expect(response.body).toEqual({ error: message });
    expect(prisma!.exchangeKey.create).not.toHaveBeenCalled();
});

it.each([
    ['post', '/api/portfolio/sync'],
    ['get', '/api/exchange/binance/balance'],
    ['get', '/api/exchange/binance/validate'],
] as const)('returns 503 for %s %s', async (method, path) => {
    const response = await request(app)[method](path).set('Authorization', `Bearer ${accessToken}`).expect(503);
    expect(response.body).toEqual({ error: message });
});

it('propagates encryption errors through the exchange and sync service layers', async () => {
    const key = { exchange: 'BINANCE', apiKey: 'key', apiSecret: 'legacy-secret', userId: user.id };
    jest.mocked(prisma!.exchangeKey.findUnique).mockResolvedValue(key as never);
    jest.mocked(prisma!.exchangeKey.findMany).mockResolvedValue([key] as never);
    await expect(exchangeService.getBalance(user.id, 'binance')).rejects.toBeInstanceOf(EncryptionUnavailableError);
    await expect(exchangeService.validateKeys(user.id, 'binance')).rejects.toBeInstanceOf(EncryptionUnavailableError);
    await expect(portfolioSync.syncUserPortfolio(user.id)).rejects.toBeInstanceOf(EncryptionUnavailableError);
});
