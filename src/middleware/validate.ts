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

// ─── Esquemas adicionales (endpoints de usuario) ────────────────────────────────

export const PortfolioCreateSchema = z.object({
    asset: z.string().trim().min(1).max(20),
    buyPrice: z.coerce.number().finite().positive('buyPrice debe ser mayor a 0'),
    amount: z.coerce.number().finite().positive('amount debe ser mayor a 0'),
    date: z.string().max(40).optional(),
    note: z.string().max(500).optional(),
});

export const AlertCreateSchema = z.object({
    asset: z.enum(['blue', 'mep', 'ccl', 'crypto', 'oficial']),
    condition: z.enum(['above', 'below']),
    threshold: z.coerce.number().finite().positive('threshold debe ser mayor a 0'),
});

export const PaperTradeSchema = z.object({
    type: z.enum(['BUY', 'SELL']),
    asset: z.string().trim().min(1).max(20),
    amount: z.coerce.number().finite().positive('amount debe ser mayor a 0'),
    price: z.coerce.number().finite().positive('price debe ser mayor a 0'),
});

export const ExchangeKeySchema = z.object({
    exchange: z.string().trim().min(2).max(30),
    apiKey: z.string().min(4).max(300),
    apiSecret: z.string().min(4).max(300),
    passthrough: z.string().max(300).optional(),
});

export const NewsletterSubscribeSchema = z.object({
    email: z.string().email('Email inválido').max(200),
});

export const ChartInsightSchema = z.object({
    labels: z.array(z.string()).min(1).max(500),
    values: z.array(z.coerce.number()).min(1).max(500),
    assetName: z.string().min(1).max(100),
});

export const PushSubscribeSchema = z.object({
    endpoint: z.string().url(),
    keys: z.object({
        p256dh: z.string().min(1),
        auth: z.string().min(1),
    }),
});

export const AnalyticsEventSchema = z.object({
    event: z.string().min(1).max(100),
    section: z.string().max(100).optional(),
}).passthrough();

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

/**
 * Crea un middleware que valida y normaliza req.body contra un schema Zod.
 * Los campos desconocidos se descartan (comportamiento por defecto de Zod).
 */
export function validateBody(schema: z.ZodTypeAny) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const parsed = schema.safeParse(req.body ?? {});
        if (!parsed.success) {
            const issue = parsed.error.issues[0];
            const field = issue.path.length > 0 ? issue.path.join('.') : 'body';
            badRequest(res, field, issue.message);
            return;
        }
        req.body = parsed.data;
        next();
    };
}
