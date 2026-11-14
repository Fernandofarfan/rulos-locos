export function provenanceReplacer(_key: string, value: unknown): unknown {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const record = value as Record<string, unknown>;
    const source = typeof record.source === 'string' ? record.source : undefined;
    const hasFlag = typeof record.isEstimated === 'boolean' || typeof record.estimated === 'boolean' || typeof record.isFallback === 'boolean';
    if (!source && !hasFlag) return value;
    const estimatedSource = source ? /estimado|referencia|fallback|offline/i.test(source) : false;
    const isEstimated = record.isEstimated === true || record.estimated === true || record.isFallback === true || estimatedSource;
    return {
        ...record,
        source: isEstimated ? (source === 'referencia' ? 'referencia' : 'estimado') : (source ?? 'desconocido'),
        isEstimated,
    };
}
