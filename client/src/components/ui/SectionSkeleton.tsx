import React from 'react';

interface SectionSkeletonProps {
  cards?: number;
  cols?: 1 | 2 | 3;
  height?: string;
}

export const SectionSkeleton: React.FC<SectionSkeletonProps> = ({
  cards = 2,
  cols = 2,
  height = 'h-48',
}) => {
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 lg:grid-cols-3',
  }[cols];

  return (
    <div className={`grid ${gridClass} gap-6 pt-6 pb-4`}>
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className={`glass-panel p-6 ${height} flex flex-col gap-3 overflow-hidden relative`}
        >
          {/* Shimmer sweep */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent pointer-events-none" />

          {/* Header row */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/8 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-white/8 rounded w-1/3" />
              <div className="h-2 bg-white/5 rounded w-1/2" />
            </div>
            <div className="h-5 w-14 bg-white/5 rounded-full" />
          </div>
          {/* Value */}
          <div className="h-9 bg-white/8 rounded-lg w-2/5" />
          {/* Lines */}
          <div className="flex-1 flex flex-col gap-2 mt-1">
            <div className="h-2 bg-white/5 rounded w-full" />
            <div className="h-2 bg-white/5 rounded w-4/5" />
            <div className="h-2 bg-white/5 rounded w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
};
