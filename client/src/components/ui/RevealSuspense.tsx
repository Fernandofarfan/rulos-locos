import React, { Suspense, useRef, useState, useEffect } from 'react';
import { SectionReveal } from './SectionReveal';
import { SectionErrorBoundary } from './SectionErrorBoundary';

interface RevealSuspenseProps {
    fallback: React.ReactNode;
    children: React.ReactNode;
    /** Retraso antes de disparar la animación (ms). Por defecto 120ms. */
    delay?: number;
    /** Altura mínima del placeholder mientras la sección está diferida (preserva posición de scroll) */
    minHeight?: string;
}

/**
 * Render diferido + Suspense + SectionReveal.
 *
 * - NO monta el JSX hasta que la sección esté a ≤400px del viewport (reduce trabajo DOM inicial).
 * - Muestra el fallback-skeleton mientras está fuera de rango (preserva altura de scroll).
 * - Una vez montada, nunca se desmonta.
 * - SectionReveal dispara la animación fade-in + slide-up al entrar al viewport real.
 */
export const RevealSuspense: React.FC<RevealSuspenseProps> = ({
    fallback,
    children,
    delay = 120,
    minHeight = '16rem',
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        // Si el elemento ya está en o cerca del viewport (ej: navegación por hash),
        // rendereamos de inmediato sin esperar al observer
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight + 600) {
            setShouldRender(true);
            return;
        }

        const obs = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setShouldRender(true);
                    obs.disconnect();
                }
            },
            { rootMargin: '600px 0px', threshold: 0 }
        );

        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    return (
        <div ref={ref}>
            {shouldRender ? (
                <SectionReveal delay={delay}>
                    <SectionErrorBoundary>
                        <Suspense fallback={fallback}>{children}</Suspense>
                    </SectionErrorBoundary>
                </SectionReveal>
            ) : (
                <div style={{ minHeight }}>{fallback}</div>
            )}
        </div>
    );
};

