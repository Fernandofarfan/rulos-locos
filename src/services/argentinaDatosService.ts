import fetch from 'node-fetch';
import https from 'https';
import config from '../config';
import logger from '../utils/logger';

const sslAgent = new https.Agent({ rejectUnauthorized: false });

export interface InflationData {
    mensual: number;
    interanual: number;
    fecha: string;
}

export interface DollarSeriesItem {
    fecha: string;
    valor: number;
    compra?: number;
    casa?: string;
}

export interface DollarSeries {
    blue: DollarSeriesItem[];
    mep: DollarSeriesItem[];
    ccl: DollarSeriesItem[];
    oficial: DollarSeriesItem[];
}

export interface DateValueItem {
    fecha: string;
    valor: number;
    isOfficial?: boolean;
}

export interface InflacionCategoria {
    categoria: string;
    valor: number;
}

export interface DepositRate {
    fecha: string;
    valor: number;
}

export interface UVAItem {
    fecha: string;
    valor: number;
}

export interface HolidayItem {
    fecha: string;
    tipo: string;
    nombre: string;
}

export interface PlazoFijoItem {
    entidad: string;
    tnaClientes?: number;
    tnaNoClientes?: number;
    [key: string]: unknown;
}

export interface FCIItem {
    vcp?: number;
    [key: string]: unknown;
}

class ArgentinaDatosService {
    async getInflation(): Promise<InflationData> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(`${config.API_URLS.ARGENTINA_DATOS}/finanzas/indices/inflacion/`, {
                headers: config.DEFAULT_HEADERS,
                signal: controller.signal as unknown as AbortSignal,
            } as Parameters<typeof fetch>[1]);
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            const data = await response.json() as Array<{ fecha: string; valor: number }>;

