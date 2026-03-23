import axios from 'axios';
import { logger } from '../utils/logger';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
    baseURL: API_BASE,
    timeout: 15000, // 15 segundos — los endpoints históricos devuelven miles de puntos
});

client.interceptors.request.use((config) => {
    const token = localStorage.getItem('rl_token');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/**
 * Reintenta una función async con backoff exponencial.
 * @param fn     Función a ejecutar
 * @param tries  Número máximo de intentos (default: 3)
 * @param delay  Tiempo base en ms entre reintentos (default: 1000)
 */
async function withRetry<T>(fn: () => Promise<T>, tries = 3, delay = 1000): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < tries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (attempt < tries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
            }
        }
    }
    throw lastError;
}

export const apiService = {
    getRate: async () => {
        try {
            const { data } = await withRetry(() => client.get('/rate'));
            return data;
        } catch (error) {
            logger.error('API Error (getRate):', error);
            // Fallback mock data if API fails to prevent UI crash
            return { ask: 0, bid: 0, source: 'Offline', loading: true };
        }
    },

    getArbitrage: async () => {
        try {
            const { data } = await withRetry(() => client.get('/arbitrage'));
            return data;
        } catch (error) {
            logger.error('API Error (getArbitrage):', error);
            return { opportunities: [], dolares: {} };
        }
    },

    getEconomics: async () => {
        try {
            const { data } = await withRetry(() => client.get('/economics/dashboard'));
            return data;
        } catch (error) {
            logger.error('API Error (getEconomics):', error);
            return {
                macro: {
                    inflation: { mensual: 0, interanual: 0, fecha: new Date().toISOString().split('T')[0] },
                    risk: 0,
                    reserves: 0,
                    baseMonetaria: 0,
                    dolarEquilibrio: 0
                },
                market: { merval: [], cedears: [], bonds: [] },
                global: [],
                timestamp: new Date().toISOString(),
                isFallback: true
            };
        }
    },

    getHistorical: async (indicator: string, range = '1Y') => {
        try {
            const { data } = await client.get(`/economics/historical/${indicator}?range=${range}`);
            return data;
        } catch (error) {
            logger.error(`API Error (getHistorical ${indicator}):`, error);
            return { labels: [], values: [] };
        }
    },

    getNews: async () => {
        try {
            const { data } = await client.get(`/economics/news?t=${Date.now()}`);
            return data;
        } catch (error) {
            logger.error('API Error (getNews):', error);
            throw error;
        }
    },

    getRates: async () => {
        try {
            const { data } = await client.get('/economics/rates');
            return data;
        } catch (error) {
            logger.error('API Error (getRates):', error);
            return {
                badlar: { tna: 34.0, tem: 2.83, tea: 40.5, fecha: '' },
                plazoFijo: { tna: 33.0, tem: 2.75, tea: 39.1 },
                inflation: { mensual: 2.5, interanual: 84.0 },
                realRate: -50.0
            };
        }
    },

    getYieldCurve: async () => {
        try {
            const { data } = await client.get('/economics/yield-curve');
            return data;
        } catch (error) {
            logger.error('API Error (getYieldCurve):', error);
            return { points: [], cclUsed: 0, timestamp: '' };
        }
    },

    getUVA: async () => {
        try {
            const { data } = await client.get('/economics/uva');
            return data;
        } catch (error) {
            logger.error('API Error (getUVA):', error);
            return { data: [], source: 'error' };
        }
    },

    getReservas: async () => {
        try {
            const { data } = await client.get('/economics/reservas');
            return data;
        } catch (error) {
            logger.error('API Error (getReservas):', error);
            return { data: [], source: 'error' };
        }
    },
    getCarryTrade: async () => {
        try {
            const { data } = await client.get('/economics/carry-trade');
            return data;
        } catch (error) {
            logger.error('API Error (getCarryTrade):', error);
            return { history: [], error: true };
        }
    },
    getEquilibriumDollar: async () => {
        try {
            const { data } = await client.get('/economics/equilibrium');
            return data;
        } catch (error) {
            logger.error('API Error (getEquilibriumDollar):', error);
            return { theoretical: 0, error: true };
        }
    },
    getHolidays: async () => {
        try {
            const { data } = await client.get('/economics/holidays');
            return data;
        } catch (error) {
            logger.error('API Error (getHolidays):', error);
            return { holidays: [] };
        }
    },
    getPlazoFijoBancos: async () => {
        try {
            const { data } = await client.get('/economics/plazo-fijo-bancos');
            return data;
        } catch (error) {
            logger.error('API Error (getPlazoFijoBancos):', error);
            return { bancos: [] };
        }
    },
    getFCI: async () => {
        try {
            const { data } = await client.get('/economics/fci');
            return data;
        } catch (error) {
            logger.error('API Error (getFCI):', error);
            return { fondos: [] };
        }
    },
    getCalendarEvents: async () => {
        try {
            const { data } = await client.get('/economics/calendar');
            return data;
        } catch (error) {
            logger.error('API Error (getCalendarEvents):', error);
            return { events: [], sources: [] };
        }
    },
    sendTelegramAlert: async (payload: { prices?: Record<string, number>; message?: string }) => {
        try {
            const { data } = await client.post('/notifications/alert', payload);
            return data;
        } catch (error) {
            logger.error('API Error (sendTelegramAlert):', error);
            return { status: 'error' };
        }
    },

    // ─ Commodities agrícolas ───────────────────────────────────
    getCommodities: async () => {
        try {
            const { data } = await client.get('/server/commodities');
            return data;
        } catch (error) {
            logger.error('API Error (getCommodities):', error);
            return [];
        }
    },

    getBondsLive: async () => {
        try {
            const { data } = await client.get('/bonds/live');
            return data;
        } catch (error) {
            logger.error('API Error (getBondsLive):', error);
            return [];
        }
    },

    getRofexContracts: async () => {
        try {
            const { data } = await client.get('/economics/rofex');
            return data;
        } catch (error) {
            logger.error('API Error (getRofexContracts):', error);
            return [];
        }
    },

    // ─ Portfolio (requiere JWT en header Authorization) ───────────
    getPortfolio: async () => {
        try {
            const { data } = await client.get('/portfolio');
            return data.positions ?? [];
        } catch (error) {
            logger.error('API Error (getPortfolio):', error);
            return [];
        }
    },
    syncPortfolio: async () => {
        try {
            const { data } = await client.post('/portfolio/sync');
            return data;
        } catch (error) {
            logger.error('API Error (syncPortfolio):', error);
            throw error;
        }
    },

    addPortfolioPosition: async (pos: { asset: string; buyPrice: number; amount: number; date?: string; note?: string }) => {
        try {
            const { data } = await client.post('/portfolio', pos);
            return data.position;
        } catch (error) {
            logger.error('API Error (addPortfolioPosition):', error);
            return null;
        }
    },

    deletePortfolioPosition: async (id: string) => {
        try {
            await client.delete(`/portfolio/${id}`);
            return true;
        } catch (error) {
            logger.error('API Error (deletePortfolioPosition):', error);
            return false;
        }
    },

    // Generic typed GET — used by newer components
    get: async <T>(path: string): Promise<T | null> => {
        try {
            const { data } = await client.get<T>(path);
            return data;
        } catch (error) {
            logger.error(`API Error (GET ${path}):`, error);
            return null;
        }
    },

    // Generic typed POST — used by newer components
    post: async <T>(path: string, body?: unknown): Promise<T | null> => {
        try {
            const { data } = await client.post<T>(path, body);
            return data;
        } catch (error) {
            logger.error(`API Error (POST ${path}):`, error);
            return null;
        }
    },
};

export default client;
