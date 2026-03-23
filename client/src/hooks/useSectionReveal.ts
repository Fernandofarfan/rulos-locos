import { useRef, useState, useEffect } from 'react';

/**
 * Detecta si el elemento referenciado entró al viewport.
 * Desconecta el observer tras el primer disparo (la animación ocurre solo una vez).
 *
 * @param threshold  Fracción del elemento visible para disparar (default: 0.12)
 */
export function useSectionReveal(threshold = 0.05) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        // Si prefers-reduced-motion, mostramos directamente sin animación
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setVisible(true);
            return;
        }

        // Si el elemento ya está en el viewport o ya fue scrolleado (arriba del fold),
        // lo mostramos de inmediato sin esperar al observer
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight + 100 || rect.bottom < 0) {
            setVisible(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold, rootMargin: '200px 0px 0px 0px' }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [threshold]);

    return { ref, visible };
}
