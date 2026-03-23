import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * Botón flotante para volver al inicio de la página.
 * Aparece después de scrollear 400px hacia abajo.
 */
export const ScrollToTop: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollUp = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      onClick={scrollUp}
      aria-label="Volver al inicio"
      className={[
        'fixed bottom-20 right-6 z-50',
        'w-10 h-10 rounded-full',
        'bg-white/5 hover:bg-white/10 backdrop-blur-md',
        'border border-white/10 hover:border-white/20',
        'text-slate-400 hover:text-white',
        'flex items-center justify-center',
        'shadow-lg hover:shadow-accent-primary/20',
        'transition-all duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary',
        visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none',
      ].join(' ')}
    >
      <ArrowUp size={16} />
    </button>
  );
};
