import React from 'react';
import { X, Activity } from 'lucide-react';
import { StatusPage } from './StatusPage';

interface StatusModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
            <div
                className="relative glass-panel p-6 w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                            <Activity size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white tracking-tight">
                                Estado de Servicios & APIs
                            </h2>
                            <p className="text-xs text-slate-400">
                                Monitoreo en tiempo real de nodos y proveedores de datos
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <StatusPage />
            </div>
        </div>
    );
};
