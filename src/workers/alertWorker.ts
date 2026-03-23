import alertService from '../services/alertService';
import logger from '../utils/logger';

/**
 * Alert Worker - Ejecuta verificación de alertas periódicamente
 *
 * En producción (Vercel): Se ejecutaría desde una función serverless
 * En desarrollo: Se ejecuta como interval
 */

class AlertWorker {
    private interval: ReturnType<typeof setInterval> | null = null;
    private isRunning = false;

    start(checkIntervalMs: number = 120_000): void {
        if (this.isRunning) {
            logger.warn('AlertWorker ya está en ejecución');
            return;
        }

        this.isRunning = true;
        logger.info('🚀 Iniciando AlertWorker (intervalo: %dms)...', checkIntervalMs);

        // Ejecutar inmediatamente
        void this.runTask();

        // Luego cada X milisegundos
        this.interval = setInterval(() => { void this.runTask(); }, checkIntervalMs);
    }

    stop(): void {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
        logger.info('AlertWorker detenido');
    }

    async runTask(): Promise<void> {
        try {
            logger.debug('🔔 AlertWorker: Verificando alertas...');
            await alertService.checkAndTriggerAlerts();
            logger.debug('✅ AlertWorker: Verificación completada');
        } catch (error) {
            logger.error('❌ AlertWorker error: %s', (error as Error).message);
        }
    }

    async checkNow(): Promise<void> {
        logger.info('⚡ AlertWorker: Verificación manual solicitada');
        await this.runTask();
    }

    getStatus(): { running: boolean } {
        return { running: this.isRunning };
    }
}

export default new AlertWorker();
