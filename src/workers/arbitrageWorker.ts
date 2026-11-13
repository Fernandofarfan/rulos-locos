import arbitrageService from '../services/arbitrageService';
import logger from '../utils/logger';
import cache from '../utils/cache';
import * as spreadHistory from '../utils/spreadHistory';

class ArbitrageWorker {
    private interval: ReturnType<typeof setInterval> | null = null;
    start(): void {
        logger.info('🚀 Iniciando ArbitrageWorker...');
        void this.runTask().catch(() => {});
        this.interval = setInterval(() => { void this.runTask().catch(() => {}); }, 60000);
    }

    async runTask(): Promise<void> {
        try {
            logger.info('🔍 Ejecutando análisis de arbitraje en segundo plano...');
            const result = await arbitrageService.calculateArbitrage();
            cache.set('arbitrage_data', result, 60000);
            await spreadHistory.ensureLoaded();
            await spreadHistory.appendResult(result);
        } catch (error) {
            logger.error('❌ Error en ArbitrageWorker: %s', (error as Error).stack);
            throw error;
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
