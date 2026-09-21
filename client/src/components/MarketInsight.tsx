import React, { useMemo } from 'react';
import { Sparkles, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import type { ArbitrageOpportunity } from '../types';

interface MarketInsightProps {
  arbitrageOpportunities: ArbitrageOpportunity[];
  marketTrend?: 'bullish' | 'bearish' | 'neutral';
}

const MarketInsight: React.FC<MarketInsightProps> = ({ arbitrageOpportunities }) => {
  const insight = useMemo(() => {
    if (!arbitrageOpportunities || arbitrageOpportunities.length === 0) {
      return {
        sentiment: 'Neutral',
        score: 50,
        message: "Esperando datos del mercado para análisis...",
        color: "text-slate-400",
        bg: "bg-slate-500/10 border-slate-500/20",
        IconComponent: AlertCircle,
        iconClass: "text-slate-400"
      };
    }

    const maxSpread = Math.max(...arbitrageOpportunities.map(o => o.rentabilidad));
    
    if (maxSpread > 2.5) {
      return {
        sentiment: 'Alcista Fuerte (Oportunidad Alta)',
        score: 92,
        message: `Detectamos una divergencia inusual del ${maxSpread.toFixed(2)}%. El mercado presenta alta volatilidad favorable para arbitraje.`,
        color: "text-emerald-400",
        bg: "bg-emerald-500/10 border-emerald-500/20",
        IconComponent: TrendingUp,
        iconClass: "text-emerald-400"
      };
    } else if (maxSpread > 1.0) {
      return {
        sentiment: 'Moderado (Oportunidades Estables)',
        score: 75,
        message: "El mercado muestra spreads saludables. Es un buen momento para operar con riesgo bajo.",
        color: "text-blue-400",
        bg: "bg-blue-500/10 border-blue-500/20",
        IconComponent: Sparkles,
        iconClass: "text-blue-400"
      };
    } else {
      return {
        sentiment: 'Baja Volatilidad',
        score: 40,
        message: "Los precios están convergiendo. Las oportunidades de arbitraje son escasas en este momento.",
        color: "text-amber-400",
        bg: "bg-amber-500/10 border-amber-500/20",
        IconComponent: TrendingDown,
        iconClass: "text-amber-400"
      };
    }
  }, [arbitrageOpportunities]);

  return (
    <div className={`rounded-xl border p-4 mb-4 backdrop-blur-sm ${insight.bg} transition-all duration-500`}>
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-lg bg-black/20`}>
          <insight.IconComponent size={20} className={insight.iconClass} />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <h3 className={`font-semibold text-sm uppercase tracking-wider ${insight.color}`}>
              Market AI Insight
            </h3>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${insight.bg} ${insight.color} border border-current opacity-80`}>
              Score: {insight.score}/100
            </span>
          </div>
          <p className="text-text-primary font-medium text-lg leading-tight mb-1">
            {insight.sentiment}
          </p>
          <p className="text-text-secondary text-sm">
            {insight.message}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MarketInsight;
