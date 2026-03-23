import React from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, X } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
    const { isInstallable, installPWA } = usePWAInstall();
    const [dismissed, setDismissed] = React.useState(false);

    if (!isInstallable || dismissed) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 z-50 flex items-start gap-4 animate-in slide-in-from-bottom-5">
            <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400 mt-1">
                <Download size={24} />
            </div>
            <div className="flex-1">
                <h3 className="text-white font-medium">Instalar Rulos Locos</h3>
                <p className="text-sm text-slate-400 mt-1">
                    Añadí la app a tu inicio para acceso rápido y modo sin conexión.
                </p>
                <div className="mt-3 flex gap-2">
                    <button
                        onClick={installPWA}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 px-3 rounded-lg transition-colors"
                    >
                        Instalar
                    </button>
                    <button
                        onClick={() => setDismissed(true)}
                        className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        Ahora no
                    </button>
                </div>
            </div>
            <button
                onClick={() => setDismissed(true)}
                className="text-slate-500 hover:text-slate-300 absolute top-2 right-2"
            >
                <X size={16} />
            </button>
        </div>
    );
};
