import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

/**
 * Banner que aparece cuando el usuario pierde conexión a internet.
 * Desaparece soló 2 segundos después de reconectarse.
 */
export const OfflineBanner: React.FC = () => {
  const [online, setOnline] = useState(navigator.onLine);
  const [showReconnect, setShowReconnect] = useState(false);

  useEffect(() => {
    const handleOffline = () => setOnline(false);
    const handleOnline = () => {
      setOnline(true);
      setShowReconnect(true);
      const t = setTimeout(() => setShowReconnect(false), 2500);
      return () => clearTimeout(t);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Nada que mostrar si online y sin mensaje de reconexión
  if (online && !showReconnect) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      className={[
        'fixed top-[110px] left-1/2 -translate-x-1/2 z-[9999]',
        'flex items-center gap-2.5 px-5 py-2.5 rounded-full',
        'text-xs font-semibold tracking-wide',
        'shadow-2xl border backdrop-blur-md',
        'transition-all duration-400',
        online
          ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-400'
          : 'bg-rose-950/90 border-rose-500/30 text-rose-300',
      ].join(' ')}
    >
      {online ? (
        <>
          <Wifi size={14} className="flex-shrink-0" />
          Conexión restablecida
        </>
      ) : (
        <>
          <WifiOff size={14} className="flex-shrink-0 animate-pulse" />
          Sin conexión — mostrando datos en caché
        </>
      )}
    </div>
  );
};
