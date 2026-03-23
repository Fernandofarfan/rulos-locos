import fetch from 'node-fetch';

class NotificationService {
    async sendTelegramMessage(message: string): Promise<boolean> {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (!botToken || !chatId) {
            console.warn('Telegram Notification: Credenciales no configuradas (TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID faltantes en .env)');
            return false;
        }
        try {
            const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error enviando mensaje a Telegram:', errorData);
                return false;
            }
            return true;
        } catch (err) {
            console.error('Error enviando mensaje a Telegram:', (err as Error).message);
            return false;
        }
    }

    async sendPriceAlert(asset: string, targetPrice: number, currentPrice: number, condition: string): Promise<boolean> {
        const emoji = currentPrice >= targetPrice ? '🚀' : '📉';
        const direction = condition === 'above' ? 'superado' : 'caído por debajo de';
        const message = `
<b>🔔 Alerta de Precio - Rulos Locos</b>
${emoji} El <b>${asset.toUpperCase()}</b> ha ${direction} tu objetivo.

🎯 Objetivo: $${targetPrice}
💰 Actual: $${currentPrice}

<a href="https://rulos-locos-dashboard.vercel.app">Ver Dashboard</a>
        `;
        return this.sendTelegramMessage(message);
    }
}

export default new NotificationService();
