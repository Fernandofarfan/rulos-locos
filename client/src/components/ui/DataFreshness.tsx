import { useEffect, useState } from 'react';

interface DataFreshnessProps {
    source: string;
    updatedAt: number | string | Date | undefined;
    staleAfterMs?: number;
}

export function DataFreshness({ source, updatedAt, staleAfterMs = 300_000 }: DataFreshnessProps) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(timer);
    }, []);
    const timestamp = updatedAt === undefined ? NaN : new Date(updatedAt).getTime();
    const age = now - timestamp;
    const stale = !Number.isFinite(timestamp) || age > staleAfterMs;
    return (
        <p className={`text-xs ${stale ? 'text-amber-400' : 'text-slate-500'}`}>
            Fuente: {source} · {Number.isFinite(timestamp) ? `actualizado hace ${Math.max(0, Math.floor(age / 60_000))} min` : 'sin fecha de actualización'}
            {stale && ' · datos posiblemente desactualizados'}
        </p>
    );
}
