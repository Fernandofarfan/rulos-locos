import marketService from '../services/marketService';
import logger from '../utils/logger';
import cache from '../utils/cache';

const MARKET_POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
const MARKET_CACHE_TTL_MS = 6 * 60 * 1000; // 6 minutos (algo más que el intervalo)

class MarketWorker {
    private interval: ReturnType<typeof setInterval> | null = null;
    start(): void {
        logger.info('📈 Iniciando MarketWorker (polling cada 5 min)...');
        void this.runTask().catch(() => {});
        this.interval = setInterval(() => { void this.runTask().catch(() => {}); }, MARKET_POLL_INTERVAL_MS);
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

            logger.info(
                '✅ MarketWorker: caché actualizado — merval:%d cedears:%d bonds:%d global:%d',
                merval.length, cedears.length, bonds.length, global.length,
            );
        } catch (error) {
            logger.error('❌ Error en MarketWorker: %s', (error as Error).stack);
            throw error;
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
