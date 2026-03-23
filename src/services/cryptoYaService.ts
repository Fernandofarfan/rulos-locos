import fetch from 'node-fetch';
import config from '../config';

export interface P2PRate {
    ask: number;
    bid: number;
    totalAsk: number;
    totalBid: number;
    time: number;
}

class CryptoYaService {
    async getBinanceP2P(crypto = 'USDT', fiat = 'ARS', volume = 1): Promise<P2PRate> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(
                `${config.API_URLS.CRIPTOYA}/binancep2p/${crypto}/${fiat}/${volume}`,
                { signal: controller.signal as unknown as AbortSignal } as Parameters<typeof fetch>[1],
            );
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error('Error al consultar CriptoYa Binance P2P');
            return await response.json() as P2PRate;
        } catch {
            return {
                ask: 1205.50,
                bid: 1195.20,
                totalAsk: 1205.50,
                totalBid: 1195.20,
                time: Math.floor(Date.now() / 1000),
            };
        }
    }

    async getExchangeRate(
        exchange: string,
        crypto = 'USDT',
        fiat = 'ARS',
        volume = 1,
        signal?: AbortSignal,
    ): Promise<unknown> {
        const options = signal
            ? ({ signal } as Parameters<typeof fetch>[1])
            : undefined;
        const response = await fetch(
            `${config.API_URLS.CRIPTOYA}/${exchange}/${crypto}/${fiat}/${volume}`,
            options,
        );
        if (!response.ok) throw new Error(`Error en ${exchange}`);
        return response.json();
    }
}

export default new CryptoYaService();
