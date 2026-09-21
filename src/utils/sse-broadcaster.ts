import { Response } from 'express';
import dolarApiService from '../services/dolarApiService';
import logger from './logger';

/**
 * SSE Broadcaster singleton — comparte una sola conexión HTTP a DolarApi
 * entre todos los clientes SSE conectados, en vez de crear un interval por cliente.
 */
class SSEBroadcaster {
    private clients: Set<Response> = new Set();
    private interval: ReturnType<typeof setInterval> | null = null;
    private readonly INTERVAL_MS = 30_000;

    addClient(res: Response): void {
        this.clients.add(res);
        logger.info('SSE client connected. Total: %d', this.clients.size);

        if (!this.interval) {
            this.startBroadcasting();
        }
    }

    removeClient(res: Response): void {
        this.clients.delete(res);
        logger.info('SSE client disconnected. Total: %d', this.clients.size);

        if (this.clients.size === 0 && this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    private startBroadcasting(): void {
        const sendRates = async () => {
            try {
                const rates = await dolarApiService.getAllDollars();
                const blue = rates.find((r: any) => r.casa === 'blue');
                const mep = rates.find((r: any) => r.casa === 'bolsa');
                const data = JSON.stringify({ blue: blue?.venta, mep: mep?.venta, ts: Date.now() });
                this.broadcast(data);
            } catch {
                // ignore — will retry next interval
            }
        };

        // Send immediately on first client connect
        sendRates();
        this.interval = setInterval(sendRates, this.INTERVAL_MS);
    }

    private broadcast(data: string): void {
        for (const client of this.clients) {
            try {
                client.write(`data: ${data}\n\n`);
            } catch {
                this.clients.delete(client);
            }
        }
    }
}

export const sseBroadcaster = new SSEBroadcaster();
