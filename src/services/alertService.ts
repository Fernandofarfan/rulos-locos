import prisma from '../utils/db';
import logger from '../utils/logger';
import notificationService from './notificationService';
import { sendPriceAlertEmail } from './emailService';
import dolarApiService from './dolarApiService';
import type { Alert } from '@prisma/client';
import cache from '../utils/cache';
import arbitrageService, { type ArbitrageResult } from './arbitrageService';
import { calculateRoutes } from './netArbitrage';
import { broadcastPush } from '../controllers/pushController';

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

export class AlertService {
    private readonly COOLDOWN_MS = 6 * 60 * 60 * 1000;

    /**
     * Obtener precios actuales de todas las fuentes
     */
    async getCurrentPrices(): Promise<CurrentPrices> {
        try {
            const prices: CurrentPrices = {};

            // Obtener cotizaciones (blue, mep, ccl) desde DolarAPI
            const dolares = await dolarApiService.getAllDollars();
            const blue = dolares.find((d) => d.casa === 'blue');
            const mep = dolares.find((d) => d.casa === 'bolsa');
            const ccl = dolares.find((d) => d.casa === 'contadoconliqui');
            const oficial = dolares.find((d) => d.casa === 'oficial');

            prices.blue = blue?.venta;
            prices.mep = mep?.venta;
            prices.ccl = ccl?.venta;
            prices.oficial = oficial?.venta;

            // Obtener cripto (aproximado via coingecko o similar)
            try {
                const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', {
                    signal: AbortSignal.timeout(5000),
                });
                const data = await res.json() as CoinGeckoPriceResponse;
                if (data.bitcoin?.usd && prices.ccl && prices.ccl > 0) {
                    // Aproximar a ARS multiplicando por CCL
                    prices.crypto = data.bitcoin.usd * prices.ccl;
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

            // Obtener todas las alertas activas (solo el email del usuario, no todo el registro)
            const alerts = await prisma.alert.findMany({
                where: { active: true },
                include: { user: { select: { email: true } } },
            });

            if (alerts.length === 0) {
                logger.debug('No hay alertas activas');
                return;
            }

            logger.info('Verificando %d alertas activas', alerts.length);

            // Obtener precios actuales
            const prices = alerts.some(alert => alert.kind !== 'RULO') ? await this.getCurrentPrices() : {};
            let arbitrage: ArbitrageResult | null = null;
            if (alerts.some(alert => alert.kind === 'RULO')) {
                arbitrage = await cache.get<ArbitrageResult>('arbitrage_data') ?? await arbitrageService.calculateArbitrage();
            }

            // Por cada alerta, verificar si se dispara
            for (const alert of alerts) {
                const currentPrice = alert.kind === 'RULO' && arbitrage && alert.routeId
                    ? calculateRoutes(arbitrage, Number(alert.capital ?? 1_000_000)).find(route => route.id === alert.routeId)?.net.netPct
                    : prices[alert.asset.toLowerCase()];

                if (currentPrice === undefined) {
                    logger.debug('No hay precio para %s', alert.asset);
                    continue;
                }

                const shouldTrigger = this.checkAlertTrigger(
                    alert.asset,
                    currentPrice,
                    alert.condition as 'above' | 'below',
                    Number(alert.threshold)
                );

                if (shouldTrigger) {
                    // Cooldown: evita reenviar la misma alerta en cada ciclo
                    const now = new Date();
                    const claimed = await prisma.alert.updateMany({
                        where: { id: alert.id, active: true, OR: [
                            { lastTriggeredAt: null }, { lastTriggeredAt: { lt: new Date(now.getTime() - this.COOLDOWN_MS) } },
                        ] },
                        data: { lastTriggeredAt: now },
                    });
                    if (claimed.count !== 1) {
                        logger.debug('Alerta %s en cooldown, omitiendo', alert.id);
                        continue;
                    }
                    await this.sendAlertNotification(alert, currentPrice);
                }
            }
        } catch (error) {
            logger.error('Error en checkAndTriggerAlerts: %s', (error as Error).message);
            throw error;
        }
    }

    /**
     * Enviar notificación por alerta activada
     */
    private async sendAlertNotification(
        alert: Alert & { user: { email: string } },
        currentPrice: number
    ): Promise<void> {
        try {
            const conditionText = alert.condition === 'above' ? '⬆️ Alcanzó' : '⬇️ Cayó a';
            const message = alert.kind === 'RULO'
                ? `<b>🚨 ALERTA DE RULO ACTIVADA</b>\n\nRuta: <b>${alert.routeId}</b>\nRentabilidad neta estimada: <b>${currentPrice.toFixed(2)}%</b>\nCapital: $${Number(alert.capital ?? 1_000_000).toLocaleString('es-AR')}\nUmbral: ${Number(alert.threshold).toFixed(2)}%\n\nhttps://rulos-locos-dashboard.vercel.app/`
                :
                `<b>🚨 ALERTA DE PRECIO ACTIVADA</b>\n\n` +
                `📊 <b>${alert.asset.toUpperCase()}</b>\n` +
                `${conditionText} <b>$${currentPrice.toFixed(2)}</b>\n` +
                `⚠️ Umbral: $${alert.threshold.toFixed(2)}\n\n` +
                `<i>Rulos Locos - ${new Date().toLocaleString('es-AR')}</i>`;

            // Enviar por Telegram
            const telegramSent = await notificationService.sendTelegramMessage(message);

            try {
                await broadcastPush({
                    title: alert.kind === 'RULO' ? 'Alerta de rulo' : 'Alerta de precio',
                    body: message.replace(/<[^>]+>/g, ''),
                    url: '/',
                }, alert.userId);
            } catch (error) {
                logger.warn('Error enviando push para alerta %s: %s', alert.id, (error as Error).message);
            }

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
