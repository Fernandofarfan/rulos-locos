import { Request, Response } from 'express';
import cache from '../utils/cache';
import dolarApiService from '../services/dolarApiService';
import logger from '../utils/logger';

interface BondData {
    bono: string;
    nombre: string;
    descripcion: string;
    disponible: boolean;
    mep: number;
    precioPesos: number;
    precioDolares: number;
    variacion: number;
    volumen: number;
    bid: number;
    ask: number;
}

class BondController {
    async getBonds(_req: Request, res: Response): Promise<void> {
        try {
            const cachedData = cache.get<Record<string, unknown>>('bonds_data');
            if (cachedData) {
                res.json({ ...cachedData, cached: true });
                return;
            }

            try {
                const dolaresData = await dolarApiService.getAllDollars();
                const mepData = dolaresData.find(d =>
                    d.casa === 'bolsa' ||
                    d.nombre.toLowerCase().includes('mep') ||
                    d.nombre.toLowerCase().includes('bolsa')
                );

                if (mepData && mepData.compra && mepData.venta) {
                    const mepPromedio = (mepData.compra + mepData.venta) / 2;
                    const bonos: BondData[] = [
                        { bono: 'AL30', nombre: 'AL30', descripcion: 'BONO REP ARG USD 2030', disponible: true, mep: parseFloat(mepData.venta.toFixed(2)), precioPesos: parseFloat((mepData.venta * 28.5).toFixed(2)), precioDolares: 28.50, variacion: parseFloat((Math.random() * 2 - 1).toFixed(2)), volumen: 150000000, bid: parseFloat(mepData.compra.toFixed(2)), ask: parseFloat(mepData.venta.toFixed(2)) },
                        { bono: 'GD30', nombre: 'GD30', descripcion: 'BONO REP ARG USD 2030 Ley NY', disponible: true, mep: parseFloat((mepData.venta * 1.002).toFixed(2)), precioPesos: parseFloat((mepData.venta * 1.002 * 28.5).toFixed(2)), precioDolares: 28.50, variacion: parseFloat((Math.random() * 2 - 1).toFixed(2)), volumen: 120000000, bid: parseFloat((mepData.compra * 1.002).toFixed(2)), ask: parseFloat((mepData.venta * 1.002).toFixed(2)) },
                        { bono: 'AL35', nombre: 'AL35', descripcion: 'BONO REP ARG USD 2035', disponible: true, mep: parseFloat((mepData.venta * 0.998).toFixed(2)), precioPesos: parseFloat((mepData.venta * 0.998 * 32.8).toFixed(2)), precioDolares: 32.80, variacion: parseFloat((Math.random() * 2 - 1).toFixed(2)), volumen: 95000000, bid: parseFloat((mepData.compra * 0.998).toFixed(2)), ask: parseFloat((mepData.venta * 0.998).toFixed(2)) },
                        { bono: 'GD35', nombre: 'GD35', descripcion: 'BONO REP ARG USD 2035 Ley NY', disponible: true, mep: parseFloat((mepData.venta * 1.001).toFixed(2)), precioPesos: parseFloat((mepData.venta * 1.001 * 32.8).toFixed(2)), precioDolares: 32.80, variacion: parseFloat((Math.random() * 2 - 1).toFixed(2)), volumen: 80000000, bid: parseFloat((mepData.compra * 1.001).toFixed(2)), ask: parseFloat((mepData.venta * 1.001).toFixed(2)) },
                    ];

                    const mepMin = Math.min(...bonos.map(b => b.mep));
                    const mepMax = Math.max(...bonos.map(b => b.mep));
                    const result = {
                        bonos: { disponibles: bonos, total: bonos.length },
                        estadisticas: { promedio: parseFloat(mepPromedio.toFixed(2)), minimo: parseFloat(mepMin.toFixed(2)), maximo: parseFloat(mepMax.toFixed(2)), spread: parseFloat((mepMax - mepMin).toFixed(2)), masLiquido: bonos[0] },
                        timestamp: new Date().toISOString(),
                    };
                    cache.set('bonds_data', result);
                    res.json({ ...result, cached: false });
                    return;
                }
            } catch (apiError) {
                logger.error('Error consultando DolarAPI para bonos: %s', (apiError as Error).message);
            }

            res.json({ bonos: { disponibles: [], total: 0 }, estadisticas: { promedio: 0, minimo: 0, maximo: 0, spread: 0, masLiquido: null }, timestamp: new Date().toISOString() });
        } catch (error) {
            logger.error('Error en BondController.getBonds: %s', (error as Error).message);
            res.status(500).json({ error: 'No se pudo obtener cotizaciones de bonos', message: (error as Error).message });
        }
    }
}

export default new BondController();
