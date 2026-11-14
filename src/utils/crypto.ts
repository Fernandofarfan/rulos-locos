import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import config from '../config';

export function encryptSecret(plain: string): string {
    const iv = randomBytes(12);
    const currentId = config.ENCRYPTION_KEY_ID;
    const key = currentId ? config.ENCRYPTION_KEYS[currentId] : config.ENCRYPTION_KEY;
    if (!key) throw new Error('Encryption key unavailable');
    const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const prefix = currentId ? `v2:${currentId}` : 'v1';
    return `${prefix}:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(stored: string, legacy: 'base64' | 'plain'): string {
    if (!stored.startsWith('v1:') && !stored.startsWith('v2:')) {
        return legacy === 'base64' ? Buffer.from(stored, 'base64').toString('utf8') : stored;
    }
    const parts = stored.split(':');
    const v2 = parts[0] === 'v2';
    if (parts.length !== (v2 ? 5 : 4)) throw new Error('Invalid encrypted secret');
    const key = v2 ? config.ENCRYPTION_KEYS[parts[1]] : config.ENCRYPTION_KEY;
    if (!key) throw new Error(v2 ? 'Unknown encryption key ID' : 'Legacy encryption key unavailable');
    const fields = parts.slice(v2 ? 2 : 1);
    if (fields.some(part => Buffer.from(part, 'base64').toString('base64') !== part)) {
        throw new Error('Invalid encrypted secret encoding');
    }
    const iv = Buffer.from(fields[0], 'base64');
    const tag = Buffer.from(fields[1], 'base64');
    if (iv.length !== 12 || tag.length !== 16) throw new Error('Invalid encrypted secret');
    const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(Buffer.from(fields[2], 'base64')), decipher.final()]).toString('utf8');
}

export function isCurrentEncryption(stored: string): boolean {
    return config.ENCRYPTION_KEY_ID
        ? stored.startsWith(`v2:${config.ENCRYPTION_KEY_ID}:`)
        : stored.startsWith('v1:');
}
