import ccxt from 'ccxt';
import prisma from './db';
import logger from './logger';
import { decryptSecret } from './crypto';
import type { ExchangeKey } from '@prisma/client';
import type { Exchange } from 'ccxt';

export class PortfolioSyncService {

    private getSecret(stored: string): string {
        return decryptSecret(stored, 'base64');
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
                } catch (e) {
                    logger.error(`Error syncing ${key.exchange} for user ${userId}: ${(e as Error).message}`);
                }
            }
        } catch (error) {
            logger.error('Global CCXT sync error:', error);
        }
    }

    private async syncExchange(userId: string, keyData: ExchangeKey): Promise<void> {
        const exchangeId = keyData.exchange.toLowerCase();

        const targetExchange = exchangeId;
        // Map some local exchanges if needed, CCXT supports Binance, OKX, etc directly.
        // For Lemon/Buenbit we might need custom fetchers if ccxt doesn't support them,
        // but let's assume standard ccxt for now or fallback.
        const isCCXTSupported = ccxt.exchanges.includes(targetExchange);

        if (!isCCXTSupported && targetExchange !== 'lemon') {
            logger.warn(`Exchange ${targetExchange} not directly supported by CCXT yet.`);
            return;
        }

        let balances: Record<string, number> = {};

        if (isCCXTSupported) {
            const ExchangeClass = (ccxt as unknown as Record<string, new (options: object) => Exchange>)[targetExchange];
            const client = new ExchangeClass({
                apiKey: keyData.apiKey,
                secret: this.getSecret(keyData.apiSecret),
                password: keyData.passthrough ? decryptSecret(keyData.passthrough, 'plain') : undefined,
                enableRateLimit: true,
            });

            const fetched = await client.fetchBalance();
            balances = Object.fromEntries(Object.entries(fetched.total || {}).filter((entry): entry is [string, number] => typeof entry[1] === 'number'));
        } else if (targetExchange === 'lemon') {
            // Lemon no está soportado por CCXT todavía y no hay integración real.
            // NUNCA fabricar balances falsos: se persistirían en el portfolio del usuario.
            logger.warn('Sync Lemon omitido: integración real no disponible');
            return;
        }

        // Now save to Prisma Portfolio (Overwriting existing synced items for this exchange)
        if (prisma) {
            // 1. Mark old synced items from this exchange as deleted or just delete them
            // Need a way in DB to know an item came from "Sync".
            // We can use the 'notes' field or add a 'source' field. For now, let's just create/update them.

            for (const [coin, amount] of Object.entries(balances)) {
                const numAmount = Number(amount);
                if (numAmount > 0 && !isNaN(numAmount)) {
                    // Overwrite the existing portfolio position for this coin synced by the user
                    const existing = await prisma.portfolioPosition.findFirst({
                        where: { userId, asset: coin }
                    });

                    if (existing) {
                        await prisma.portfolioPosition.update({
                            where: { id: existing.id },
                            data: { amount: numAmount, date: new Date() }
                        });
                    } else {
                        await prisma.portfolioPosition.create({
                            data: {
                                userId,
                                asset: coin,
                                amount: numAmount,
                                buyPrice: 0,
                                date: new Date(),
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
