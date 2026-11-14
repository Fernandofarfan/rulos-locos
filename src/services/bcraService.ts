import config from '../config';
import logger from '../utils/logger';

const BCRA_OFFICIAL_BASE = 'https://api.bcra.gob.ar';

const ID_RESERVAS = 1;
const ID_BASE_MONETARIA = 15;

interface BCRAVariableResult {
    valor: number;
    fecha: string;
}
interface SourcedValue { value: number; source: string }

async function getBCRAVariable(idVariable: number): Promise<BCRAVariableResult> {
    const url = `${BCRA_OFFICIAL_BASE}/estadisticas/v4.0/monetarias/${idVariable}?offset=0&limit=10`;
    const r = await fetch(url, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(7000),
    } as Parameters<typeof fetch>[1]);
    if (!r.ok) throw new Error(`BCRA oficial v4 HTTP ${r.status} para idVariable ${idVariable}`);
    const json = await r.json() as { results?: Array<{ detalle?: BCRAVariableResult[] }> };
    const latest = json.results?.flatMap(result => result.detalle ?? [])
        .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
    if (latest && Number.isFinite(latest.valor)) return latest;
    throw new Error(`BCRA oficial v4: sin resultados para idVariable ${idVariable}`);
}

class BCRAService {
    async getReserves(): Promise<number | null> {
        return (await this.getReservesWithSource())?.value ?? null;
    }

    async getReservesWithSource(): Promise<SourcedValue | null> {
        try {
            const { valor, fecha } = await getBCRAVariable(ID_RESERVAS);
            logger.info('BCRA oficial v4 reservas: %s M USD (fecha: %s)', valor, fecha);
            return { value: valor, source: 'BCRA' };
        } catch (e1) {
            logger.warn('BCRA oficial v4 getReserves falló: %s — intentando estadisticasbcra.com', (e1 as Error).message);
            try {
                if (!config.BCRA_TOKEN) throw new Error('Sin BCRA_TOKEN');
                const r = await fetch(`${config.API_URLS.BCRA_STATS}/reservas`, {
                    headers: { ...config.DEFAULT_HEADERS, 'Authorization': `BEARER ${config.BCRA_TOKEN}` },
                    signal: AbortSignal.timeout(5000),
                } as Parameters<typeof fetch>[1]);
                if (!r.ok) throw new Error(`estadisticasbcra HTTP ${r.status}`);
                const data = await r.json() as Array<{ v: number; d: string }>;
                if (Array.isArray(data) && data.length > 0) {
                    const last = data[data.length - 1];
                    logger.info('estadisticasbcra reservas: %s (fecha: %s)', last.v, last.d);
                    return { value: last.v, source: 'estadisticasbcra.com' };
                }
            } catch (e2) {
                logger.warn('estadisticasbcra getReserves falló: %s', (e2 as Error).message);
            }
            return null;
        }
    }

    async getBaseMonetaria(): Promise<number | null> {
        return (await this.getBaseMonetariaWithSource())?.value ?? null;
    }

    async getBaseMonetariaWithSource(): Promise<SourcedValue | null> {
        try {
            const { valor, fecha } = await getBCRAVariable(ID_BASE_MONETARIA);
            const valorEnPesos = valor * 1_000_000;
            logger.info('BCRA oficial v4 base monetaria: %s M ARS (fecha: %s)', valor, fecha);
            return { value: valorEnPesos, source: 'BCRA' };
        } catch (e1) {
            logger.warn('BCRA oficial v4 getBaseMonetaria falló: %s — intentando estadisticasbcra.com', (e1 as Error).message);
            try {
                if (!config.BCRA_TOKEN) throw new Error('Sin BCRA_TOKEN');
                const r = await fetch(`${config.API_URLS.BCRA_STATS}/base`, {
                    headers: { ...config.DEFAULT_HEADERS, 'Authorization': `BEARER ${config.BCRA_TOKEN}` },
                    signal: AbortSignal.timeout(5000),
                } as Parameters<typeof fetch>[1]);
                if (!r.ok) throw new Error(`estadisticasbcra HTTP ${r.status}`);
                const data = await r.json() as Array<{ v: number; d: string }>;
                if (Array.isArray(data) && data.length > 0) {
                    const last = data[data.length - 1];
                    logger.info('estadisticasbcra base monetaria: %s (fecha: %s)', last.v, last.d);
                    return { value: last.v, source: 'estadisticasbcra.com' };
                }
            } catch (e2) {
                logger.warn('estadisticasbcra getBaseMonetaria falló: %s', (e2 as Error).message);
            }
            return null;
        }
    }
}

export default new BCRAService();
