import { describe, it, expect } from 'vitest';
import {
    annualPersonalDeductions,
    BASE_IMPONIBLE_MAX_2026,
    gananciasAnnualTax,
    grossToNet,
    socialContributions,
} from './salary';

describe('bruto → neto (relación de dependencia)', () => {
    it('descuenta 17% de aportes sin tope para sueldos medios ($500.000)', () => {
        const c = socialContributions(500_000);
        expect(c.base).toBe(500_000);
        expect(c.jubilacion).toBeCloseTo(55_000, 6);
        expect(c.obraSocial).toBeCloseTo(15_000, 6);
        expect(c.pami).toBeCloseTo(15_000, 6);
        expect(c.total).toBeCloseTo(85_000, 6);
    });

    it('aplica la base imponible mínima y máxima', () => {
        expect(socialContributions(100_000).base).toBeCloseTo(120_996.78, 2);
        expect(socialContributions(10_000_000).base).toBe(BASE_IMPONIBLE_MAX_2026);
        expect(socialContributions(0).total).toBe(0);
        expect(socialContributions(-50).total).toBe(0);
    });

    it('calcula deducciones personales con cargas de familia', () => {
        // GNI + ded. especial 4,8×GNI (referencia ene–jun 2026)
        expect(annualPersonalDeductions()).toBeCloseTo(29_880_454.52, 2);
        expect(annualPersonalDeductions({ conyuge: true, hijos: 2 }))
            .toBeCloseTo(29_880_454.52 + 4_851_964.66 + 2 * 2_446_863.48, 2);
    });

    it('aplica la escala art. 94 por tramos', () => {
        expect(gananciasAnnualTax(0)).toBe(0);
        expect(gananciasAnnualTax(-100)).toBe(0);
        // Primer tramo: 5% hasta 2.000.030,09
        expect(gananciasAnnualTax(1_000_000)).toBeCloseTo(50_000, 6);
        // Segundo tramo: 100.001,50 + 9% del excedente de 2.000.030,09
        expect(gananciasAnnualTax(3_000_000))
            .toBeCloseTo(100_001.50 + (3_000_000 - 2_000_030.09) * 0.09, 2);
    });

    it('sueldo bajo no paga Ganancias ($500.000 → neto $415.000)', () => {
        const r = grossToNet(500_000);
        expect(r.netBeforeTax).toBeCloseTo(415_000, 6);
        expect(r.monthlyTax).toBe(0);
        expect(r.net).toBeCloseTo(415_000, 6);
        expect(r.totalDeductionRate).toBeCloseTo(17, 6);
    });

    it('sueldo medio sigue bajo el mínimo no imponible ($1.500.000 → neto $1.245.000)', () => {
        const r = grossToNet(1_500_000);
        expect(r.netBeforeTax).toBeCloseTo(1_245_000, 6);
        // 13 sueldos (16.185.000) < deducciones anualizadas (32.370.492,40)
        expect(r.taxableAnnual).toBe(0);
        expect(r.net).toBeCloseTo(1_245_000, 6);
    });

    it('el umbral de Ganancias queda apenas por encima de $3.000.000 bruto', () => {
        const below = grossToNet(3_000_000);
        expect(below.taxableAnnual).toBe(0); // 32.370.000 < 32.370.492,40
        expect(below.monthlyTax).toBe(0);
        const above = grossToNet(3_100_000);
        expect(above.monthlyTax).toBeGreaterThan(0);
    });

    it('topea aportes y retiene Ganancias en sueldos altos ($4.000.000)', () => {
        const r = grossToNet(4_000_000);
        // Aportes sobre base máxima 3.932.339,08 → 17% = 668.497,6436
        expect(r.contributions.jubilacion).toBeCloseTo(432_557.2988, 2);
        expect(r.contributions.total).toBeCloseTo(668_497.6436, 2);
        expect(r.netBeforeTax).toBeCloseTo(3_331_502.3564, 2);
        // Base anual: 13×3.331.502,36 − 32.370.492,40 = 10.939.038,24
        expect(r.taxableAnnual).toBeCloseTo(10_939_038.2365, 2);
        // Tramo 19%: 970.014,59 + 19%×(10.939.038,24 − 9.000.135,40) = 1.338.406,13
        expect(r.annualTax).toBeCloseTo(1_338_406.1289, 2);
        expect(r.monthlyTax).toBeCloseTo(111_533.8441, 2);
        expect(r.net).toBeCloseTo(3_219_968.51, 2);
    });

    it('las cargas de familia reducen la retención ($4.000.000, cónyuge + 2 hijos)', () => {
        const r = grossToNet(4_000_000, { conyuge: true, hijos: 2 });
        // Deducciones: 39.626.146,14 → anualizadas 42.928.324,99
        // Base: 43.309.530,63 − 42.928.324,99 = 381.205,65 → 5%
        expect(r.taxableAnnual).toBeCloseTo(381_205.648, 2);
        expect(r.annualTax).toBeCloseTo(19_060.2824, 2);
        expect(r.monthlyTax).toBeCloseTo(1_588.357, 2);
        expect(r.net).toBeCloseTo(3_329_914.00, 2);
        expect(r.monthlyTax).toBeLessThan(grossToNet(4_000_000).monthlyTax);
    });

    it('maneja entrada inválida sin romper', () => {
        const r = grossToNet(NaN);
        expect(r.monthlyTax).toBe(0);
        expect(Number.isNaN(r.net)).toBe(true);
        expect(grossToNet(0).net).toBe(0);
    });
});
