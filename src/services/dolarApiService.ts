import config from '../config';
import { CircuitBreaker } from '../utils/circuitBreaker';

export interface DolarCasa {
    casa: string;
    nombre: string;
    compra: number;
    venta: number;
    fechaActualizacion?: string;
    source?: string;
    isEstimated?: boolean;
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
        return this.cb.execute<DolarCasa[]>(
            async () => {
                const response = await fetch(`${config.API_URLS.DOLARAPI}/dolares`, {
                    headers: config.DEFAULT_HEADERS,
                    signal: AbortSignal.timeout(5000),
                } as Parameters<typeof fetch>[1]);
                if (!response.ok) throw new Error('Error en DolarAPI');
                const values = await response.json() as DolarCasa[];
                return values.map(value => ({ ...value, source: 'DolarAPI', isEstimated: false }));
            },
            () => FALLBACK_DOLLARS.map(value => ({ ...value, source: 'estimado', isEstimated: true }))
        );
    }

    async getBlueDollar(): Promise<DolarCasa> {
        try {
            const response = await fetch(`${config.API_URLS.DOLARAPI}/dolares/blue`, {
                headers: config.DEFAULT_HEADERS,
                signal: AbortSignal.timeout(5000),
            } as Parameters<typeof fetch>[1]);
            if (!response.ok) throw new Error('Error obteniendo dólar blue');
            return { ...await response.json() as DolarCasa, source: 'DolarAPI', isEstimated: false };
        } catch {
            return { compra: 1150, venta: 1180, casa: 'blue', nombre: 'Blue', source: 'estimado', isEstimated: true };
        }
    }
}

export default new DolarApiService();
