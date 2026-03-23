import React from 'react';
import { useSectionReveal } from '../../hooks/useSectionReveal';

interface SectionRevealProps {
    children: React.ReactNode;
    /** Retraso de la transición en ms (útil para escalonar hijos) */
    delay?: number;
    /** Clase extra que se aplica al wrapper */
    className?: string;
}

/**
 * Envuelve contenido con una animación de fade-in + slide-up
 * que se dispara al entrar al viewport, usando IntersectionObserver.
 *
 * @example
 * <SectionReveal delay={100}>
 *   <MiComponente />
 * </SectionReveal>
 */
export const SectionReveal: React.FC<SectionRevealProps> = ({
    children,
    delay = 0,
    className = '',
}) => {
    const { ref, visible } = useSectionReveal();

    return (
        <div
            ref={ref}
            style={{ transitionDelay: `${delay}ms` }}
            className={[
                'transition-all duration-700 ease-out',
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
                className,
            ].join(' ')}
        >
            {children}
        </div>
    );
};
