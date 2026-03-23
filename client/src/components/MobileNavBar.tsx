import React from 'react';
import { BarChart3, Landmark, Zap, Wrench, Newspaper } from 'lucide-react';

const NAV_ITEMS = [
    { id: 'dashboard', label: 'Home', icon: BarChart3 },
    { id: 'mercado', label: 'Tasas', icon: Landmark },
    { id: 'arbitrage', label: 'Arbitraje', icon: Zap },
    { id: 'herramientas', label: 'Tools', icon: Wrench },
    { id: 'portfolio', label: 'Portfolio', icon: Newspaper },
] as const;

interface MobileNavBarProps {
    activeView: string;
    onViewChange: (view: string) => void;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({ activeView, onViewChange }) => {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
            {/* Gradient border top */}
            <div className="h-px bg-gradient-to-r from-transparent via-accent-primary/40 to-transparent" />

            <div className="bg-[#0b0e14]/95 backdrop-blur-xl border-t border-white/5 px-2 pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center justify-around py-1.5">
                    {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
                        const isActive = activeView === id;
                        return (
                            <button
                                key={id}
                                onClick={() => onViewChange(id)}
                                className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200 min-w-[56px] ${
                                    isActive
                                        ? 'text-accent-primary'
                                        : 'text-slate-500 active:text-slate-300'
                                }`}
                            >
                                <div className={`p-1.5 rounded-lg transition-all ${
                                    isActive ? 'bg-accent-primary/15 scale-110' : ''
                                }`}>
                                    <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
                                </div>
                                <span className={`text-[9px] font-bold tracking-wide ${
                                    isActive ? 'text-accent-primary' : ''
                                }`}>
                                    {label}
                                </span>
                                {isActive && (
                                    <div className="w-1 h-1 rounded-full bg-accent-primary absolute -bottom-0.5" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
};
