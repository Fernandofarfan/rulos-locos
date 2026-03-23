import React, { useEffect, useState } from 'react';
import { Bot, Sparkles, AlertCircle } from 'lucide-react';


export const SmartInsight: React.FC = () => {
    const [insight, setInsight] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        const fetchInsight = async () => {
            try {
                // apiService should implement this, but we can do a direct fetch for now
                // or extend apiService
                const res = await fetch('/api/ai/insight');
                if (!res.ok) throw new Error('Failed to fetch insight');
                const data = await res.json();

                setInsight(data.insight);
                if (data.insight.includes("modo offline")) {
                    setIsOffline(true);
                }
            } catch (error) {
                console.error("Error fetching AI insight:", error);
                setInsight('Hubo un problema de conexión con el Asistente IA. Intentá más tarde.');
                setIsOffline(true);
            } finally {
                setLoading(false);
            }
        };

        fetchInsight();
    }, []);

    return (
        <div className="glass-panel p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                <Bot size={80} />
            </div>

            <div className="flex items-center gap-2 mb-3 relative z-10">
                <div className="p-1.5 bg-indigo-500/20 rounded-md text-indigo-400">
                    {loading ? <Sparkles size={16} className="animate-pulse" /> : <Bot size={16} />}
                </div>
                <h3 className="text-sm font-bold text-slate-200">Rulo Bot <span className="text-[10px] text-indigo-400 ml-1 bg-indigo-500/10 px-1.5 py-0.5 rounded-full border border-indigo-500/20">AI Insight</span></h3>
                {isOffline && !loading && (
                    <div className="ml-auto text-[10px] flex items-center gap-1 text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        <AlertCircle size={10} /> Clave Faltante
                    </div>
                )}
            </div>

            <div className="relative z-10">
                {loading ? (
                    <div className="space-y-2 animate-pulse">
                        <div className="h-3 bg-white/5 rounded w-full"></div>
                        <div className="h-3 bg-white/5 rounded w-5/6"></div>
                        <div className="h-3 bg-white/5 rounded w-4/6"></div>
                    </div>
                ) : (
                    <p className={`text-sm leading-relaxed ${isOffline ? 'text-slate-400 italic' : 'text-slate-300'}`}>
                        {insight}
                    </p>
                )}
            </div>

            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        </div>
    );
};
