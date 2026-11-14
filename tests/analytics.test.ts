jest.mock('../src/utils/db', () => ({
    __esModule: true,
    default: { analyticsEvent: { create: jest.fn(), groupBy: jest.fn(), deleteMany: jest.fn() }, $queryRaw: jest.fn() },
}));

import request from 'supertest';
import app from '../src/app';
import prisma from '../src/utils/db';
import { signToken } from '../src/middleware/auth';

describe('persistent anonymous analytics', () => {
    const sessionHash = '5cd09afa-7cdd-4df3-92aa-079b46113285';
    it('persists valid anonymous events and rejects personal properties', async () => {
        jest.mocked(prisma!.analyticsEvent.create).mockResolvedValue({} as never);
        await request(app).post('/api/analytics/track').send({
            name: 'tool.open', path: '/', sessionHash, props: { feature: 'uva' },
        }).expect(202);
        expect(prisma!.analyticsEvent.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ name: 'tool.open', sessionHash, props: { feature: 'uva' } }),
        }));
        await request(app).post('/api/analytics/track').send({
            name: 'tool.open', path: '/', sessionHash, props: { feature: 'uva', email: 'test@example.com' },
        }).expect(400);
        await request(app).post('/api/analytics/track').send({
            name: 'invalid event!', sessionHash,
        }).expect(400);
    });
    it('restricts aggregated analytics to admins', async () => {
        const old = process.env.ADMIN_EMAILS;
        process.env.ADMIN_EMAILS = 'admin@example.com';
        try {
            await request(app).get('/api/analytics/summary').expect(401);
            const nonAdmin = signToken({ id: 'user', email: 'user@example.com' }, '15m');
            await request(app).get('/api/analytics/summary').set('Authorization', `Bearer ${nonAdmin}`).expect(403);
            jest.mocked(prisma!.analyticsEvent.groupBy).mockResolvedValue([] as never);
            jest.mocked(prisma!.$queryRaw).mockResolvedValue([] as never);
            const admin = signToken({ id: 'admin', email: 'admin@example.com' }, '15m');
            const response = await request(app).get('/api/analytics/summary').set('Authorization', `Bearer ${admin}`).expect(200);
            expect(response.body).toMatchObject({ days7: [], days30: [] });
        } finally {
            if (old === undefined) delete process.env.ADMIN_EMAILS;
            else process.env.ADMIN_EMAILS = old;
        }
    });
});
