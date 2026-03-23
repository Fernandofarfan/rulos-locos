import React from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

interface Props {
    compact?: boolean;
    className?: string;
}

/**
 * Botón que gestiona la suscripción/des-suscripción a Push Notifications.
 * Se muestra solo en entornos que soportan SW + PushManager
 * (producción con HTTPS o localhost).
 */
export const PushNotificationToggle: React.FC<Props> = ({ compact = false, className = '' }) => {
    const { supported, permission, subscribed, loading, error, subscribe, unsubscribe } = usePushNotifications();

    if (!supported) return null; // No mostrar en navegadores sin soporte

    const handleClick = () => {
        if (subscribed) void unsubscribe();
        else void subscribe();
    };

    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            <button
                onClick={handleClick}
                disabled={loading || permission === 'denied'}
                title={
                    permission === 'denied'
                        ? 'Notificaciones bloqueadas en el navegador'
                        : subscribed
                            ? 'Desactivar alertas push'
                            : 'Activar alertas push de precio'
                }
                className={[
                    'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all',
                    subscribed
                        ? 'bg-blue-500/10 border-blue-400/30 text-blue-400 hover:bg-red-500/10 hover:border-red-400/30 hover:text-red-400'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20',
                    loading ? 'cursor-wait opacity-70' : '',
                    permission === 'denied' ? 'opacity-40 cursor-not-allowed' : '',
                ].join(' ')}
            >
                {loading
                    ? <Loader2 size={13} className="animate-spin" />
                    : subscribed
                        ? <Bell size={13} className="text-blue-400" />
                        : <BellOff size={13} />
                }
                {!compact && (
                    <span>
                        {loading
                            ? 'Procesando…'
                            : subscribed
                                ? 'Alertas activas'
                                : permission === 'denied'
                                    ? 'Notificaciones bloqueadas'
                                    : 'Activar alertas push'
                        }
                    </span>
                )}
            </button>
            {error && (
                <p className="text-[10px] text-red-400 px-1">{error}</p>
            )}
        </div>
    );
};
