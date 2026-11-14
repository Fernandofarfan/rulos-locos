import { maskApiKey } from '../src/controllers/exchangeController';

test('masks the middle of exchange API keys', () => {
    expect(maskApiKey('abcdefghijklmnop')).toBe('abcd…mnop');
});
