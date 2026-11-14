import { describe, expect, it } from 'vitest';
import { mapPortfolioCsv, parseCsv } from './portfolioCsv';

describe('importación CSV de cartera', () => {
    it('acepta decimales con coma, fechas argentinas y notas entrecomilladas', () => {
        const csv = 'Activo;Cantidad;Precio;Fecha;Nota\nBTC;1,5;1.234,50;31/03/2025;"Hola; mundo"';
        const positions = mapPortfolioCsv(parseCsv(csv, ';'), { asset: 0, amount: 1, price: 2, date: 3, note: 4 }, 'dmy', ',');
        expect(positions).toEqual([{ asset: 'BTC', amount: 1.5, buyPrice: 1234.5, date: '2025-03-31', note: 'Hola; mundo' }]);
    });
    it('rechaza fechas imposibles', () => {
        expect(() => mapPortfolioCsv(parseCsv('a,b,c,d\nBTC,1,2,31/02/2025'), { asset: 0, amount: 1, price: 2, date: 3, note: null }, 'dmy', '.')).toThrow('fila 2');
    });
});
