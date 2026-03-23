import { Request, Response } from 'express';
import logger from '../utils/logger';
import dolarApiService from '../services/dolarApiService';
import cryptoYaService from '../services/cryptoYaService';

/**
 * Telegram Bot Controller — Handles incoming webhook messages from Telegram.
 * Supported commands:
 *   /blue     → Precio actual del Blue
 *   /rulo     → Mejor rulo del día
 *   /mep      → Precio del MEP
 *   /crypto   → Precio USDT/ARS
 *   /help     → Lista de comandos
 */
export class TelegramBotController {
    private token = process.env.TELEGRAM_BOT_TOKEN || '';
    // chatId acá solo se usa si enviamos global, pero para webhook se usa const chatId = message.chat.id

    async registerWebhook(req: Request, res: Response): Promise<void> {
        try {
            if (!this.token) {
                res.status(400).json({ error: 'TELEGRAM_BOT_TOKEN no configurado' });
                return;
            }
            
            // Si el front manda el host (ej: https://app.vercel.app), lo usamos. Si no, usamos el req.hostname
            // En Vercel req.hostname es tu dominio
            const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
            const host = req.body.url || req.headers.host; 
            const webhookUrl = `${protocol}://${host}/api/telegram/webhook`;

            const url = `https://api.telegram.org/bot${this.token}/setWebhook`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: webhookUrl }),
            });
            const data = await response.json();
            res.json({ success: true, webhookUrl, telegramResponse: data });
        } catch (error: any) {
            logger.error('Error registrando webhook: %s', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    async handleWebhook(req: Request, res: Response): Promise<void> {
        try {
            const { message } = req.body;
            if (!message?.text) { res.json({ ok: true }); return; }

            const text = message.text.trim();
            const chatId = message.chat.id.toString();
            let reply = '';

            switch (text.split(' ')[0]) {
                case '/blue':
                    reply = await this.getBluePrice();
                    break;
                case '/mep':
                    reply = await this.getMepPrice();
                    break;
                case '/crypto':
                    reply = await this.getCryptoPrice();
                    break;
                case '/rulo':
                    reply = await this.getBestRulo();
                    break;
                case '/start':
                case '/help':
                    reply = this.getHelpText();
                    break;
                default:
                    reply = '❓ Comando no reconocido. Usá /help para ver los comandos disponibles.';
            }

            await this.sendMessage(chatId, reply);
            res.json({ ok: true });
        } catch (error: any) {
            logger.error('Telegram webhook error: %s', error.message);
            res.json({ ok: true }); // Always 200 for Telegram
        }
    }

    private async getBluePrice(): Promise<string> {
        const dolares = await dolarApiService.getAllDollars();
        const blue = dolares.find((d: any) => d.casa === 'blue');
        if (!blue) return '❌ No se pudo obtener el precio del Blue.';
        return `💵 *Dólar Blue*\n💰 Compra: $${blue.compra}\n💰 Venta: $${blue.venta}\n🕐 ${new Date().toLocaleTimeString('es-AR')}`;
    }

    private async getMepPrice(): Promise<string> {
        const dolares = await dolarApiService.getAllDollars();
        const mep = dolares.find((d: any) => d.casa === 'bolsa');
        if (!mep) return '❌ No se pudo obtener el precio del MEP.';
        return `📈 *Dólar MEP*\n💰 Compra: $${mep.compra}\n💰 Venta: $${mep.venta}\n🕐 ${new Date().toLocaleTimeString('es-AR')}`;
    }

    private async getCryptoPrice(): Promise<string> {
        const data = await cryptoYaService.getBinanceP2P();
        if (!data) return '❌ No se pudo obtener el precio crypto.';
        return `₿ *USDT/ARS (Binance P2P)*\n💰 Ask: $${data.ask}\n💰 Bid: $${data.bid}\n🕐 ${new Date().toLocaleTimeString('es-AR')}`;
    }

    private async getBestRulo(): Promise<string> {
        const [dolares, crypto] = await Promise.allSettled([
            dolarApiService.getAllDollars(),
            cryptoYaService.getBinanceP2P(),
        ]);

        const dolaresData = dolares.status === 'fulfilled' ? dolares.value : [];
        const cryptoData = crypto.status === 'fulfilled' ? crypto.value : null;

        const blue = dolaresData.find((d: any) => d.casa === 'blue');
        const mep = dolaresData.find((d: any) => d.casa === 'bolsa');

        if (!blue || !mep) return '❌ No hay datos suficientes para calcular el rulo.';

        const spreadMepBlue = ((blue.compra - mep.venta) / mep.venta * 100).toFixed(2);
        const spreadCryptoBlue = cryptoData ? ((blue.compra - cryptoData.ask) / cryptoData.ask * 100).toFixed(2) : 'N/A';

        return `🔄 *Mejor Rulo del Momento*\n\n📊 MEP→Blue: ${spreadMepBlue}%\n📊 Crypto→Blue: ${spreadCryptoBlue}%\n\n💵 Blue compra: $${blue.compra}\n📈 MEP venta: $${mep.venta}\n${cryptoData ? `₿ USDT ask: $${cryptoData.ask}` : ''}\n\n🕐 ${new Date().toLocaleTimeString('es-AR')}`;
    }

    private getHelpText(): string {
        return `🤖 *Rulos Locos Bot*\n\nComandos disponibles:\n/blue — Precio del dólar Blue\n/mep — Precio del dólar MEP\n/crypto — Precio USDT/ARS\n/rulo — Mejor rulo del momento\n/help — Este mensaje\n\n⚡ rulos-locos.vercel.app`;
    }

    private async sendMessage(chatId: string, text: string): Promise<void> {
        if (!this.token) { logger.warn('TELEGRAM_BOT_TOKEN not set'); return; }
        const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
        });
    }
}

export const telegramBotController = new TelegramBotController();
