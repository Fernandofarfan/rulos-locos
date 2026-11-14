// Cálculo Bruto → Neto para empleados en relación de dependencia (Argentina).
// Esquema simplificado: aportes personales (17% con tope) + Impuesto a las
// Ganancias de 4ta categoría con deducciones personales y escala art. 94,
// anualizando 13 sueldos (12 + aguinaldo prorrateado) como hace el régimen de
// retención de la RG (AFIP) 4003.

// ---------------------------------------------------------------------------
// Aportes del trabajador — valores de referencia 2026
// - Jubilación (SIPA, ley 24.241): 11%
// - Obra social (ley 23.660): 3%
// - PAMI / INSSJP (ley 19.032): 3%
// Los tres aportes se calculan sobre la remuneración con base imponible
// mínima $120.996,78 y máxima $3.932.339,08 (devengado febrero 2026).
// Fuente: Resolución ANSES 21/2026 (B.O. 26/01/2026)
//   https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-21-2026-422568
//   https://siap.blogdelcontador.com.ar/novedades/anses-actualizo-los-haberes-previsionales-y-topes-a-la-base-imponible-desde-febrero-2026/
export const JUBILACION_RATE = 0.11;
export const OBRA_SOCIAL_RATE = 0.03;
export const PAMI_RATE = 0.03;
export const BASE_IMPONIBLE_MIN_2026 = 120_996.78;
export const BASE_IMPONIBLE_MAX_2026 = 3_932_339.08;

// ---------------------------------------------------------------------------
// Impuesto a las Ganancias 4ta categoría — valores de referencia ene–jun 2026
// Deducciones personales art. 30 y escala art. 94 (montos anuales a diciembre
// 2026 según tablas de retención ARCA, RG 4003):
//   https://www.arca.gob.ar/gananciasYBienes/ganancias/personas-humanas-sucesiones-indivisas/deducciones/documentos/Deducciones-personales-art-30-ene-a-jun-2026.pdf
//   https://www.arca.gob.ar/gananciasYBienes/ganancias/personas-humanas-sucesiones-indivisas/declaracion-jurada/documentos/Tabla-Art-94-LIG-per-ene-a-jun-2026.pdf
export const GNI_ANNUAL_2026 = 5_151_802.50; // Ganancia no imponible (art. 30 inc. a)
export const DED_ESP_ANNUAL_2026 = 24_728_652.02; // Deducción especial rel. dependencia (art. 30 inc. c, ap. 2 = 4,8 × GNI)
export const CONYUGE_ANNUAL_2026 = 4_851_964.66;
export const HIJO_ANNUAL_2026 = 2_446_863.48;

// Escala anual art. 94 (período ene–jun 2026): [desde, hasta, fijo, alícuota%]
// hasta = Infinity en el último tramo.
const GANANCIAS_SCALE_2026: ReadonlyArray<readonly [number, number, number, number]> = [
    [0, 2_000_030.09, 0, 5],
    [2_000_030.09, 4_000_060.17, 100_001.50, 9],
    [4_000_060.17, 6_000_090.26, 280_004.21, 12],
    [6_000_090.26, 9_000_135.40, 520_007.82, 15],
    [9_000_135.40, 18_000_270.80, 970_014.59, 19],
    [18_000_270.80, 27_000_406.20, 2_680_040.32, 23],
    [27_000_406.20, 40_500_609.30, 4_750_071.46, 27],
    [40_500_609.30, 60_750_913.96, 8_395_126.30, 31],
    [60_750_913.96, Infinity, 14_672_720.74, 35],
];

export interface FamilySituation {
    conyuge?: boolean;
    hijos?: number;
}

export interface SocialContributions {
    base: number;
    jubilacion: number;
    obraSocial: number;
    pami: number;
    total: number;
}

/** Aportes personales: 17% sobre la remuneración limitada por la base imponible. */
export function socialContributions(gross: number): SocialContributions {
    if (!Number.isFinite(gross) || gross <= 0) {
        return { base: 0, jubilacion: 0, obraSocial: 0, pami: 0, total: 0 };
    }
    const base = Math.min(Math.max(gross, BASE_IMPONIBLE_MIN_2026), BASE_IMPONIBLE_MAX_2026);
    const jubilacion = base * JUBILACION_RATE;
    const obraSocial = base * OBRA_SOCIAL_RATE;
    const pami = base * PAMI_RATE;
    return { base, jubilacion, obraSocial, pami, total: jubilacion + obraSocial + pami };
}

/** Deducciones personales anuales computables (art. 30 a + b + c ap. 2). */
export function annualPersonalDeductions(fam: FamilySituation = {}): number {
    const hijos = Math.max(0, Math.floor(fam.hijos ?? 0));
    return GNI_ANNUAL_2026 + DED_ESP_ANNUAL_2026
        + (fam.conyuge ? CONYUGE_ANNUAL_2026 : 0)
        + hijos * HIJO_ANNUAL_2026;
}

/** Escala progresiva art. 94 sobre ganancia neta sujeta a impuesto anual. */
export function gananciasAnnualTax(taxableAnnual: number): number {
    if (!Number.isFinite(taxableAnnual) || taxableAnnual <= 0) return 0;
    const bracket = GANANCIAS_SCALE_2026.find(([, hasta]) => taxableAnnual <= hasta) ?? GANANCIAS_SCALE_2026[GANANCIAS_SCALE_2026.length - 1];
    const [desde, , fijo, alicuota] = bracket;
    return fijo + (taxableAnnual - desde) * alicuota / 100;
}

export interface GrossToNetResult {
    gross: number;
    contributions: SocialContributions;
    /** Remuneración neta de aportes (antes de Ganancias). */
    netBeforeTax: number;
    /** Ganancia neta sujeta a impuesto anualizada (13 sueldos - deducciones). */
    taxableAnnual: number;
    /** Retención de Ganancias estimada para el mes. */
    monthlyTax: number;
    annualTax: number;
    net: number;
    /** Tasa de descuento total (aportes + Ganancias) sobre el bruto. */
    totalDeductionRate: number;
}

/**
 * Estimación mensual del sueldo neto.
 *
 * Método: la retención mensual de RG 4003 agrega a cada mes 1/12 del aguinaldo
 * (SAC) a la ganancia bruta y 1/12 extra de deducciones personales
 * ("deducción especial adicional doceava parte"). Con sueldo constante eso
 * equivale a anualizar 13 sueldos netos y 13/12 de las deducciones art. 30,
 * aplicar la escala anual y dividir el impuesto entre los 12 meses.
 * Fuente metodológica: ABC/ARCA, metodología de cálculo 4ta categoría 2026
 *   http://servicios.abc.gov.ar/lainstitucion/organismos/impuestosytributos/4tacategoria/metodologia_para_el_calculo_del_periodo_fiscal_2026.pdf
 */
export function grossToNet(gross: number, fam: FamilySituation = {}): GrossToNetResult {
    const contributions = socialContributions(gross);
    const netBeforeTax = gross - contributions.total;
    // 13 sueldos (12 + SAC) menos 13/12 de deducciones (incluye doceava parte).
    const taxableAnnual = Math.max(0, netBeforeTax * 13 - annualPersonalDeductions(fam) * 13 / 12);
    const annualTax = gananciasAnnualTax(taxableAnnual);
    const monthlyTax = annualTax / 12;
    const net = netBeforeTax - monthlyTax;
    const totalDeductionRate = gross > 0 ? (gross - net) / gross * 100 : 0;
    return { gross, contributions, netBeforeTax, taxableAnnual, monthlyTax, annualTax, net, totalDeductionRate };
}
