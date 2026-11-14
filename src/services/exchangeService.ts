/**
 * Servicio de conexion real a exchanges usando ccxt.
 * Soporta Binance y otros exchanges disponibles en ccxt.
 */
import ccxt from 'ccxt';
import prisma from '../utils/db';
import logger from '../utils/logger';
import { decryptSecret } from '../utils/crypto';
import type { Exchange } from 'ccxt';

function numberBalances(value: object | undefined): Record<string, number> {
    return Object.fromEntries(Object.entries(value ?? {}).filter((entry): entry is [string, number] => typeof entry[1] === 'number'));
}

interface ExchangeBalance {
    exchange: string;
    free: Record<string, number>;
    used: Record<string, number>;
    total: Record<string, number>;
    error?: string;
}

export interface ExchangePrice {
    exchange: string;
    symbol: string;
    bid: number;
    ask: number;
    last: number;
    timestamp: number;
}

export function filterPriceOutliers(prices: ExchangePrice[], now = Date.now()): ExchangePrice[] {
    const valid = prices.filter(price => {
        if (!Number.isFinite(price.last) || price.last <= 0) return false;
        const fresh = Number.isFinite(price.timestamp) && price.timestamp > 0 && price.timestamp <= now + 5 * 60_000
            && price.timestamp >= now - 24 * 60 * 60_000;
        if (!fresh) logger.warn('Exchange quote stale or missing timestamp: %s', price.exchange);
        return fresh;
    });
    if (valid.length < 2) return valid;
    const sorted = valid.map(price => price.last).sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
    return valid.filter(price => {
        const accepted = Math.abs(price.last - median) / median <= 0.10;
        if (!accepted) logger.warn('Exchange quote outlier discarded: %s price=%s median=%s', price.exchange, price.last, median);
        return accepted;
    });
}

async function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Exchange timeout')), ms); }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

class RealExchangeService {
    /**
     * Obtener balance real del usuario desde el exchange.
     */
    async getBalance(userId: string, exchangeName: string): Promise<ExchangeBalance | null> {
        try {
            const key = await prisma?.exchangeKey.findUnique({
                where: { userId_exchange: { userId, exchange: exchangeName.toUpperCase() } },
            });
            if (!key) return null;

            const exchange = this.createExchangeClient(exchangeName, key.apiKey, key.apiSecret, key.passthrough);
            if (!exchange) return null;

            const balance = await exchange.fetchBalance();
            return {
                exchange: exchangeName.toUpperCase(),
                free: numberBalances(balance.free),
                used: numberBalances(balance.used),
                total: numberBalances(balance.total),
            };
        } catch (err) {
            logger.warn('Exchange balance error [%s]: %s', exchangeName, (err as Error).message);
            return { exchange: exchangeName.toUpperCase(), free: {}, used: {}, total: {}, error: (err as Error).message };
        }
    }

    /**
     * Obtener precios spot de Binance (USDT/ARS no existe en spot, se usa P2P).
     * Para precios ARS se usa el mercado P2P simulado via CryptoYa como fallback.
     */
    async getBinancePrices(symbol: string = 'BTC/USDT'): Promise<{ bid: number; ask: number; last: number }> {
        try {
            const exchange = new ccxt.binance({ enableRateLimit: true });
            const ticker = await exchange.fetchTicker(symbol);
            return {
                bid: ticker.bid || 0,
                ask: ticker.ask || 0,
                last: ticker.last || 0,
            };
        } catch (err) {
            logger.warn('Binance price error: %s', (err as Error).message);
            return { bid: 0, ask: 0, last: 0 };
        }
    }

    /**
     * Obtener precios de multiples exchanges para un par.
     */
    async getMultiExchangePrices(symbol: string = 'BTC/USDT'): Promise<ExchangePrice[]> {
        const exchangeIds = this.getAvailableExchanges().filter(id => id.toLowerCase() !== 'bitbns');
        const deadline = Date.now() + 5000;

        const results = await Promise.allSettled(
            exchangeIds.map(async (id) => {
                const exchange = this.createPublicClient(id);
                if (!exchange) throw new Error('Exchange not available');
                const remaining = deadline - Date.now();
                if (remaining <= 0) throw new Error('Exchange timeout');
                const ticker = await withDeadline(exchange.fetchTicker(symbol), remaining);
                if (!ticker) throw new Error('No ticker data');
                return {
                    exchange: id.toUpperCase(),
                    symbol,
                    bid: ticker.bid || 0,
                    ask: ticker.ask || 0,
                    last: ticker.last || 0,
                    timestamp: ticker.timestamp ?? 0,
                } as ExchangePrice;
            })
        );

        return filterPriceOutliers(results
            .filter((r): r is PromiseFulfilledResult<ExchangePrice> => r.status === 'fulfilled')
            .map(r => r.value));
    }

    /**
     * Validar conexion a un exchange con las API keys del usuario.
     */
    async validateKeys(userId: string, exchangeName: string): Promise<boolean> {
        try {
            const balance = await this.getBalance(userId, exchangeName);
            return balance !== null && !balance.error;
        } catch {
            return false;
        }
    }

    private getAvailableExchanges(): string[] {
        try {
            // ccxt.exchanges lists all exchange ids
            return ccxt.exchanges || ['binance'];
        } catch {
            return ['binance'];
        }
    }

    private createExchangeClient(name: string, apiKey: string, apiSecret: string, passthrough?: string | null): Exchange | null {
        const upper = name.toUpperCase();
        try {
            apiSecret = decryptSecret(apiSecret, 'base64');
            passthrough = passthrough ? decryptSecret(passthrough, 'plain') : passthrough;
            const exchanges: Record<string, () => Exchange> = {
                'BINANCE': () => new ccxt.binance({ apiKey, secret: apiSecret, enableRateLimit: true }),
            };
            if (exchanges[upper]) return exchanges[upper]();
            // Try dynamic exchange resolution via ccxt
            const ExchangeClass = (ccxt as unknown as Record<string, new (options: object) => Exchange>)[upper.toLowerCase()];
            if (ExchangeClass) {
                return new ExchangeClass({ apiKey, secret: apiSecret, password: passthrough || undefined, enableRateLimit: true });
            }
            return null;
        } catch {
            return null;
        }
    }

    private createPublicClient(name: string): Exchange | null {
        const upper = name.toUpperCase();
        try {
            const exchanges: Record<string, () => Exchange> = {
                'BINANCE': () => new ccxt.binance({ enableRateLimit: true, timeout: 5000 }),
            };
            if (exchanges[upper]) return exchanges[upper]();
            const ExchangeClass = (ccxt as unknown as Record<string, new (options: object) => Exchange>)[upper.toLowerCase()];
            if (ExchangeClass) return new ExchangeClass({ enableRateLimit: true, timeout: 5000 });
            return null;
        } catch {
            return null;
        }
    }
}

export default new RealExchangeService();