            if (Array.isArray(data) && data.length > 0) {
                const sorted = [...data].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
                const lastMonth = sorted[0];
                const last12 = sorted.slice(0, 12);
                const interanualCalc = last12.length >= 12
                    ? (last12.reduce((acc, m) => acc * (1 + (m.valor ?? 0) / 100), 1) - 1) * 100
                    : null;
                return { mensual: lastMonth.valor, interanual: interanualCalc ?? 18.5, fecha: lastMonth.fecha };
            }
            throw new Error('Empty Data');
        } catch (err) {
            logger.warn('ArgentinaDatosService.getInflation fallback: %s', (err as Error).message);
            return { mensual: 1.2, interanual: 18.5, fecha: new Date().toISOString().split('T')[0] };
        }
    }

    async getHistoricalInflation(): Promise<Array<{ fecha: string; valor: number }>> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(`${config.API_URLS.ARGENTINA_DATOS}/finanzas/indices/inflacion/`, {
                headers: config.DEFAULT_HEADERS,
                signal: controller.signal as unknown as AbortSignal,
            } as Parameters<typeof fetch>[1]);
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error('API Error');
            const data = await response.json() as Array<{ fecha: string; valor: number }>;
            if (!Array.isArray(data) || data.length === 0) throw new Error('Empty API Data');
            return [...data].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        } catch (err) {
            logger.warn('Using inflation fallback: %s', (err as Error).message);
            const result: Array<{ fecha: string; valor: number }> = [];
            let val = 3.5;
            const now = new Date();
            for (let i = 24; i >= 0; i--) {
                const date = new Date(now);
                date.setMonth(now.getMonth() - i);
                val = Math.max(1.0, val + (Math.random() - 0.5));
                result.push({ fecha: date.toISOString().split('T')[0], valor: parseFloat(val.toFixed(1)) });
            }
            return result;
        }
    }

    async getInflacionCategorias(): Promise<InflacionCategoria[] | null> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(
                `${config.API_URLS.ARGENTINA_DATOS}/finanzas/indices/inflacion_categorias/`,
                {
                    headers: config.DEFAULT_HEADERS,
                    signal: controller.signal as unknown as AbortSignal,
                } as Parameters<typeof fetch>[1],
            );
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json() as InflacionCategoria[];
            if (Array.isArray(data) && data.length > 0) return data;
            throw new Error('Empty response');
        } catch (e) {
            logger.warn('getInflacionCategorias fallback: %s', (e as Error).message);
            return null;
        }
    }

    getPovertyData(): DateValueItem[] {
        return [
            { fecha: '2022-01-01', valor: 37.3, isOfficial: true },
            { fecha: '2022-07-01', valor: 36.5, isOfficial: true },
            { fecha: '2023-01-01', valor: 40.1, isOfficial: true },
            { fecha: '2023-07-01', valor: 41.7, isOfficial: true },
            { fecha: '2024-01-01', valor: 52.9, isOfficial: true },
            { fecha: '2024-07-01', valor: 38.1, isOfficial: true },
            { fecha: '2025-01-01', valor: 31.6, isOfficial: true },
            { fecha: '2025-07-01', valor: 29.8, isOfficial: false },
        ];
    }

    async getCountryRiskData(): Promise<Array<{ fecha: string; valor: number }>> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(`${config.API_URLS.ARGENTINA_DATOS}/finanzas/indices/riesgo-pais/`, {
                headers: config.DEFAULT_HEADERS,
                signal: controller.signal as unknown as AbortSignal,
            } as Parameters<typeof fetch>[1]);
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error('API Error Risk');
            const data = await response.json() as Array<{ fecha: string; valor: number }>;
            if (!Array.isArray(data) || data.length === 0) throw new Error('Empty Risk Data');
            return [...data].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        } catch (e) {
            logger.warn('Risk API Fallback: %s', (e as Error).message);
            const mockData: Array<{ fecha: string; valor: number }> = [];
            let val = 1200;
            const now = new Date();
            for (let i = 365; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                val += (Math.random() - 0.5) * 20;
                mockData.push({ fecha: d.toISOString().split('T')[0], valor: parseFloat(val.toFixed(0)) });
            }
            return mockData;
        }
    }

    async getRisk(): Promise<number> {
        try {
            const data = await this.getCountryRiskData();
            if (data.length > 0) return data[data.length - 1].valor;
            return 633;
        } catch (e) {
            logger.warn('getRisk fallback: %s', (e as Error).message);
            return 1450;
        }
    }

    private async fetchTypeSeries(tipo: string, fallbackStart: number): Promise<DollarSeriesItem[]> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const url = `${config.API_URLS.ARGENTINA_DATOS}/cotizaciones/dolares/${tipo}/`;
            const response = await fetch(url, {
                headers: config.DEFAULT_HEADERS,
                signal: controller.signal as unknown as AbortSignal,
            } as Parameters<typeof fetch>[1]);
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`HTTP ${response.status} para ${tipo}`);
            const data = await response.json() as Array<{ fecha: string; venta?: number; compra?: number; valor?: number }>;
            if (!Array.isArray(data) || data.length === 0) throw new Error('Empty');
            const sample = <T>(arr: T[], max = 500) => {
                if (arr.length <= max) return arr;
                const step = Math.floor(arr.length / max);
                return arr.filter((_, i) => i % step === 0 || i === arr.length - 1);
            };
            const mapped = data
                .map(d => ({ fecha: d.fecha, valor: parseFloat(String(d.venta ?? d.valor ?? 0)), compra: parseFloat(String(d.compra ?? d.valor ?? 0)) }))
                .filter(d => !isNaN(d.valor) && d.valor > 0)
                .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
            return sample(mapped);
        } catch (err) {
            logger.warn('fetchTypeSeries %s fallback: %s', tipo, (err as Error).message);
            return this.generateMockSeries(fallbackStart);
        }
    }

    async getHistoricalDollars(): Promise<DollarSeries> {
        try {
            // Fetch each type in parallel using type-specific endpoints (much faster than /dolares/ general)
            const [blue, mep, ccl, oficial] = await Promise.all([
                this.fetchTypeSeries('blue', 1420),
                this.fetchTypeSeries('bolsa', 1425),
                this.fetchTypeSeries('contadoconliqui', 1460),
                this.fetchTypeSeries('oficial', 1090),
            ]);
            return { blue, mep, ccl, oficial };
        } catch (err) {
            logger.warn('getHistoricalDollars fallback: %s', (err as Error).message);
            return {
                blue:    this.generateMockSeries(1420),
                oficial: this.generateMockSeries(1090),
                mep:  this.generateMockSeries(1425),
                ccl:  this.generateMockSeries(1460),
            };
        }
    }

    generateMockSeries(startValue: number): DollarSeriesItem[] {
        const data: DollarSeriesItem[] = [];
        const now = new Date();
        let val = startValue;
        for (let i = 0; i < 365; i++) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            val -= (Math.random() - 0.48) * 8;
            data.push({ fecha: date.toISOString().split('T')[0], valor: Math.round(val) });
        }
        return data.reverse();
    }

    getIndigenceData(): DateValueItem[] {
        return [
            { fecha: '2022-07-01', valor: 8.1, isOfficial: true },
            { fecha: '2023-01-01', valor: 9.3, isOfficial: true },
            { fecha: '2023-07-01', valor: 11.9, isOfficial: true },
            { fecha: '2024-01-01', valor: 18.1, isOfficial: true },
            { fecha: '2024-07-01', valor: 8.2, isOfficial: true },
            { fecha: '2025-01-01', valor: 6.9, isOfficial: true },
            { fecha: '2025-07-01', valor: 5.0, isOfficial: false },
        ];
    }

    getUnemploymentData(): DateValueItem[] {
        return [
            { fecha: '2023-04-01', valor: 6.2, isOfficial: true },
            { fecha: '2023-07-01', valor: 5.7, isOfficial: true },
            { fecha: '2023-10-01', valor: 5.7, isOfficial: true },
            { fecha: '2024-01-01', valor: 7.7, isOfficial: true },
            { fecha: '2024-07-01', valor: 7.6, isOfficial: true },
            { fecha: '2024-10-01', valor: 6.4, isOfficial: true },
            { fecha: '2025-04-01', valor: 7.6, isOfficial: true },
            { fecha: '2025-07-01', valor: 6.6, isOfficial: true },
        ];
    }

    async getDepositRates(): Promise<DepositRate> {
        try {
            // Endpoint depositos30dias fue discontinuado — usamos plazoFijo que tiene TNA por banco
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(`${config.API_URLS.ARGENTINA_DATOS}/finanzas/tasas/plazoFijo/`, {
                headers: config.DEFAULT_HEADERS,
                signal: controller.signal as unknown as AbortSignal,
            } as Parameters<typeof fetch>[1]);
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            const data = await response.json() as Array<{ tnaClientes?: number; tnaNoClientes?: number; fecha?: string }>;
            if (!Array.isArray(data) || data.length === 0) throw new Error('Empty data');
            // Tomar la mediana de TNA como proxy de tasa de mercado
            const rates = data
                .map(b => b.tnaClientes ?? b.tnaNoClientes ?? 0)
                .filter(r => r > 0)
                .sort((a, b) => a - b);
            const rawMediana = rates[Math.floor(rates.length / 2)] ?? 34.0;
            // La API devuelve la TNA como fracción (ej: 0.33) en vez de porcentaje (33)
            const mediana = rawMediana < 1 ? rawMediana * 100 : rawMediana;
            const fechaRef = data[0]?.fecha ?? new Date().toISOString().split('T')[0];
            logger.info('getDepositRates (plazoFijo mediana): %s%% (fecha: %s)', mediana.toFixed(2), fechaRef);
            return { fecha: fechaRef, valor: mediana };
        } catch (e) {
            logger.warn('getDepositRates fallback: %s', (e as Error).message);
            return { fecha: new Date().toISOString().split('T')[0], valor: 36.5 };
        }
    }

    generateMockUVASeries(): UVAItem[] {
        // UVA empezó ~14.05 en abril 2016, creció con inflación acumulada
        // Proyección aproximada hasta 2026: ~1600
        const milestones: Array<{ date: Date; valor: number }> = [
            { date: new Date('2016-04-01'), valor: 14.05 },
            { date: new Date('2017-01-01'), valor: 19.2 },
            { date: new Date('2018-01-01'), valor: 27.4 },
            { date: new Date('2019-01-01'), valor: 43.7 },
            { date: new Date('2020-01-01'), valor: 60.5 },
            { date: new Date('2021-01-01'), valor: 79.8 },
            { date: new Date('2022-01-01'), valor: 109.3 },
            { date: new Date('2023-01-01'), valor: 192.0 },
            { date: new Date('2024-01-01'), valor: 448.0 },
            { date: new Date('2025-01-01'), valor: 1215.0 },
            { date: new Date('2026-01-01'), valor: 1580.0 },
            { date: new Date('2026-03-01'), valor: 1640.0 },
        ];
        const result: UVAItem[] = [];
        for (let m = 0; m < milestones.length - 1; m++) {
            const from = milestones[m];
            const to   = milestones[m + 1];
            const days = Math.round((to.date.getTime() - from.date.getTime()) / 86400000);
            const daily = Math.pow(to.valor / from.valor, 1 / days);
            let v = from.valor;
            for (let d = 0; d < days; d += 7) { // weekly sample
                const date = new Date(from.date.getTime() + d * 86400000);
                result.push({ fecha: date.toISOString().split('T')[0], valor: parseFloat(v.toFixed(4)) });
                v *= Math.pow(daily, 7);
            }
        }
        return result;
    }

    async getUVAData(): Promise<UVAItem[]> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(`${config.API_URLS.ARGENTINA_DATOS}/finanzas/indices/uva/`, {
                headers: config.DEFAULT_HEADERS,
                signal: controller.signal as unknown as AbortSignal,
            } as Parameters<typeof fetch>[1]);
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            const data = await response.json() as UVAItem[];
            if (!Array.isArray(data) || data.length === 0) throw new Error('Empty data');
            const sorted = [...data].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
            // Samplear a máx 600 puntos para no saturar la respuesta en Vercel
            const sample = <T>(arr: T[], max = 600) => {
                if (arr.length <= max) return arr;
                const step = Math.floor(arr.length / max);
                return arr.filter((_, i) => i % step === 0 || i === arr.length - 1);
            };
            return sample(sorted) as UVAItem[];
        } catch (e) {
            logger.warn('getUVAData fallback mock: %s', (e as Error).message);
            return this.generateMockUVASeries();
        }
    }

    async getHolidays(year: number): Promise<HolidayItem[] | null> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(`${config.API_URLS.ARGENTINA_DATOS}/feriados/${year}/`, {
                headers: config.DEFAULT_HEADERS,
                signal: controller.signal as unknown as AbortSignal,
            } as Parameters<typeof fetch>[1]);
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            const data = await response.json() as HolidayItem[];
            if (!Array.isArray(data) || data.length === 0) throw new Error('Empty data');
            return data;
        } catch (e) {
            logger.warn('getHolidays fallback: %s', (e as Error).message);
            return null;
        }
    }

    async getPlazoFijoBancos(): Promise<PlazoFijoItem[] | null> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(`${config.API_URLS.ARGENTINA_DATOS}/finanzas/tasas/plazoFijo/`, {
                headers: config.DEFAULT_HEADERS,
                signal: controller.signal as unknown as AbortSignal,
            } as Parameters<typeof fetch>[1]);
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            const data = await response.json() as PlazoFijoItem[];
            if (!Array.isArray(data) || data.length === 0) throw new Error('Empty data');
            return data
                .filter((b) => b.tnaClientes != null && b.entidad)
                .map(b => ({
                    ...b,
                    // Normalizar: la API devuelve TNA como fracción (0.33) en vez de porcentaje (33)
                    tnaClientes: b.tnaClientes != null && b.tnaClientes < 1 ? b.tnaClientes * 100 : b.tnaClientes,
                    tnaNoClientes: b.tnaNoClientes != null && b.tnaNoClientes < 1 ? b.tnaNoClientes * 100 : b.tnaNoClientes,
                }))
                .sort((a, b) => ((b.tnaClientes ?? 0) - (a.tnaClientes ?? 0)));
        } catch (e) {
            logger.warn('getPlazoFijoBancos fallback: %s', (e as Error).message);
            return null;
        }
    }

    async getFCIMoneyMarket(): Promise<FCIItem[] | null> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(`${config.API_URLS.ARGENTINA_DATOS}/finanzas/fci/mercadoDinero/ultimo/`, {
                headers: config.DEFAULT_HEADERS,
                signal: controller.signal as unknown as AbortSignal,
            } as Parameters<typeof fetch>[1]);
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            const data = await response.json() as FCIItem[];
            if (!Array.isArray(data) || data.length === 0) throw new Error('Empty data');
            return [...data].sort((a, b) => ((b.vcp ?? 0) - (a.vcp ?? 0))).slice(0, 15);
        } catch (e) {
            logger.warn('getFCIMoneyMarket fallback: %s', (e as Error).message);
            return null;
        }
    }

    async getReservasHistory(): Promise<Array<{ fecha: string; valor: number }>> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const r = await fetch(
                'https://api.bcra.gob.ar/estadisticas/v3.0/monetarias/1?offset=0&limit=400&order=desc',
                {
                    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
                    agent: sslAgent as unknown as Parameters<typeof fetch>[1] extends { agent?: unknown } ? Parameters<typeof fetch>[1]['agent'] : never,
                    signal: controller.signal as unknown as AbortSignal,
                } as Parameters<typeof fetch>[1],
            );
            clearTimeout(timeoutId);
            if (!r.ok) throw new Error(`BCRA v3 HTTP ${r.status}`);
            const json = await r.json() as { results?: Array<{ valor: number; fecha: string }> };
            if (json.results && json.results.length > 0) {
                const data = json.results
                    .map(p => ({ fecha: p.fecha, valor: p.valor }))
                    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
                logger.info('getReservasHistory BCRA v3: %d puntos', data.length);
                return data;
            }
            throw new Error('Sin resultados BCRA v3');
        } catch (e) {
            logger.warn('getReservasHistory fallback: %s', (e as Error).message);
            const mockData: Array<{ fecha: string; valor: number }> = [];
            const now = new Date();
            let val = 43000;
            for (let i = 365; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                val += (Math.random() - 0.47) * 200;
                mockData.push({ fecha: date.toISOString().split('T')[0], valor: Math.round(val) });
            }
            return mockData;
        }
    }
}

export default new ArgentinaDatosService();
