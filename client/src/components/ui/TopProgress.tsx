import React, { useEffect, useState } from 'react';

/**
 * Barra de progreso fina en la parte superior de la página (estilo GitHub/YouTube).
 * Muestra automáticamente durante la carga inicial y se oculta al terminar.
 */
interface TopProgressProps {
  loading: boolean;
}

export const TopProgress: React.FC<TopProgressProps> = ({ loading }) => {
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    let ticker: ReturnType<typeof setInterval> | undefined;
    let exitTimeout: ReturnType<typeof setTimeout> | undefined;

    if (loading) {
      setVisible(true);
      setExiting(false);
      setWidth(5);

      ticker = setInterval(() => {
        setWidth(w => {
          if (w >= 90) return w;
          const increment = w < 40 ? 8 : w < 70 ? 3 : 0.5;
          return Math.min(w + increment, 90);
        });
      }, 120);
    } else if (visible) {
      setWidth(100);
      setExiting(true);
      exitTimeout = setTimeout(() => {
        setVisible(false);
        setWidth(0);
        setExiting(false);
      }, 500);
    }

    return () => {
      clearInterval(ticker);
      clearTimeout(exitTimeout);
    };
  }, [loading, visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[2px] pointer-events-none"
      role="progressbar"
      aria-valuenow={width}
    >
      <div
        className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
        style={{
          width: `${width}%`,
          transition: exiting
            ? 'width 0.3s ease-out, opacity 0.2s ease-out 0.3s'
            : 'width 0.15s ease-out',
          opacity: exiting ? 0 : 1,
        }}
      />
    </div>
  );
};
