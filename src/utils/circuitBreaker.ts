/**
 * circuitBreaker.ts
 * Patrón Circuit Breaker simple para envolver llamadas a APIs externas.
 * Estados: CLOSED (funcionando) → OPEN (falló N veces) → HALF-OPEN (probando recuperación)
 */

import logger from './logger';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
    failureThreshold?: number;   // Número de fallos antes de abrir el circuito
    successThreshold?: number;   // Éxitos necesarios en HALF_OPEN para cerrar
    timeout?: number;            // ms en OPEN antes de pasar a HALF_OPEN
    name?: string;               // Nombre para logging
}

export class CircuitBreaker {
    private state: CircuitState = 'CLOSED';
    private failureCount = 0;
    private successCount = 0;
    private lastFailureTime = 0;

    private readonly failureThreshold: number;
    private readonly successThreshold: number;
    private readonly timeout: number;
    private readonly name: string;

    constructor(options: CircuitBreakerOptions = {}) {
        this.failureThreshold = options.failureThreshold ?? 3;
        this.successThreshold = options.successThreshold ?? 2;
        this.timeout = options.timeout ?? 30_000;
        this.name = options.name ?? 'CircuitBreaker';
    }

    get isOpen(): boolean {
        return this.state === 'OPEN';
    }

    get status(): CircuitState {
        return this.state;
    }

    async execute<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
        if (this.state === 'OPEN') {
            // Verificar si ya pasó el timeout → pasar a HALF_OPEN
            if (Date.now() - this.lastFailureTime >= this.timeout) {
                this.state = 'HALF_OPEN';
                this.successCount = 0;
                logger.info(`[${this.name}] Circuito HALF-OPEN — probando recuperación`);
            } else {
                logger.warn(`[${this.name}] Circuito OPEN — usando fallback`);
                return fallback();
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            logger.error(`[${this.name}] Falló (${this.failureCount}/${this.failureThreshold}):`, (error as Error).message);
            return fallback();
        }
    }

    private onSuccess(): void {
        this.failureCount = 0;
        if (this.state === 'HALF_OPEN') {
            this.successCount++;
            if (this.successCount >= this.successThreshold) {
                this.state = 'CLOSED';
                logger.info(`[${this.name}] Circuito CERRADO — API recuperada`);
            }
        }
    }

    private onFailure(): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
            logger.error(`[${this.name}] Circuito ABIERTO — demasiados fallos, usando fallback por ${this.timeout / 1000}s`);
        }
    }
}
