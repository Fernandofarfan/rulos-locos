import { decryptSecret, encryptSecret } from '../src/utils/crypto';
import config from '../src/config';
import { parseEncryptionKeys } from '../src/config/encryption';

describe('secret encryption', () => {
    it('roundtrips and uses a random IV', () => {
        const first = encryptSecret('secreto ñ');
        const second = encryptSecret('secreto ñ');
        expect(first).not.toBe(second);
        expect(decryptSecret(first, 'plain')).toBe('secreto ñ');
    });

    it('rejects tampering', () => {
        const parts = encryptSecret('secreto').split(':');
        const tag = Buffer.from(parts[2], 'base64');
        tag[0] ^= 1;
        parts[2] = tag.toString('base64');
        expect(() => decryptSecret(parts.join(':'), 'plain')).toThrow();
        expect(() => decryptSecret(encryptSecret('secreto') + '!', 'plain')).toThrow();
    });

    it('reads legacy base64 and plaintext', () => {
        expect(decryptSecret(Buffer.from('secreto ñ').toString('base64'), 'base64')).toBe('secreto ñ');
        expect(decryptSecret('secreto', 'plain')).toBe('secreto');
    });

    it('rotates v2 keys and retains v1 and older key readability', () => {
        const original = { id: config.ENCRYPTION_KEY_ID, keys: config.ENCRYPTION_KEYS };
        try {
            config.ENCRYPTION_KEY_ID = '';
            const legacy = encryptSecret('v1 legacy');
            config.ENCRYPTION_KEYS = parseEncryptionKeys(`old:${'1'.repeat(64)},new:${'2'.repeat(64)}`, 'old');
            config.ENCRYPTION_KEY_ID = 'old';
            const old = encryptSecret('old key');
            expect(old.startsWith('v2:old:')).toBe(true);
            config.ENCRYPTION_KEY_ID = 'new';
            const current = encryptSecret('new key');
            expect(current.startsWith('v2:new:')).toBe(true);
            expect(decryptSecret(current, 'plain')).toBe('new key');
            expect(decryptSecret(old, 'plain')).toBe('old key');
            expect(decryptSecret(legacy, 'plain')).toBe('v1 legacy');
            expect(() => decryptSecret(old.replace('v2:old:', 'v2:unknown:'), 'plain')).toThrow('Unknown encryption key ID');
        } finally {
            config.ENCRYPTION_KEY_ID = original.id;
            config.ENCRYPTION_KEYS = original.keys;
        }
    });

    it('rejects invalid keyrings without exposing key material', () => {
        expect(() => parseEncryptionKeys('old:not-a-key', 'old')).toThrow();
        expect(() => parseEncryptionKeys(`old:${'1'.repeat(64)}`, 'missing')).toThrow();
    });
});
