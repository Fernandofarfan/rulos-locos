import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Skeleton } from './ui/Skeleton';
import { useFlash } from '../hooks/useFlash';

interface StatsCardProps {
    label: string;
    value: string | number;
    subValue?: string;
    subColor?: string;
    icon?: LucideIcon;
    loading?: boolean;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    color?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
    label,
    value,
    subValue,
    icon: Icon,
    loading,
    trend,
    trendValue,
    color = "text-white"
}) => {
    // Flash Effect
    const cleanValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, "")) : value;
    const flashClass = useFlash(cleanValue || 0, 'text-emerald-400 brightness-125', 'text-rose-400 brightness-125');

    // Trend Logic
    const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;
    const trendClass = trend === 'up' ? 'text-emerald-400 bg-emerald-400/10' : trend === 'down' ? 'text-rose-400 bg-rose-400/10' : 'text-slate-400 bg-slate-400/10';

    if (loading) {
        return (
            <div className="glass-panel p-6 h-full flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <Skeleton variant="circular" width={40} height={40} />
                        <Skeleton variant="text" width={80} />
                    </div>
                </div>
                <div className="mt-4">
                    <Skeleton variant="text" height={36} width={120} className="mb-2" />
                    <Skeleton variant="text" height={16} width={100} />
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel p-6 relative overflow-hidden group h-full flex flex-col justify-between hover-lift">
            {/* Animated Background Gradient */}
            <div className={`absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-0 group-hover:opacity-15 transition-all duration-700 blur-3xl bg-current ${color} group-hover:scale-125`}></div>
            
            {/* Subtle top border gradient */}
            <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${color}`}></div>

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 group-hover:border-white/20 transition-all duration-300 group-hover:scale-105 shadow-lg`}>
                        {Icon && <Icon size={18} className={`${color} drop-shadow-sm`} />}
                    </div>
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{label}</span>
                </div>

                {trend && (
                    <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold border ${trendClass} backdrop-blur-sm transition-all duration-300 group-hover:scale-105`}>
                        <TrendIcon size={12} />
                        {trendValue}
                    </div>
                )}
            </div>

            <div className="relative z-10 mt-auto">
                <div
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                    aria-label={`${label}: ${value}`}
                    className="text-3xl xl:text-4xl font-black text-white tracking-tight leading-none"
                >
                    <span className={`inline-block transition-[color,filter] duration-300 ${flashClass}`}>
                        {value}
                    </span>
                </div>

                {subValue && (
                    <div className="flex items-center gap-2 mt-3">
                         <div className={`w-1 h-8 rounded-full bg-gradient-to-b ${color.replace('text-', 'from-')}/40 to-transparent`}></div>
                         <span className="text-[11px] text-slate-500 font-medium leading-tight">{subValue}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
