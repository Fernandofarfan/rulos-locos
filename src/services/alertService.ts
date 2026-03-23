import prisma from '../utils/db';
import logger from '../utils/logger';
import notificationService from './notificationService';
import { sendPriceAlertEmail } from './emailService';
import rateController from '../controllers/rateController';

interface CurrentPrices {
    blue?: number;
    mep?: number;
    ccl?: number;
    crypto?: number;
    [key: string]: number | undefined;
}

interface CoinGeckoPriceResponse {
    bitcoin?: {
        usd?: number;
    };
}

class AlertService {
    /**
     * Obtener precios actuales de todas las fuentes
     */
    async getCurrentPrices(): Promise<CurrentPrices> {
        try {
            const prices: CurrentPrices = {};

            // Obtener tasa de cambio (incluye blue, mep, ccl)
            const rateData = await (rateController as any).getRateData?.();
            if (rateData) {
                prices.blue = rateData.blue?.valor || rateData.blue?.venta;
                prices.mep = rateData.mep?.valor || rateData.mep?.venta;
                prices.ccl = rateData.ccl?.valor || rateData.ccl?.venta;
            }

            // Obtener cripto (aproximado via coingecko o similar)
            try {
                const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', {
                    signal: AbortSignal.timeout(5000),
                });
                const data = await res.json() as CoinGeckoPriceResponse;
                if (data.bitcoin?.usd) {
                    // Aproximar a ARS multiplicando por CCL
                    prices.crypto = data.bitcoin.usd * (prices.ccl || 1);
                }
            } catch (e) {
                logger.warn('Error obteniendo precio crypto: %s', (e as Error).message);
            }

            return prices;
        } catch (error) {
            logger.error('Error obteniendo precios: %s', (error as Error).message);
            return {};
        }
    }

    /**
     * Verificar si una alerta debe dispararse
     */
    checkAlertTrigger(
        asset: string,
        currentPrice: number | undefined,
        condition: 'above' | 'below',
        threshold: number
    ): boolean {
        if (currentPrice === undefined) return false;

        if (condition === 'above') {
            return currentPrice >= threshold;
        } else if (condition === 'below') {
            return currentPrice <= threshold;
        }
        return false;
    }

    /**
     * Ejecutar verificación de todas las alertas activas
     * Dispara notificaciones si se cumplen condiciones
     */
    async checkAndTriggerAlerts(): Promise<void> {
        try {
            if (!prisma) {
                logger.warn('Prisma no disponible, saltando check de alertas');
                return;
            }

            // Obtener todas las alertas activas
            const alerts = await prisma.alert.findMany({
                where: { active: true },
                include: { user: true },
            });

            if (alerts.length === 0) {
                logger.debug('No hay alertas activas');
                return;
            }

            logger.info('Verificando %d alertas activas', alerts.length);

            // Obtener precios actuales
            const prices = await this.getCurrentPrices();

            // Por cada alerta, verificar si se dispara
            for (const alert of alerts) {
                const currentPrice = prices[alert.asset.toLowerCase()];

                if (!currentPrice) {
                    logger.debug('No hay precio para %s', alert.asset);
                    continue;
                }

                const shouldTrigger = this.checkAlertTrigger(
                    alert.asset,
                    currentPrice,
                    alert.condition as 'above' | 'below',
                    alert.threshold
                );

                if (shouldTrigger) {
                    await this.sendAlertNotification(alert, currentPrice);
                }
            }
        } catch (error) {
            logger.error('Error en checkAndTriggerAlerts: %s', (error as Error).message);
        }
    }

    /**
     * Enviar notificación por alerta activada
     */
    private async sendAlertNotification(
        alert: any,
        currentPrice: number
    ): Promise<void> {
        try {
            const conditionText = alert.condition === 'above' ? '⬆️ Alcanzó' : '⬇️ Cayó a';
            const message =
                `<b>🚨 ALERTA DE PRECIO ACTIVADA</b>\n\n` +
                `📊 <b>${alert.asset.toUpperCase()}</b>\n` +
                `${conditionText} <b>$${currentPrice.toFixed(2)}</b>\n` +
                `⚠️ Umbral: $${alert.threshold.toFixed(2)}\n\n` +
                `<i>Rulos Locos - ${new Date().toLocaleString('es-AR')}</i>`;

            // Enviar por Telegram
            const telegramSent = await notificationService.sendTelegramMessage(message);

            // Enviar por Email
            if (alert.user?.email) {
                try {
                    await sendPriceAlertEmail({
                        to: alert.user.email,
                        message: message.replace(/<[^>]+>/g, ''),
                        prices: { [alert.asset]: currentPrice },
                    });
                } catch (e) {
                    logger.warn('Error enviando email para alerta %s: %s', alert.id, (e as Error).message);
                }
            }

            logger.info(
                'Alerta disparada: %s %s %d (precio actual: %d)',
                alert.asset,
                alert.condition,
                alert.threshold,
                currentPrice
            );
        } catch (error) {
            logger.error('Error enviando notificación de alerta: %s', (error as Error).message);
        }
    }
}

export default new AlertService();
