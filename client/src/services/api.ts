import axios from 'axios';
import { logger } from '../utils/logger';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
    baseURL: API_BASE,
    timeout: 15000,
});

client.interceptors.request.use((config) => {
    const token = localStorage.getItem('rl_token');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

async function withRetry<T>(fn: () => Promise<T>, tries = 2, delay = 800): Promise<T> {
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
        try { const { data } = await withRetry(() => client.get('/rate')); return data; }
        catch (error) { logger.error('API Error (getRate):', error); return { ask: 0, bid: 0, source: 'Offline', loading: true }; }
    },

    getArbitrage: async () => {
        try { const { data } = await withRetry(() => client.get('/arbitrage')); return data; }
        catch (error) { logger.error('API Error (getArbitrage):', error); return { opportunities: [], dolares: {} }; }
    },

    getEconomics: async () => {
        try { const { data } = await withRetry(() => client.get('/economics/dashboard')); return data; }
        catch (error) { logger.error('API Error (getEconomics):', error);
            return { macro: { inflation: { mensual: 0, interanual: 0, fecha: new Date().toISOString().split('T')[0] }, risk: 0, reserves: 0, baseMonetaria: 0, dolarEquilibrio: 0 }, market: { merval: [], cedears: [], bonds: [] }, global: [], timestamp: new Date().toISOString(), isFallback: true }; }
    },

    getHistorical: async (indicator: string, range = '1Y') => {
        try { const { data } = await withRetry(() => client.get(`/economics/historical/${indicator}?range=${range}`)); return data; }
        catch (error) { logger.error(`API Error (getHistorical ${indicator}):`, error); return { labels: [], values: [] }; }
    },

    getNews: async () => {
        try { const { data } = await withRetry(() => client.get(`/economics/news?t=${Date.now()}`)); return data; }
        catch (error) { logger.error('API Error (getNews):', error); return []; }
    },

    getRates: async () => {
        try { const { data } = await withRetry(() => client.get('/economics/rates')); return data; }
        catch (error) { logger.error('API Error (getRates):', error); return { badlar: { tna: 34.0, tem: 2.83, tea: 40.5, fecha: '' }, plazoFijo: { tna: 33.0, tem: 2.75, tea: 39.1 }, inflation: { mensual: 2.5, interanual: 84.0 }, realRate: -50.0 }; }
    },

    getYieldCurve: async () => {
        try { const { data } = await withRetry(() => client.get('/economics/yield-curve')); return data; }
        catch (error) { logger.error('API Error (getYieldCurve):', error); return { points: [], cclUsed: 0, timestamp: '' }; }
    },

    getUVA: async () => {
        try { const { data } = await withRetry(() => client.get('/economics/uva')); return data; }
        catch (error) { logger.error('API Error (getUVA):', error); return { data: [], source: 'error' }; }
    },

    getReservas: async () => {
        try { const { data } = await withRetry(() => client.get('/economics/reservas')); return data; }
        catch (error) { logger.error('API Error (getReservas):', error); return { data: [], source: 'error' }; }
    },

    getCarryTrade: async () => {
        try { const { data } = await withRetry(() => client.get('/economics/carry-trade')); return data; }
        catch (error) { logger.error('API Error (getCarryTrade):', error); return { history: [], error: true }; }
    },

    getEquilibriumDollar: async () => {
        try { const { data } = await withRetry(() => client.get('/economics/equilibrium')); return data; }
        catch (error) { logger.error('API Error (getEquilibriumDollar):', error); return { theoretical: 0, error: true }; }
    },

    getHolidays: async () => {
        try { const { data } = await withRetry(() => client.get('/economics/holidays')); return data; }
        catch (error) { logger.error('API Error (getHolidays):', error); return { holidays: [] }; }
    },

    getPlazoFijoBancos: async () => {
        try { const { data } = await withRetry(() => client.get('/economics/plazo-fijo-bancos')); return data; }
        catch (error) { logger.error('API Error (getPlazoFijoBancos):', error); return { bancos: [] }; }
    },

    getFCI: async () => {
        try { const { data } = await withRetry(() => client.get('/economics/fci')); return data; }
        catch (error) { logger.error('API Error (getFCI):', error); return { fondos: [] }; }
    },

    getCalendarEvents: async () => {
        try { const { data } = await withRetry(() => client.get('/economics/calendar')); return data; }
        catch (error) { logger.error('API Error (getCalendarEvents):', error); return { events: [], sources: [] }; }
    },

    sendTelegramAlert: async (payload: { prices?: Record<string, number>; message?: string }) => {
        try { const { data } = await client.post('/notifications/alert', payload); return data; }
        catch (error) { logger.error('API Error (sendTelegramAlert):', error); return { status: 'error' }; }
    },

    getCommodities: async () => {
        try { const { data } = await withRetry(() => client.get('/server/commodities')); return data; }
        catch (error) { logger.error('API Error (getCommodities):', error); return []; }
    },

    getBondsLive: async () => {
        try { const { data } = await withRetry(() => client.get('/bonds/live')); return data; }
        catch (error) { logger.error('API Error (getBondsLive):', error); return []; }
    },

    getRofexContracts: async () => {
        try { const { data } = await withRetry(() => client.get('/economics/rofex')); return data; }
        catch (error) { logger.error('API Error (getRofexContracts):', error); return []; }
    },

    getPortfolio: async () => {
        try { const { data } = await withRetry(() => client.get('/portfolio')); return data.positions ?? []; }
        catch (error) { logger.error('API Error (getPortfolio):', error); return []; }
    },

    syncPortfolio: async () => {
        try { const { data } = await withRetry(() => client.post('/portfolio/sync')); return data; }
        catch (error) { logger.error('API Error (syncPortfolio):', error); return { error: true }; }
    },

    addPortfolioPosition: async (pos: { asset: string; buyPrice: number; amount: number; date?: string; note?: string }) => {
        try { const { data } = await withRetry(() => client.post('/portfolio', pos)); return data.position; }
        catch (error) { logger.error('API Error (addPortfolioPosition):', error); return null; }
    },

    deletePortfolioPosition: async (id: string) => {
        try { await client.delete(`/portfolio/${id}`); return true; }
        catch (error) { logger.error('API Error (deletePortfolioPosition):', error); return false; }
    },

    get: async <T>(path: string): Promise<T | null> => {
        try { const { data } = await withRetry(() => client.get<T>(path)); return data; }
        catch (error) { logger.error(`API Error (GET ${path}):`, error); return null; }
    },

    post: async <T>(path: string, body?: unknown): Promise<T | null> => {
        try { const { data } = await withRetry(() => client.post<T>(path, body)); return data; }
        catch (error) { logger.error(`API Error (POST ${path}):`, error); return null; }
    },
};

export default client;
