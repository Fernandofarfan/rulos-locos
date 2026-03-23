import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { useSectionReveal } from '../hooks/useSectionReveal';

interface SectionDividerProps {
  id?: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  badge?: string;
  badgeColor?: 'blue' | 'emerald' | 'amber' | 'violet' | 'rose' | 'cyan';
}

const BADGE_COLORS = {
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

const ICON_COLORS = {
  blue: 'text-blue-400 bg-blue-500/10',
  emerald: 'text-emerald-400 bg-emerald-500/10',
  amber: 'text-amber-400 bg-amber-500/10',
  violet: 'text-violet-400 bg-violet-500/10',
  rose: 'text-rose-400 bg-rose-500/10',
  cyan: 'text-cyan-400 bg-cyan-500/10',
};

const GRADIENT_COLORS = {
  blue: 'from-blue-500/20 via-transparent',
  emerald: 'from-emerald-500/20 via-transparent',
  amber: 'from-amber-500/20 via-transparent',
  violet: 'from-violet-500/20 via-transparent',
  rose: 'from-rose-500/20 via-transparent',
  cyan: 'from-cyan-500/20 via-transparent',
};

export const SectionDivider: React.FC<SectionDividerProps> = ({
  id,
  icon: Icon,
  title,
  description,
  badge,
  badgeColor = 'blue',
}) => {
  const { ref, visible } = useSectionReveal(0.1);

  return (
    <div
      id={id}
      ref={ref}
      style={{ transitionDelay: '0ms' }}
      className={[
        'relative scroll-mt-[124px] pt-4 pb-2',
        'transition-all duration-700 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
      ].join(' ')}
    >
      {/* Gradient line */}
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${GRADIENT_COLORS[badgeColor]} to-transparent`} />

      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className={`p-2.5 rounded-xl ${ICON_COLORS[badgeColor]}`}>
          <Icon size={18} />
        </div>

        {/* Title & description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
            {badge && (
              <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${BADGE_COLORS[badgeColor]}`}>
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{description}</p>
          )}
        </div>
      </div>

      {/* Bottom separator */}
      <div className="mt-4 h-px bg-white/5" />
    </div>
  );
};
