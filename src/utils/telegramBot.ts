import { Telegraf } from 'telegraf';
import prisma from './db';
import logger from './logger';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Initialize bot
export const bot = TELEGRAM_TOKEN ? new Telegraf(TELEGRAM_TOKEN) : null;

if (bot) {
    bot.start((ctx) => {
        const id = ctx.message.chat.id;
        ctx.reply(`¡Hola! Tu Telegram ID es: ${id} \n\nPegalo en Rulos Locos -> Panel de Configuración -> Activar Alertas 24/7.`);
    });

    // Helper command to test
    bot.command('ping', (ctx) => ctx.reply('Pong! El bot está operativo.'));

    // En producción (Vercel serverless) NO iniciamos el long-polling: bloquearía la función.
    // broadcastAlert() sigue funcionando via bot.telegram.sendMessage() (HTTP puro).
    if (process.env.NODE_ENV !== 'production') {
        try {
            bot.launch().then(() => {
                logger.info('Telegram Bot successfully launched.');
            });
            process.once('SIGINT', () => bot!.stop('SIGINT'));
            process.once('SIGTERM', () => bot!.stop('SIGTERM'));
        } catch (e) {
            logger.error('Could not start Telegram Bot: %s', (e as Error).message);
        }
    } else {
        logger.info('Telegram Bot: long-polling deshabilitado en producción (serverless).');
    }
} else {
    logger.warn('TELEGRAM_BOT_TOKEN no definido en .env. El bot de Telegram está desactivado.');
}

/**
 * Función para mandar broadcast a todos los usuarios
 */
export async function broadcastAlert(message: string) {
    if (!bot) return;

    try {
        // Buscar todos usuarios con telegramId seteado
        const users = await prisma.user.findMany({
            where: { telegramId: { not: null } }
        });

        for (const user of users) {
            if (user.telegramId) {
                await bot.telegram.sendMessage(user.telegramId, message, { parse_mode: 'Markdown' })
                    .catch(err => logger.warn(`No se pudo enviar telegram a ${user.telegramId}: ${err.message}`));
            }
        }
    } catch (err) {
        logger.error('Error broadcasting Telegram message: %s', (err as Error).message);
    }
}
