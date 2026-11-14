jest.mock('../src/utils/db', () => ({
    __esModule: true,
    default: { user: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() } },
}));
jest.mock('../src/utils/totp', () => ({
    getTotp: jest.fn().mockResolvedValue({ verify: jest.fn().mockResolvedValue({ valid: false }) }),
}));

import request from 'supertest';
import app from '../src/app';
import prisma from '../src/utils/db';
import { signRefreshToken, signToken } from '../src/middleware/auth';
import { getTotp } from '../src/utils/totp';
import bcrypt from 'bcryptjs';

const users = prisma!.user;
const user = {
    id: 'auth-test-user', email: 'test@example.com', name: 'Test', avatarUrl: null,
    tokenVersion: 0, twoFactorEnabled: true, twoFactorSecret: 'JBSWY3DPEHPK3PXP',
};

beforeEach(() => {
    jest.clearAllMocks();
    user.tokenVersion = 0;
    jest.mocked(users.findFirst).mockResolvedValue(user as never);
    jest.mocked(users.findUnique).mockResolvedValue(user as never);
    jest.mocked(users.create).mockResolvedValue(user as never);
    (users.updateMany as jest.Mock).mockImplementation(async () => { user.tokenVersion++; return { count: 1 }; });
});

describe('auth validation and cookie refresh', () => {
    it('returns no session without a refresh cookie', async () => {
        await request(app).post('/api/auth/refresh').set('X-Requested-With', 'XMLHttpRequest').expect(204);
    });

    it.each([
        { email: 'invalid', password: 'password123' },
        { email: 'test@example.com', password: 'short' },
        { email: 'test@example.com', password: 'x'.repeat(129) },
        { email: 'test@example.com', password: 'password123', name: 'x'.repeat(101) },
    ])('rejects invalid registration input', async body => {
        await request(app).post('/api/auth/register').send(body).expect(400);
        expect(users.create).not.toHaveBeenCalled();
    });

    it('normalizes registration email and sets an httpOnly refresh cookie', async () => {
        jest.mocked(users.findFirst).mockResolvedValueOnce(null);
        const response = await request(app).post('/api/auth/register')
            .send({ email: '  TEST@Example.com  ', password: 'password123' }).expect(201);
        expect(users.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ email: 'test@example.com' }) }));
        expect(response.body.refreshToken).toBeUndefined();
        expect(response.headers['set-cookie'][0]).toMatch(/rl_refresh=.*HttpOnly.*SameSite=Lax/i);
    });

    it('normalizes login email and sets an httpOnly refresh cookie', async () => {
        const password = await bcrypt.hash('password123', 4);
        jest.mocked(users.findFirst).mockResolvedValueOnce({ ...user, password, twoFactorEnabled: false } as never);
        const response = await request(app).post('/api/auth/login')
            .send({ email: ' TEST@Example.com ', password: 'password123' }).expect(200);
        expect(users.findFirst).toHaveBeenCalledWith({ where: { email: { equals: 'test@example.com', mode: 'insensitive' } } });
        expect(response.headers['set-cookie'][0]).toMatch(/rl_refresh=.*HttpOnly.*SameSite=Lax/i);
        expect(response.body.refreshToken).toBeUndefined();
    });

    it('matches mixed-case existing emails for login and registration conflicts', async () => {
        const password = await bcrypt.hash('password123', 4);
        const stored = { ...user, email: 'Foo@Example.com', password, twoFactorEnabled: false };
        (users.findFirst as jest.Mock).mockImplementation(async ({ where }: { where: { email: { equals: string; mode: string } } }) =>
            where.email.equals === stored.email.toLowerCase() && where.email.mode === 'insensitive' ? stored : null);
        const login = await request(app).post('/api/auth/login')
            .send({ email: 'foo@example.com', password: 'password123' }).expect(200);
        expect(login.body.user.email).toBe('Foo@Example.com');
        await request(app).post('/api/auth/register')
            .send({ email: 'FOO@example.com', password: 'password123' }).expect(409);
        expect(users.create).not.toHaveBeenCalled();
    });

    it('allows 25 consecutive refreshes without hitting the auth rate limit', async () => {
        const cookie = `rl_refresh=${signRefreshToken({ id: user.id, email: user.email, tv: user.tokenVersion })}`;
        for (let i = 0; i < 25; i++) {
            await request(app).post('/api/auth/refresh').set('Cookie', cookie)
                .set('X-Requested-With', 'XMLHttpRequest').expect(200);
        }
    });

    it('keeps the stricter login rate limit', async () => {
        for (let i = 0; i < 20; i++) {
            await request(app).post('/api/auth/login').set('X-Forwarded-For', '192.0.2.21')
                .send({ email: user.email, password: 'wrong' }).expect(401);
        }
        await request(app).post('/api/auth/login').set('X-Forwarded-For', '192.0.2.21')
            .send({ email: user.email, password: 'wrong' }).expect(429);
    });

    it('requires a valid current code before disabling 2FA', async () => {
        const token = signToken({ id: user.id, email: user.email }, '15m');
        await request(app).post('/api/auth/2fa/disable').set('Authorization', `Bearer ${token}`).send({}).expect(400);
        await request(app).post('/api/auth/2fa/disable').set('Authorization', `Bearer ${token}`).send({ token: '000000' }).expect(400);
        expect(users.update).not.toHaveBeenCalled();
    });

    it('disables 2FA with a valid code, increments the version and replaces the cookie', async () => {
        const otp = await getTotp();
        jest.mocked(otp.verify).mockResolvedValueOnce({ valid: true } as never);
        jest.mocked(users.update).mockResolvedValue({ ...user, twoFactorEnabled: false, tokenVersion: 1 } as never);
        const token = signToken({ id: user.id, email: user.email }, '15m');
        const result = await request(app).post('/api/auth/2fa/disable').set('Authorization', `Bearer ${token}`)
            .send({ token: '123456' }).expect(200);
        expect(users.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ twoFactorEnabled: false, tokenVersion: { increment: 1 } }),
        }));
        expect(result.headers['set-cookie'][0]).toMatch(/rl_refresh=.*HttpOnly/);
    });

    it('requires CSRF header and revokes the refresh token on logout', async () => {
        jest.mocked(users.findFirst).mockResolvedValueOnce(null);
        const registration = await request(app).post('/api/auth/register')
            .send({ email: user.email, password: 'password123' }).expect(201);
        const cookie = registration.headers['set-cookie'][0].split(';')[0];
        await request(app).post('/api/auth/refresh').set('Cookie', cookie).expect(403);
        const refreshed = await request(app).post('/api/auth/refresh').set('Cookie', cookie).set('X-Requested-With', 'XMLHttpRequest').expect(200);
        expect(refreshed.headers['set-cookie'][0].split(';')[0]).not.toBe(cookie);
        const logout = await request(app).post('/api/auth/logout').set('Cookie', cookie).set('X-Requested-With', 'XMLHttpRequest').expect(204);
        expect(logout.headers['set-cookie'][0]).toMatch(/rl_refresh=;.*Expires=Thu, 01 Jan 1970/i);
        expect(user.tokenVersion).toBe(1);
        await request(app).post('/api/auth/refresh').set('Cookie', cookie).set('X-Requested-With', 'XMLHttpRequest').expect(401);
    });
});
