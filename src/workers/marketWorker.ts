import marketService from '../services/marketService';
import logger from '../utils/logger';
import cache from '../utils/cache';
import type { Server } from 'socket.io';

const MARKET_POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
const MARKET_CACHE_TTL_MS = 6 * 60 * 1000; // 6 minutos (algo más que el intervalo)

class MarketWorker {
    private interval: ReturnType<typeof setInterval> | null = null;
    private io: Server | null = null;

    start(io?: Server): void {
        if (io) this.io = io;
        logger.info('📈 Iniciando MarketWorker (polling cada 5 min)...');
        void this.runTask();
        this.interval = setInterval(() => { void this.runTask(); }, MARKET_POLL_INTERVAL_MS);
    }

    async runTask(): Promise<void> {
        try {
            logger.info('📊 MarketWorker: actualizando datos de mercado en caché...');
            const [merval, cedears, bonds, global] = await Promise.all([
                marketService.getMervalStocks(),
                marketService.getCedears(),
                marketService.getBonds(),
                marketService.getGlobalIndices(),
            ]);

            const payload = {
                merval,
                cedears,
                bonds,
                global,
                timestamp: new Date().toISOString(),
            };

            cache.set('market_data', payload, MARKET_CACHE_TTL_MS);

            // Emitir actualización en tiempo real a todos los clientes conectados
            if (this.io) {
                this.io.emit('market-update', payload);
                logger.info('📡 market-update emitido via Socket.IO');
            }

            logger.info(
                '✅ MarketWorker: caché actualizado — merval:%d cedears:%d bonds:%d global:%d',
                merval.length, cedears.length, bonds.length, global.length,
            );
        } catch (error) {
            logger.error('❌ Error en MarketWorker: %s', (error as Error).stack);
        }
    }

    stop(): void {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            logger.info('🛑 MarketWorker detenido.');
        }
    }
}

export default new MarketWorker();
