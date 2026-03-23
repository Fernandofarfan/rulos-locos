/**
 * validate.ts
 * Middlewares de validación de inputs para los endpoints de la API.
 * Usa Zod para validación declarativa con tipos compartidos.
 */
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ─── Esquemas ─────────────────────────────────────────────────────────────────

const VALID_INDICATORS = [
    'blue', 'dolar-blue', 'mep', 'dolar-mep', 'ccl', 'dolar-ccl',
    'oficial', 'dolar-oficial',
    'risk', 'riesgo', 'inflation', 'inflacion',
] as const;

const VALID_RANGES = ['1M', '3M', '6M', '1Y', 'ALL', 'MAX'] as const;

export const IndicatorSchema = z.enum(VALID_INDICATORS);
export const RangeSchema = z.enum(VALID_RANGES);

export const PricesSchema = z.object({
    blue: z.coerce.number().nonnegative().optional(),
    mep: z.coerce.number().nonnegative().optional(),
    ccl: z.coerce.number().nonnegative().optional(),
    oficial: z.coerce.number().nonnegative().optional(),
    crypto: z.coerce.number().nonnegative().optional(),
}).strict();

export const AlertBodySchema = z
    .object({
        message: z
            .string()
            .min(1, 'No puede ser un string vacío')
            .max(1000, 'No puede superar los 1000 caracteres')
            .optional(),
        prices: PricesSchema.optional(),
    })
    .superRefine((data, ctx) => {
        if (data.message === undefined && data.prices === undefined) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [],
                message: 'Se requiere al menos un campo: "message" (string) o "prices" (object).',
            });
        }
    });

export type AlertBody = z.infer<typeof AlertBodySchema>;

// ─── Helper ───────────────────────────────────────────────────────────────────

function badRequest(res: Response, field: string, reason: string): void {
    res.status(400).json({ error: 'Parámetro inválido', field, reason });
}

// ─── Middlewares ──────────────────────────────────────────────────────────────

export function indicatorParam(req: Request, res: Response, next: NextFunction): void {
    const indicator = req.params.indicator as string | string[] | undefined;
    if (indicator === undefined) { next(); return; }
    const indicatorStr = Array.isArray(indicator) ? indicator[0] : indicator;
    const normalized = indicatorStr.toLowerCase().trim();

    const parsed = IndicatorSchema.safeParse(normalized);
    if (!parsed.success) {
        badRequest(
            res,
            'indicator',
            `Indicador "${indicatorStr}" no reconocido. Permitidos: ${VALID_INDICATORS.join(', ')}`,
        );
        return;
    }
    req.params.indicator = parsed.data;
    next();
}

export function rangeQuery(req: Request, res: Response, next: NextFunction): void {
    const { range } = req.query as Record<string, string | undefined>;
    if (!range) { next(); return; }

    const parsed = RangeSchema.safeParse(range.toUpperCase());
    if (!parsed.success) {
        badRequest(res, 'range', `Rango "${range}" no válido. Permitidos: ${VALID_RANGES.join(', ')}`);
        return;
    }
    (req.query as Record<string, string>).range = parsed.data;
    next();
}

export function alertBody(req: Request, res: Response, next: NextFunction): void {
    const body = req.body ?? {};
    const parsed = AlertBodySchema.safeParse(body);

    if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const field = issue.path.length > 0 ? issue.path.join('.') : 'body';
        // Para claves desconocidas (.strict()), incluir los nombres en el mensaje
        let reason = issue.message;
        if (issue.code === 'unrecognized_keys') {
            // En Zod v3/v4 la issue tiene un campo 'keys' con las claves no reconocidas
            const unknownKeys = (issue as unknown as { keys?: string[] }).keys ?? [];
            if (unknownKeys.length > 0) reason = `Claves no permitidas: ${unknownKeys.join(', ')}.`;
        }
        badRequest(res, field, reason);
        return;
    }

    // Normalizar precios coercidos al body para controladores
    if (parsed.data.prices) {
        req.body.prices = parsed.data.prices;
    }
    next();
}

export function testBody(req: Request, _res: Response, next: NextFunction): void {
    req.body = {};
    next();
}
