/**
 * Servicio de conexion real a exchanges usando ccxt.
 * Soporta Binance y otros exchanges disponibles en ccxt.
 */
import ccxt from 'ccxt';
import prisma from '../utils/db';
import logger from '../utils/logger';

interface ExchangeBalance {
    exchange: string;
    free: Record<string, number>;
    used: Record<string, number>;
    total: Record<string, number>;
    error?: string;
}

interface ExchangePrice {
    exchange: string;
    symbol: string;
    bid: number;
    ask: number;
    last: number;
    timestamp: number;
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
                free: balance.free || {},
                used: balance.used || {},
                total: balance.total || {},
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
        const exchangeIds = this.getAvailableExchanges();
        const results: ExchangePrice[] = [];

        for (const id of exchangeIds) {
            try {
                const exchange = this.createPublicClient(id);
                if (!exchange) continue;
                const ticker = await exchange.fetchTicker(symbol);
                if (ticker) {
                    results.push({
                        exchange: id.toUpperCase(),
                        symbol,
                        bid: ticker.bid || 0,
                        ask: ticker.ask || 0,
                        last: ticker.last || 0,
                        timestamp: ticker.timestamp || Date.now(),
                    });
                }
            } catch {
                // exchange not available for this pair
            }
        }

        return results;
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
            return (ccxt as any).exchanges || ['binance'];
        } catch {
            return ['binance'];
        }
    }

    private createExchangeClient(name: string, apiKey: string, apiSecret: string, passthrough?: string | null): any {
        const upper = name.toUpperCase();
        try {
            const exchanges: Record<string, any> = {
                'BINANCE': () => new ccxt.binance({ apiKey, secret: apiSecret, enableRateLimit: true }),
            };
            if (exchanges[upper]) return exchanges[upper]();
            // Try dynamic exchange resolution via ccxt
            const ExchangeClass = (ccxt as any)[upper.toLowerCase()];
            if (ExchangeClass) {
                return new ExchangeClass({ apiKey, secret: apiSecret, password: passthrough || undefined, enableRateLimit: true });
            }
            return null;
        } catch {
            return null;
        }
    }

    private createPublicClient(name: string): any {
        const upper = name.toUpperCase();
        try {
            const exchanges: Record<string, any> = {
                'BINANCE': () => new ccxt.binance({ enableRateLimit: true }),
            };
            if (exchanges[upper]) return exchanges[upper]();
            const ExchangeClass = (ccxt as any)[upper.toLowerCase()];
            if (ExchangeClass) return new ExchangeClass({ enableRateLimit: true });
            return null;
        } catch {
            return null;
        }
    }
}

export default new RealExchangeService();
