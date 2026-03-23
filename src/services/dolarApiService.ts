import fetch from 'node-fetch';
import config from '../config';
import { CircuitBreaker } from '../utils/circuitBreaker';

export interface DolarCasa {
    casa: string;
    nombre: string;
    compra: number;
    venta: number;
    fechaActualizacion?: string;
}

const FALLBACK_DOLLARS: DolarCasa[] = [
    { casa: 'oficial', compra: 1040, venta: 1090, nombre: 'Oficial' },
    { casa: 'blue', compra: 1150, venta: 1180, nombre: 'Blue' },
    { casa: 'bolsa', compra: 1110, venta: 1135, nombre: 'MEP' },
    { casa: 'contadoconliqui', compra: 1190, venta: 1210, nombre: 'CCL' },
    { casa: 'cripto', compra: 1200, venta: 1220, nombre: 'Cripto' },
    { casa: 'tarjeta', compra: 1744, venta: 1744, nombre: 'Tarjeta' },
];

class DolarApiService {
    private readonly cb = new CircuitBreaker({ name: 'DolarAPI', failureThreshold: 3, timeout: 30_000 });

    async getAllDollars(): Promise<DolarCasa[]> {
        return this.cb.execute(
            async () => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                const response = await fetch(`${config.API_URLS.DOLARAPI}/dolares`, {
                    headers: config.DEFAULT_HEADERS,
                    signal: controller.signal as Parameters<typeof fetch>[1] extends object ? AbortSignal : never,
                } as Parameters<typeof fetch>[1]);
                clearTimeout(timeoutId);
                if (!response.ok) throw new Error('Error en DolarAPI');
                return await response.json() as DolarCasa[];
            },
            () => FALLBACK_DOLLARS
        );
    }

    async getBlueDollar(): Promise<DolarCasa> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(`${config.API_URLS.DOLARAPI}/dolares/blue`, {
                headers: config.DEFAULT_HEADERS,
                signal: controller.signal as unknown as AbortSignal,
            } as Parameters<typeof fetch>[1]);
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error('Error obteniendo dólar blue');
            return await response.json() as DolarCasa;
        } catch {
            return { compra: 1150, venta: 1180, casa: 'blue', nombre: 'Blue', fechaActualizacion: new Date().toISOString() };
        }
    }
}

export default new DolarApiService();
