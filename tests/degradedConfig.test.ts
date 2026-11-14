jest.mock('../src/utils/logger', () => ({
    __esModule: true, default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));
jest.mock('@prisma/client', () => ({ PrismaClient: jest.fn().mockImplementation(() => ({})) }));

import logger from '../src/utils/logger';
import { PrismaClient } from '@prisma/client';

const originalEnv = { ...process.env };

beforeEach(() => {
    process.env = {
        ...originalEnv,
        NODE_ENV: 'production',
        VERCEL: '1',
        JWT_SECRET: 'test-secret-at-least-32-characters-long',
        DATABASE_URL: '',
        ENCRYPTION_KEY: '',
        ENCRYPTION_KEYS: '',
        ENCRYPTION_KEY_ID: '',
    };
    jest.clearAllMocks();
    delete (global as unknown as { prisma?: unknown }).prisma;
});

afterAll(() => { process.env = originalEnv; });

it('starts without encryption in production and never uses the dev key, including legacy plaintext', () => {
    jest.isolateModules(() => {
        const config = require('../src/config').default;
        const { encryptSecret, decryptSecret, EncryptionUnavailableError } = require('../src/utils/crypto');
        expect(config.ENCRYPTION_AVAILABLE).toBe(false);
        expect(config.ENCRYPTION_KEY).toBe('');
        expect(() => encryptSecret('secret')).toThrow(EncryptionUnavailableError);
        expect(() => decryptSecret('legacy-plaintext', 'plain')).toThrow(EncryptionUnavailableError);
        expect(jest.mocked(logger.error)).toHaveBeenCalledTimes(1);
    });
});

it.each([
    { ENCRYPTION_KEY: 'invalid' },
    { ENCRYPTION_KEYS: 'current:invalid', ENCRYPTION_KEY_ID: 'current' },
    { ENCRYPTION_KEY: '1'.repeat(64), ENCRYPTION_KEYS: `old:${'2'.repeat(64)}`, ENCRYPTION_KEY_ID: 'missing' },
])('degrades instead of throwing for invalid encryption configuration', values => {
    Object.assign(process.env, values);
    jest.isolateModules(() => {
        const config = require('../src/config').default;
        expect(config.ENCRYPTION_AVAILABLE).toBe(false);
        expect(config.ENCRYPTION_KEY).toBe('');
    });
});

it('accepts a valid production key and supports the development key only outside production', () => {
    process.env.ENCRYPTION_KEY = '1'.repeat(64);
    jest.isolateModules(() => {
        const config = require('../src/config').default;
        const { encryptSecret, decryptSecret } = require('../src/utils/crypto');
        expect(config.ENCRYPTION_AVAILABLE).toBe(true);
        expect(decryptSecret(encryptSecret('value'), 'plain')).toBe('value');
    });
    process.env.NODE_ENV = 'test';
    process.env.VERCEL = '';
    process.env.ENCRYPTION_KEY = '';
    jest.isolateModules(() => {
        const config = require('../src/config').default;
        expect(config.ENCRYPTION_AVAILABLE).toBe(true);
        expect(config.ENCRYPTION_KEY).toBe('0'.repeat(64));
    });
});

it('accepts a valid production keyring and writes with its current key', () => {
    process.env.ENCRYPTION_KEYS = `current:${'2'.repeat(64)}`;
    process.env.ENCRYPTION_KEY_ID = 'current';
    jest.isolateModules(() => {
        const config = require('../src/config').default;
        const { encryptSecret, decryptSecret } = require('../src/utils/crypto');
        expect(config.ENCRYPTION_AVAILABLE).toBe(true);
        const encrypted = encryptSecret('value');
        expect(encrypted).toMatch(/^v2:current:/);
        expect(decryptSecret(encrypted, 'plain')).toBe('value');
    });
});

it('still aborts when JWT_SECRET is missing in production', () => {
    process.env.JWT_SECRET = '';
    const exit = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit requested'); });
    try {
        expect(() => jest.isolateModules(() => { require('../src/config'); })).toThrow('exit requested');
        expect(exit).toHaveBeenCalledWith(1);
    } finally { exit.mockRestore(); }
});

it.each(['', 'file:./dev.db', 'mysql://localhost/db'])('does not initialize Prisma for a missing or non-Postgres URL', url => {
    process.env.DATABASE_URL = url;
    jest.isolateModules(() => {
        const db = require('../src/utils/db');
        expect(db.default).toBeNull();
        expect(db.databaseConfigured).toBe(false);
        expect(PrismaClient).not.toHaveBeenCalled();
    });
});

it.each(['postgres://localhost/test', 'postgresql://localhost/test'])('initializes Prisma for a Postgres URL', url => {
    process.env.DATABASE_URL = url;
    jest.isolateModules(() => {
        const db = require('../src/utils/db');
        expect(db.default).not.toBeNull();
        expect(db.databaseConfigured).toBe(true);
        expect(PrismaClient).toHaveBeenCalledTimes(1);
    });
});
