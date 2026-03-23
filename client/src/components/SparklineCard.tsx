import React, { useMemo } from 'react';

interface SparklineProps {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
    label?: string;
    value?: string;
    change?: number;
}

/**
 * SparklineCard — Mini line chart for dashboard cards.
 * Pure SVG, no dependencies.
 */
export const SparklineCard: React.FC<SparklineProps> = ({
    data,
    width = 120,
    height = 32,
    color = '#3b82f6',
    label,
    value,
    change,
}) => {
    const path = useMemo(() => {
        if (!data.length) return '';
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        const step = width / (data.length - 1);

        const points = data.map((v, i) => {
            const x = i * step;
            const y = height - ((v - min) / range) * (height - 4) - 2;
            return `${x},${y}`;
        });

        return `M${points.join(' L')}`;
    }, [data, width, height]);

    const gradientId = useMemo(() => `spark-${Math.random().toString(36).slice(2, 8)}`, []);

    const areaPath = useMemo(() => {
        if (!path) return '';
        return `${path} L${width},${height} L0,${height} Z`;
    }, [path, width, height]);

    return (
        <div className="flex items-center gap-3">
            {(label || value) && (
                <div className="flex flex-col min-w-0">
                    {label && <span className="text-[9px] text-slate-500 uppercase tracking-wider truncate">{label}</span>}
                    {value && <span className="text-sm font-bold text-white tabular-nums">{value}</span>}
                    {change !== undefined && (
                        <span className={`text-[9px] font-bold ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                        </span>
                    )}
                </div>
            )}
            <svg width={width} height={height} className="flex-shrink-0">
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
                {path && <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
            </svg>
        </div>
    );
};

/**
 * Generate sample sparkline data from a seed (deterministic).
 */
export function generateSparklineData(seed: number, points = 24): number[] {
    const data: number[] = [];
    let val = seed;
    for (let i = 0; i < points; i++) {
        val += (Math.sin(i * 0.5 + seed) * seed * 0.01);
        data.push(val);
    }
    return data;
}
