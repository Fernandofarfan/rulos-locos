import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { logger } from '../utils/logger';

export const ReloadPrompt: React.FC = () => {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            logger.info('Service Worker registered', r);
        },
        onRegisterError(error) {
            logger.error('Service Worker registration error', error);
        },
    });

    if (!needRefresh) return null;

    return (
        <div className="fixed bottom-4 right-4 bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-2xl z-50 flex items-center gap-4 animate-in slide-in-from-bottom-5">
            <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400">
                <RefreshCw size={24} className="animate-spin-slow" />
            </div>
            <div className="flex-1">
                <h3 className="text-white font-medium">Actualización disponible</h3>
                <p className="text-sm text-slate-400">Recargá para ver la nueva versión.</p>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={() => updateServiceWorker(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-1.5 px-3 rounded-lg transition-colors"
                >
                    Recargar
                </button>
                <button
                    onClick={() => setNeedRefresh(false)}
                    className="p-1.5 text-slate-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};
