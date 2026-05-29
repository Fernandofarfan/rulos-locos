/**
 * Servicio de datos de Obligaciones Negociables (ONs) argentinas.
 * Complementa FCIs y Plazos Fijos con información de renta fija corporativa.
 */
import fetch from 'node-fetch';
import logger from '../utils/logger';

interface ONData {
    ticker: string;
    nombre: string;
    emisor: string;
    moneda: 'ARS' | 'USD';
    tir: number;
    duration: number;
    precio: number;
    vencimiento: string;
    calificacion: string;
    cupon: number;
    source: string;
}

interface FCIRanking {
    nombre: string;
    sociedad: string;
    tipo: 'money-market' | 'renta-fija' | 'renta-variable' | 'mixto';
    tna30d: number;
    tna90d: number;
    tna12m: number;
    patrimonio: string;
    source: string;
}

class ONsFCIService {
    private readonly ONS_FALLBACKS: ONData[] = [
        { ticker: 'YMCJO', nombre: 'YPF 9.5% 2031', emisor: 'YPF S.A.', moneda: 'USD', tir: 9.8, duration: 4.2, precio: 98.5, vencimiento: '2031-07-15', calificacion: 'AA-', cupon: 9.5, source: 'fallback' },
        { ticker: 'PAMCO', nombre: 'Pampa 9.125% 2029', emisor: 'Pampa Energía', moneda: 'USD', tir: 7.5, duration: 3.1, precio: 102.0, vencimiento: '2029-04-15', calificacion: 'AA-', cupon: 9.125, source: 'fallback' },
        { ticker: 'IRCEO', nombre: 'IRSA 8.75% 2028', emisor: 'IRSA', moneda: 'USD', tir: 8.2, duration: 2.5, precio: 100.5, vencimiento: '2028-11-02', calificacion: 'A+', cupon: 8.75, source: 'fallback' },
        { ticker: 'TEC3O', nombre: 'Telecom 8.5% 2031', emisor: 'Telecom Argentina', moneda: 'USD', tir: 8.9, duration: 4.0, precio: 97.8, vencimiento: '2031-08-06', calificacion: 'AA-', cupon: 8.5, source: 'fallback' },
        { ticker: 'PACO', nombre: 'Pan American 7.75% 2028', emisor: 'Pan American Energy', moneda: 'USD', tir: 6.8, duration: 2.8, precio: 101.5, vencimiento: '2028-05-10', calificacion: 'AA', cupon: 7.75, source: 'fallback' },
        { ticker: 'GNCXO', nombre: 'Genneia 9.25% 2030', emisor: 'Genneia', moneda: 'USD', tir: 8.5, duration: 3.6, precio: 99.2, vencimiento: '2030-12-15', calificacion: 'A+', cupon: 9.25, source: 'fallback' },
        { ticker: 'VSC5O', nombre: 'Vista O&G 7.5% 2029', emisor: 'Vista Energy', moneda: 'USD', tir: 7.2, duration: 3.0, precio: 100.8, vencimiento: '2029-09-20', calificacion: 'AA-', cupon: 7.5, source: 'fallback' },
        { ticker: 'CGC7O', nombre: 'CGC 8.0% 2028', emisor: 'Cía. General Combustibles', moneda: 'USD', tir: 8.3, duration: 2.3, precio: 99.5, vencimiento: '2028-06-30', calificacion: 'A+', cupon: 8.0, source: 'fallback' },
    ];

