import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import config from '../config';

export function encryptSecret(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', Buffer.from(config.ENCRYPTION_KEY, 'hex'), iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return `v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(stored: string, legacy: 'base64' | 'plain'): string {
    if (!stored.startsWith('v1:')) {
        return legacy === 'base64' ? Buffer.from(stored, 'base64').toString('utf8') : stored;
    }
    const parts = stored.split(':');
    if (parts.length !== 4) throw new Error('Invalid encrypted secret');
    if (parts.slice(1).some(part => Buffer.from(part, 'base64').toString('base64') !== part)) {
        throw new Error('Invalid encrypted secret encoding');
    }
    const iv = Buffer.from(parts[1], 'base64');
    const tag = Buffer.from(parts[2], 'base64');
    if (iv.length !== 12 || tag.length !== 16) throw new Error('Invalid encrypted secret');
    const decipher = createDecipheriv('aes-256-gcm', Buffer.from(config.ENCRYPTION_KEY, 'hex'), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64')), decipher.final()]).toString('utf8');
}
