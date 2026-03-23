import { useState, useEffect } from 'react';

const SECTIONS = ['dashboard', 'mercado', 'arbitrage', 'herramientas', 'charts', 'portfolio'] as const;
type SectionId = typeof SECTIONS[number];

/**
 * Observa qué sección del dashboard está visible y devuelve su id.
 * Usa IntersectionObserver para mayor rendimiento que el evento scroll.
 */
export function useActiveSection(): SectionId {
  const [active, setActive] = useState<SectionId>('dashboard');

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    SECTIONS.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        {
          // Considera visible cuando el borde superior de la sección
          // está entre el 15% y el 50% del viewport
          rootMargin: '-15% 0px -50% 0px',
          threshold: 0,
        }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach(o => o.disconnect());
  }, []);

  return active;
}