    private readonly FCI_FALLBACKS: FCIRanking[] = [
        // Money Market
        { nombre: 'FIMA Premium', sociedad: 'Galicia Asset Mgmt', tipo: 'money-market', tna30d: 32.5, tna90d: 33.1, tna12m: 55.0, patrimonio: '$1.2 B', source: 'fallback' },
        { nombre: 'Superfondo Renta', sociedad: 'Santander', tipo: 'money-market', tna30d: 31.8, tna90d: 32.4, tna12m: 53.0, patrimonio: '$980 M', source: 'fallback' },
        { nombre: 'Delta Pesos', sociedad: 'Delta Asset Mgmt', tipo: 'money-market', tna30d: 33.0, tna90d: 33.5, tna12m: 56.0, patrimonio: '$750 M', source: 'fallback' },
        { nombre: 'Quinquela Pesos', sociedad: 'Consultatio', tipo: 'money-market', tna30d: 32.2, tna90d: 32.8, tna12m: 54.0, patrimonio: '$890 M', source: 'fallback' },
        // Renta Fija
        { nombre: 'Consultatio Renta Fija', sociedad: 'Consultatio', tipo: 'renta-fija', tna30d: 38.0, tna90d: 37.5, tna12m: 62.0, patrimonio: '$450 M', source: 'fallback' },
        { nombre: 'AdCap Renta Fija', sociedad: 'AdCap Asset Mgmt', tipo: 'renta-fija', tna30d: 37.2, tna90d: 38.1, tna12m: 60.0, patrimonio: '$380 M', source: 'fallback' },
        { nombre: 'Allaria Renta', sociedad: 'Allaria Ledesma', tipo: 'renta-fija', tna30d: 36.5, tna90d: 37.0, tna12m: 59.0, patrimonio: '$520 M', source: 'fallback' },
        // Renta Variable
        { nombre: 'Consultatio RV', sociedad: 'Consultatio', tipo: 'renta-variable', tna30d: 85.0, tna90d: 78.0, tna12m: 120.0, patrimonio: '$210 M', source: 'fallback' },
        { nombre: 'AdCap Acciones', sociedad: 'AdCap Asset Mgmt', tipo: 'renta-variable', tna30d: 82.0, tna90d: 75.0, tna12m: 115.0, patrimonio: '$180 M', source: 'fallback' },
    ];

    /**
     * Obtener ranking de Obligaciones Negociables.
     */
    async getONs(): Promise<{ data: ONData[]; timestamp: string; source: string }> {
        try {
            // Intentar obtener de IAMC (Mercado Abierto Electrónico) o BYMA
            const response = await fetch('https://api.argentinadatos.com/v1/finanzas/ons', {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                signal: AbortSignal.timeout(8000),
            });
            if (response.ok) {
                const remoteData = await response.json() as ONData[];
                if (remoteData?.length > 0) {
                    return { data: remoteData, timestamp: new Date().toISOString(), source: 'argentinadatos' };
                }
            }
        } catch (err) {
            logger.debug('ONs remote fetch failed: %s', (err as Error).message);
        }
        return { data: this.ONS_FALLBACKS, timestamp: new Date().toISOString(), source: 'fallback' };
    }

    /**
     * Obtener ranking completo de FCIs por categoría.
     */
    async getFCIRanking(): Promise<{
        moneyMarket: FCIRanking[];
        rentaFija: FCIRanking[];
        rentaVariable: FCIRanking[];
        timestamp: string;
        source: string;
    }> {
        try {
            const response = await fetch('https://api.argentinadatos.com/v1/finanzas/fci', {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                signal: AbortSignal.timeout(8000),
            });
            if (response.ok) {
                const remoteData = await response.json() as FCIRanking[];
                if (remoteData?.length > 0) {
                    return {
                        moneyMarket: remoteData.filter(f => f.tipo === 'money-market'),
                        rentaFija: remoteData.filter(f => f.tipo === 'renta-fija'),
                        rentaVariable: remoteData.filter(f => f.tipo === 'renta-variable'),
                        timestamp: new Date().toISOString(),
                        source: 'argentinadatos',
                    };
                }
            }
        } catch (err) {
            logger.debug('FCI ranking remote fetch failed: %s', (err as Error).message);
        }
        return {
            moneyMarket: this.FCI_FALLBACKS.filter(f => f.tipo === 'money-market'),
            rentaFija: this.FCI_FALLBACKS.filter(f => f.tipo === 'renta-fija'),
            rentaVariable: this.FCI_FALLBACKS.filter(f => f.tipo === 'renta-variable'),
            timestamp: new Date().toISOString(),
            source: 'fallback',
        };
    }

    /**
     * Obtener datos combinados (ONs + FCIs) para el dashboard de renta fija.
     */
    async getRentaFijaDashboard(): Promise<{
        ons: ONData[];
        fciRanking: { moneyMarket: FCIRanking[]; rentaFija: FCIRanking[]; rentaVariable: FCIRanking[] };
        timestamp: string;
    }> {
        const [ons, fciRanking] = await Promise.all([
            this.getONs(),
            this.getFCIRanking(),
        ]);
        return {
            ons: ons.data,
            fciRanking,
            timestamp: new Date().toISOString(),
        };
    }
}

export default new ONsFCIService();
