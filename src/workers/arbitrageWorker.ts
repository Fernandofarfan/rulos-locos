import arbitrageService from '../services/arbitrageService';
import logger from '../utils/logger';
import cache from '../utils/cache';
import * as spreadHistory from '../utils/spreadHistory';
import { recordRuloSnapshots } from '../services/ruloHistory';
import { pruneAnalytics } from '../controllers/analyticsController';
import prisma from '../utils/db';

class ArbitrageWorker {
    private interval: ReturnType<typeof setInterval> | null = null;
    start(): void {
        logger.info('🚀 Iniciando ArbitrageWorker...');
        void this.runTask().catch(() => {});
        this.interval = setInterval(() => { void this.runTask().catch(() => {}); }, 60000);
    }

    async runTask(): Promise<void | 'skipped'> {
        try {
            logger.info('🔍 Ejecutando análisis de arbitraje en segundo plano...');
            const result = await arbitrageService.calculateArbitrage();
            await cache.setShared('arbitrage_data', result, 360000);
            const platforms = [
                { id: 'binancep2p', name: 'Binance P2P', icon: '🟡' },
                { id: 'ripio', name: 'Ripio', icon: '🔵' },
                { id: 'buenbit', name: 'Buenbit', icon: '🟢' },
                { id: 'letsbit', name: "Let'sBit", icon: '🟠' },
                { id: 'lemoncash', name: 'Lemon', icon: '🟡' },
                { id: 'satoshitango', name: 'SatoshiTango', icon: '🟣' },
            ].map(platform => {
                const quote = result.cryptos.USDT?.[platform.id];
                return { ...platform, ask: quote?.ask ?? null, bid: quote?.bid ?? null,
                    available: !!quote?.available, source: 'CriptoYa', isEstimated: false, updatedAt: quote?.timestamp };
            });
            await cache.setShared('platforms_data', { available: platforms.filter(platform => platform.available).sort((a, b) => (a.ask ?? 0) - (b.ask ?? 0)),
                unavailable: platforms.filter(platform => !platform.available), count: platforms.filter(platform => platform.available).length,
                timestamp: result.timestamp }, 360000);
            await spreadHistory.ensureLoaded();
            await spreadHistory.appendResult(result);
            if (!prisma) return 'skipped';
            await recordRuloSnapshots(result);
            await pruneAnalytics();
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
