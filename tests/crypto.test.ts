import { decryptSecret, encryptSecret } from '../src/utils/crypto';

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
});
