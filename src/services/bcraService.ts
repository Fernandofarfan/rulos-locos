import fetch from 'node-fetch';
import https from 'https';
import config from '../config';
import logger from '../utils/logger';

const BCRA_OFFICIAL_BASE = 'https://api.bcra.gob.ar';
const sslAgent = new https.Agent({ rejectUnauthorized: false });

const ID_RESERVAS = 1;
const ID_BASE_MONETARIA = 15;

interface BCRAVariableResult {
    valor: number;
    fecha: string;
}

async function getBCRAVariable(idVariable: number): Promise<BCRAVariableResult> {
    const url = `${BCRA_OFFICIAL_BASE}/estadisticas/v3.0/monetarias/${idVariable}?offset=0&limit=1`;
    const r = await fetch(url, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        agent: sslAgent as unknown as Parameters<typeof fetch>[1] extends { agent?: unknown } ? Parameters<typeof fetch>[1]['agent'] : never,
        signal: AbortSignal.timeout(7000),
    } as Parameters<typeof fetch>[1]);
    if (!r.ok) throw new Error(`BCRA oficial v3 HTTP ${r.status} para idVariable ${idVariable}`);
    const json = await r.json() as { results?: Array<{ valor: number; fecha: string }> };
    if (json.results && json.results.length > 0) {
        return { valor: json.results[0].valor, fecha: json.results[0].fecha };
    }
    throw new Error(`BCRA oficial v3: sin resultados para idVariable ${idVariable}`);
}

class BCRAService {
    async getReserves(): Promise<number | null> {
        try {
            const { valor, fecha } = await getBCRAVariable(ID_RESERVAS);
            logger.info('BCRA oficial v3 reservas: %s M USD (fecha: %s)', valor, fecha);
            return valor;
        } catch (e1) {
            logger.warn('BCRA oficial v3 getReserves falló: %s — intentando estadisticasbcra.com', (e1 as Error).message);
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
                    return last.v;
                }
            } catch (e2) {
                logger.warn('estadisticasbcra getReserves falló: %s', (e2 as Error).message);
            }
            return 45305;
        }
    }

    async getBaseMonetaria(): Promise<number | null> {
        try {
            const { valor, fecha } = await getBCRAVariable(ID_BASE_MONETARIA);
            const valorEnPesos = valor * 1_000_000;
            logger.info('BCRA oficial v3 base monetaria: %s M ARS (fecha: %s)', valor, fecha);
            return valorEnPesos;
        } catch (e1) {
            logger.warn('BCRA oficial v3 getBaseMonetaria falló: %s — intentando estadisticasbcra.com', (e1 as Error).message);
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
                    return last.v;
                }
            } catch (e2) {
                logger.warn('estadisticasbcra getBaseMonetaria falló: %s', (e2 as Error).message);
            }
            return 60500000000000;
        }
    }
}

export default new BCRAService();
