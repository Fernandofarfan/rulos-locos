import { Request, Response } from 'express';
import { getCommodities } from '../services/commoditiesService';
import logger from '../utils/logger';

interface Metal {
    nombre: string;
    unidad: string;
    onzaTroy?: number;
    gramo?: number;
    kilo?: number;
    libra?: number;
    tonelada?: number;
}

class DataController {
    getMetals(_req: Request, res: Response): void {
        const metals: Record<string, Metal> = {
            oro:   { nombre: 'Oro',   unidad: 'USD', onzaTroy: 2045.30, gramo: 65.76, kilo: 65760 },
            plata: { nombre: 'Plata', unidad: 'USD', onzaTroy: 23.85,   gramo: 0.77,  kilo: 770 },
            cobre: { nombre: 'Cobre', unidad: 'USD', libra: 3.85,       kilo: 8.49,   tonelada: 8490 },
        };
        res.json(metals);
    }

    getStocks(_req: Request, res: Response): void {
        res.json({
            acciones: [
                { ticker: 'YPF',  nombre: 'YPF S.A.',                   precio: 28450, variacion: 2.5,  volumen: 1850000 },
                { ticker: 'GGAL', nombre: 'Grupo Financiero Galicia',   precio: 578,   variacion: -1.2, volumen: 3450000 },
                { ticker: 'PAMP', nombre: 'Pampa Energía',              precio: 938,   variacion: 3.1,  volumen: 950000  },
                { ticker: 'TXAR', nombre: 'Ternium Argentina',          precio: 1247,  variacion: 1.8,  volumen: 720000  },
                { ticker: 'ALUA', nombre: 'Aluar',                      precio: 887,   variacion: -0.5, volumen: 680000  },
            ],
            cedears: [
                { ticker: 'AAPL',  nombre: 'Apple Inc.',       precioARS: 24450,  precioUSD: 184.85,  variacion: 1.2,  volumen: 2150000 },
                { ticker: 'GOOGL', nombre: 'Alphabet Inc.',    precioARS: 18250,  precioUSD: 138.10,  variacion: 0.8,  volumen: 1680000 },
                { ticker: 'MSFT',  nombre: 'Microsoft Corp.',  precioARS: 50280,  precioUSD: 380.50,  variacion: 1.5,  volumen: 1420000 },
                { ticker: 'TSLA',  nombre: 'Tesla Inc.',       precioARS: 32450,  precioUSD: 245.60,  variacion: -2.1, volumen: 1950000 },
                { ticker: 'MELI',  nombre: 'MercadoLibre',     precioARS: 220850, precioUSD: 1670.75, variacion: 2.8,  volumen: 890000  },
                { ticker: 'AMZN',  nombre: 'Amazon.com Inc.',  precioARS: 23150,  precioUSD: 175.20,  variacion: 0.5,  volumen: 1240000 },
            ],
        });
    }

    async getCommodities(_req: Request, res: Response): Promise<void> {
        try {
            const data = await getCommodities();
            res.json(data);
        } catch (err) {
            logger.error('getCommodities: %s', (err as Error).message);
            res.status(500).json({ error: 'Error obteniendo commodities' });
        }
    }

    async getIndicators(_req: Request, res: Response): Promise<void> {
        try {
            res.json({
                riesgoPais:   { valor: 512, variacion: -15 },
                reservas:     { valor: 31250, variacion: 120 },
                inflacion:    { mensual: 2.8, anual: 38.5 },
                baseMonetaria:{ valor: 18500000, variacion: 1.2 },
            });
        } catch (error) {
            logger.error('Error en DataController.getIndicators: %s', (error as Error).message);
            res.status(500).json({ error: 'Error interno', message: (error as Error).message });
        }
    }
}

export default new DataController();
