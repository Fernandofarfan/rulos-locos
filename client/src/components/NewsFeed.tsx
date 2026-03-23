import React from 'react';
import { Newspaper, ExternalLink, Clock } from 'lucide-react';
import { apiService } from '../services/api';

import { EmptyState } from './ui/EmptyState';

interface NewsItem {
    id: number;
    title: string;
    source: string;
    publishedAt: string | null;
    url: string;
    category: 'Economy' | 'Crypto' | 'Policy';
}

/** Formatea una fecha ISO a tiempo relativo en español usando Intl.RelativeTimeFormat */
function formatRelativeTime(isoDate: string | null | undefined): string {
    if (!isoDate) return 'Reciente';
    try {
        const rtf = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' });
        const diffMs = new Date(isoDate).getTime() - Date.now();
        const diffSecs  = Math.round(diffMs / 1000);
        const diffMins  = Math.round(diffSecs  / 60);
        const diffHours = Math.round(diffMins  / 60);
        const diffDays  = Math.round(diffHours / 24);

        if (Math.abs(diffDays)  >= 1) return rtf.format(diffDays,  'day');
        if (Math.abs(diffHours) >= 1) return rtf.format(diffHours, 'hour');
        if (Math.abs(diffMins)  >= 1) return rtf.format(diffMins,  'minute');
        return 'ahora';
    } catch {
        return 'Reciente';
    }
}

const MOCK_FALLBACK: NewsItem[] = [];


export const NewsFeed: React.FC = () => {
    const [news, setNews] = React.useState<NewsItem[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(false);

    const fetchNews = async () => {
        try {
            setLoading(true);
            const data = await apiService.getNews();
            if (Array.isArray(data) && data.length > 0) {
                setNews(data.slice(0, 8));
                setError(false);
            } else {
                setError(true);
                setNews(MOCK_FALLBACK);
            }
        } catch (err: unknown) {
            console.error('Error loading news:', err);
            setError(true);
            setNews(MOCK_FALLBACK);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchNews(); // Initial fetch

        const intervalId = setInterval(fetchNews, 60000); // Update every minute
        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className="glass-panel p-6 flex flex-col min-h-[400px] md:h-[600px]" aria-busy={loading}>
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                            <Newspaper size={20} />
                        </span>
                        Noticias en Vivo
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 ml-1">Últimas actualizaciones del mercado</p>
                </div>
                {loading && (
                    <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 min-h-0">
                {error && news.length === 0 && (
                    <EmptyState
                        title="Sin noticias disponibles"
                        description="No se pudieron cargar las noticias. Verificá tu conexión o intentá más tarde."
                        icon={Newspaper}
                        action={
                            <button
                                onClick={fetchNews}
                                className="text-xs px-3 py-1.5 bg-accent-primary/10 hover:bg-accent-primary/20 border border-accent-primary/30 text-accent-primary rounded-lg transition-all"
                            >
                                Reintentar
                            </button>
                        }
                    />
                )}

                {news.map(item => (
                    <a
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block group bg-white/[0.02] hover:bg-white/5 border border-white/5 rounded-xl p-4 transition-all cursor-pointer"
                    >
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.category === 'Economy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                        item.category === 'Crypto' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                            'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                        }`}>
                                        {item.category}
                                    </span>
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                        <Clock size={10} />
                                        {formatRelativeTime(item.publishedAt)}
                                    </span>
                                </div>
                                <h4 className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors leading-snug">
                                    {item.title}
                                </h4>
                                <div className="mt-2 text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
                                    Fuente: {item.source}
                                </div>
                            </div>
                            <ExternalLink size={16} className="text-slate-600 group-hover:text-accent-primary transition-colors opacity-0 group-hover:opacity-100" />
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
};
