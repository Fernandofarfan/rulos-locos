import { Prisma } from '@prisma/client';

export function toPlain(value: unknown, key?: string): unknown {
    if (Prisma.Decimal.isDecimal(value)) return value.toNumber();
    if (value instanceof Date) return key === 'date' ? value.toISOString().slice(0, 10) : value.toISOString();
    if (Array.isArray(value)) return value.map(item => toPlain(item));
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([name, child]) => [name, toPlain(child, name)]));
    }
    return value;
}
