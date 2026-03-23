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
        color: "text-gray-400",
        bg: "bg-gray-500/10 border-gray-500/20",
        icon: <AlertCircle size={20} className="text-gray-400" />
      };
    }

    const maxSpread = Math.max(...arbitrageOpportunities.map(o => o.rentabilidad));
    
    if (maxSpread > 2.5) {
      return {
        sentiment: 'Alcista Fuerte (Oportunidad Alta)',
        score: 92,
        message: `Detectamos una divergencia inusual del ${maxSpread.toFixed(2)}%. El mercado presenta alta volatilidad favorable para arbitraje.`,
        color: "text-green-500",
        bg: "bg-green-500/10 border-green-500/20",
        icon: <TrendingUp size={20} className="text-green-500" />
      };
    } else if (maxSpread > 1.0) {
      return {
        sentiment: 'Moderado (Oportunidades Estables)',
        score: 75,
        message: "El mercado muestra spreads saludables. Es un buen momento para operar con riesgo bajo.",
        color: "text-blue-500",
        bg: "bg-blue-500/10 border-blue-500/20",
        icon: <Sparkles size={20} className="text-blue-500" />
      };
    } else {
      return {
        sentiment: 'Baja Volatilidad',
        score: 40,
        message: "Los precios están convergiendo. Las oportunidades de arbitraje son escasas en este momento.",
        color: "text-orange-500",
        bg: "bg-orange-500/10 border-orange-500/20",
        icon: <TrendingDown size={20} className="text-orange-500" />
      };
    }
  }, [arbitrageOpportunities]);

  return (
    <div className={`rounded-xl border p-4 mb-4 backdrop-blur-sm ${insight.bg} transition-all duration-500`}>
      <div className="flex items-start space-x-3">
        <div className="p-2 rounded-lg bg-black/20">
          {insight.icon}
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
          <p className="text-white font-medium text-lg leading-tight mb-1">
            {insight.sentiment}
          </p>
          <p className="text-gray-400 text-sm">
            {insight.message}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MarketInsight;
