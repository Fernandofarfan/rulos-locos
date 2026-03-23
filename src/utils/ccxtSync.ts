import ccxt from 'ccxt';
import prisma from './db';
import logger from './logger';

export class PortfolioSyncService {

    // Helper to decrypt keys (in a real app, use AES-256 decryption here based on APP_SECRET)
    // For MVP we stored them in base64
    private getSecret(base64Secret: string): string {
        return Buffer.from(base64Secret, 'base64').toString('ascii');
    }

    async syncUserPortfolio(userId: string): Promise<void> {
        if (!prisma) {
            logger.warn('Prisma not available, skipping CCXT sync.');
            return;
        }

        try {
            const keys = await prisma.exchangeKey.findMany({
                where: { userId }
            });

            if (keys.length === 0) return;

            for (const key of keys) {
                try {
                    await this.syncExchange(userId, key);
                } catch (e: any) {
                    logger.error(`Error syncing ${key.exchange} for user ${userId}: ${e.message}`);
                }
            }
        } catch (error) {
            logger.error('Global CCXT sync error:', error);
        }
    }

    private async syncExchange(userId: string, keyData: any): Promise<void> {
        const exchangeId = keyData.exchange.toLowerCase();

        let targetExchange = exchangeId;
        // Map some local exchanges if needed, CCXT supports Binance, OKX, etc directly.
        // For Lemon/Buenbit we might need custom fetchers if ccxt doesn't support them,
        // but let's assume standard ccxt for now or fallback.
        const isCCXTSupported = ccxt.exchanges.includes(targetExchange);

        if (!isCCXTSupported && targetExchange !== 'lemon') {
            logger.warn(`Exchange ${targetExchange} not directly supported by CCXT yet.`);
            return;
        }

        let balances: any = {};

        if (isCCXTSupported) {
            const ExchangeClass = (ccxt as any)[targetExchange];
            const client = new ExchangeClass({
                apiKey: keyData.apiKey,
                secret: this.getSecret(keyData.apiSecret),
                password: keyData.passthrough, // For OKX/KuCoin
                enableRateLimit: true,
            });

            const fetched = await client.fetchBalance();
            balances = fetched.total || {};
        } else if (targetExchange === 'lemon') {
            // Mock Lemon Cash API implementation if Lemon isn't in CCXT
            // In reality, you'd do a fetch() to Lemon's public API using the Bearer token
            balances = {
                'USDT': Math.random() * 500,
                'BTC': 0.05,
                'ARS': 150000
            };
        }

        // Now save to Prisma Portfolio (Overwriting existing synced items for this exchange)
        if (prisma) {
            // 1. Mark old synced items from this exchange as deleted or just delete them
            // Need a way in DB to know an item came from "Sync".
            // We can use the 'notes' field or add a 'source' field. For now, let's just create/update them.

            for (const [coin, amount] of Object.entries(balances)) {
                // @ts-ignore
                const numAmount = Number(amount.total || amount);
                if (numAmount > 0 && !isNaN(numAmount)) {
                    // Overwrite the existing portfolio position for this coin synced by the user
                    const existing = await prisma.portfolioPosition.findFirst({
                        where: { userId, asset: coin }
                    });

                    if (existing) {
                        await prisma.portfolioPosition.update({
                            where: { id: existing.id },
                            data: { amount: numAmount, date: new Date().toISOString().split('T')[0] }
                        });
                    } else {
                        await prisma.portfolioPosition.create({
                            data: {
                                userId,
                                asset: coin,
                                amount: numAmount,
                                buyPrice: 0,
                                date: new Date().toISOString().split('T')[0],
                                note: `Synced from ${keyData.exchange}`
                            }
                        });
                    }
                }
            }
        }
    }
}

export default new PortfolioSyncService();
