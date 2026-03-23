import arbitrageService from '../services/arbitrageService';
import logger from '../utils/logger';
import cache from '../utils/cache';
import type { Server } from 'socket.io';

class ArbitrageWorker {
    private interval: ReturnType<typeof setInterval> | null = null;
    private io: Server | null = null;

    start(io: Server): void {
        this.io = io;
        logger.info('🚀 Iniciando ArbitrageWorker...');
        void this.runTask();
        this.interval = setInterval(() => { void this.runTask(); }, 60000);
    }

    async runTask(): Promise<void> {
        try {
            logger.info('🔍 Ejecutando análisis de arbitraje en segundo plano...');
            const result = await arbitrageService.calculateArbitrage();
            cache.set('arbitrage_data', result, 60000);
            if (this.io) {
                this.io.emit('arbitrage-update', result);
                logger.info('📡 Actualización de arbitraje enviada a los clientes.');
            }
        } catch (error) {
            logger.error('❌ Error en ArbitrageWorker: %s', (error as Error).stack);
        }
    }

    stop(): void {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            logger.info('🛑 ArbitrageWorker detenido.');
        }
    }
}

export default new ArbitrageWorker();
