import config from '../config';
import logger from '../utils/logger';

export interface P2PRate {
    ask: number;
    bid: number;
    totalAsk: number;
    totalBid: number;
    time: number;
    isFallback?: boolean;
    source?: string;
    isEstimated?: boolean;
}

class CryptoYaService {
    async getBinanceP2P(crypto = 'USDT', fiat = 'ARS', volume = 1): Promise<P2PRate> {
        try {
            const response = await fetch(
                `${config.API_URLS.CRIPTOYA}/binancep2p/${crypto}/${fiat}/${volume}`,
                { signal: AbortSignal.timeout(10000) },
            );
            if (!response.ok) throw new Error('Error al consultar CriptoYa Binance P2P');
            return { ...await response.json() as P2PRate, source: 'CriptoYa', isEstimated: false };
        } catch {
            return {
                ask: 1205.50,
                bid: 1195.20,
                totalAsk: 1205.50,
                totalBid: 1195.20,
                time: Math.floor(Date.now() / 1000),
                isFallback: true,
                source: 'estimado',
                isEstimated: true,
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
        const timeoutSignal = AbortSignal.timeout(10000);
        const controller = new AbortController();
        const abortFromTimeout = () => controller.abort(timeoutSignal.reason);
        const abortFromCaller = () => controller.abort(signal?.reason);
        timeoutSignal.addEventListener('abort', abortFromTimeout, { once: true });
        if (signal?.aborted) abortFromCaller();
        else signal?.addEventListener('abort', abortFromCaller, { once: true });
        try {
            const response = await fetch(
                `${config.API_URLS.CRIPTOYA}/${exchange}/${crypto}/${fiat}/${volume}`,
                { signal: controller.signal },
            );
            if (!response.ok) throw new Error(`Error en ${exchange}`);
            return response.json();
        } catch (err) {
            logger.warn('CryptoYa getExchangeRate failed for %s: %s', exchange, (err as Error).message);
            return {
                ask: null,
                bid: null,
                available: false,
                error: (err as Error).message,
                timestamp: new Date().toISOString(),
            };
        } finally {
            timeoutSignal.removeEventListener('abort', abortFromTimeout);
            signal?.removeEventListener('abort', abortFromCaller);
        }
    }
}

export default new CryptoYaService();
