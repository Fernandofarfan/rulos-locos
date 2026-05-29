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
            {/* Gradient border top with glow */}
            <div className="h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent shadow-[0_0_10px_rgba(59,130,246,0.3)]" />

            <div className="bg-[#0a0d11]/90 backdrop-blur-2xl backdrop-saturate-150 border-t border-white/5 px-2 pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center justify-around py-2">
                    {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
                        const isActive = activeView === id;
                        return (
                            <button
                                key={id}
                                onClick={() => onViewChange(id)}
                                className={`relative flex flex-col items-center gap-1 py-2 px-4 rounded-2xl transition-all duration-300 min-w-[60px] ${
                                    isActive
                                        ? 'text-blue-400'
                                        : 'text-slate-500 active:text-slate-300 hover:text-slate-400'
                                }`}
                            >
                                {/* Active background glow */}
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-blue-500/5 rounded-2xl animate-fade-in-scale"></div>
                                )}
                                
                                <div className={`relative p-2 rounded-xl transition-all duration-300 ${
                                    isActive ? 'bg-blue-500/20 scale-110 shadow-lg shadow-blue-500/20' : ''
                                }`}>
                                    <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
                                    {isActive && (
                                        <div className="absolute inset-0 rounded-xl bg-blue-500/10 animate-pulse-soft"></div>
                                    )}
                                </div>
                                <span className={`relative text-[9px] font-bold tracking-wide transition-all duration-300 ${
                                    isActive ? 'text-blue-400 scale-105' : ''
                                }`}>
                                    {label}
                                </span>
                                {isActive && (
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
};
