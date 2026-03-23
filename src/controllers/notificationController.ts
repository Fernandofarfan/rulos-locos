import { Request, Response } from 'express';
import notificationService from '../services/notificationService';
import { sendPriceAlertEmail } from '../services/emailService';
import logger from '../utils/logger';

interface PriceBody {
    blue?: string | number;
    mep?: string | number;
    ccl?: string | number;
    crypto?: string | number;
}

class NotificationController {
    async sendPriceAlert(req: Request, res: Response): Promise<void> {
        try {
            const { message, prices } = req.body as { message?: string; prices?: PriceBody };
            if (!message && !prices) {
                res.status(400).json({ status: 'error', message: 'Se requiere mensaje o datos de precios' });
                return;
            }

            let text: string;
            if (prices) {
                text = `<b>📊 Resumen de Precios - Rulos Locos</b>\n\n`;
                if (prices.blue)   text += `💵 Dólar Blue: <b>$${prices.blue}</b>\n`;
                if (prices.mep)    text += `🏦 Dólar MEP: <b>$${prices.mep}</b>\n`;
                if (prices.ccl)    text += `🌎 CCL: <b>$${prices.ccl}</b>\n`;
                if (prices.crypto) text += `⚡ Dólar Cripto: <b>$${prices.crypto}</b>\n`;
                text += `\n<i>Enviado desde rulos-locos.vercel.app</i>`;
            } else {
                text = message!;
            }

            const telegramOk = await notificationService.sendTelegramMessage(text);

            // Email: se envía en paralelo si EMAIL_RECIPIENT está definido
            const emailTo = process.env.EMAIL_RECIPIENT;
            if (emailTo) {
                const displayPrices = prices
                    ? Object.fromEntries(Object.entries(prices).map(([k, v]) => [k, Number(v)]))
                    : undefined;
                sendPriceAlertEmail({
                    to: emailTo,
                    message: text.replace(/<[^>]+>/g, ''),
                    prices: displayPrices,
                }).catch(e => logger.warn('Email fallback error: %s', e.message));
            }

            if (telegramOk) {
                res.json({ status: 'ok', message: 'Alerta enviada por Telegram' });
            } else {
                res.status(400).json({
                    status: 'error',
                    message: 'No se pudo enviar. Configurá TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID. Si no tenés bot, crealo en @BotFather y luego iniciá chat con el bot para obtener tu chat_id.'
                });
            }
        } catch (error) {
            res.status(500).json({ status: 'error', message: (error as Error).message });
        }
    }

    async testTelegram(req: Request, res: Response): Promise<void> {
        try {
            const success = await notificationService.sendTelegramMessage(
                '<b>🧪 Test de Conexión - Rulos Locos</b>\n\nSi recibiste este mensaje, la configuración del bot es correcta. ✅'
            );
            if (success) {
                res.json({ status: 'ok', message: 'Mensaje de prueba enviado exitosamente' });
            } else {
                res.status(400).json({ status: 'error', message: 'No se pudo enviar el mensaje. Verificá TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID en .env, y confirmá que el bot exista en Telegram (@BotFather).' });
            }
        } catch (error) {
            logger.error('Error en testTelegram: %s', (error as Error).message);
            res.status(500).json({ status: 'error', message: (error as Error).message });
        }
    }
}

export default new NotificationController();
