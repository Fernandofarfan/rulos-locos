import { useState, useEffect, useRef } from 'react';

/**
 * Devuelve los segundos que faltan para el próximo refresh.
 * Se reinicia cada vez que `lastUpdated` cambia.
 *
 * @param intervalMs  Intervalo de refresh en ms (default: 60000)
 * @returns           Segundos restantes (0–intervalSec)
 */
export function useRefreshCountdown(lastUpdated: Date | null, intervalMs = 60_000): number {
    const [seconds, setSeconds] = useState<number>(intervalMs / 1000);
    const lastUpdatedRef = useRef<Date | null>(null);

    useEffect(() => {
        if (!lastUpdated) return;

        // Cuando cambia lastUpdated, reiniciamos la cuenta
        lastUpdatedRef.current = lastUpdated;
        setSeconds(intervalMs / 1000);

        const tick = setInterval(() => {
            if (!lastUpdatedRef.current) return;
            const elapsed = (Date.now() - lastUpdatedRef.current.getTime()) / 1000;
            const remaining = Math.max(0, Math.round(intervalMs / 1000 - elapsed));
            setSeconds(remaining);
        }, 1000);

        return () => clearInterval(tick);
    }, [lastUpdated, intervalMs]);

    return seconds;
}
