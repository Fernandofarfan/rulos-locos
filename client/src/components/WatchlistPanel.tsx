import React from 'react';
import { Star, X, TrendingUp, TrendingDown } from 'lucide-react';
import { useWatchlist } from '../hooks/useWatchlist';

interface WatchlistItem {
    id: string;
    label: string;
    price?: number;
    change?: number;
    currency?: string;
}

interface WatchlistPanelProps {
    availableAssets: WatchlistItem[];
}

export const WatchlistPanel: React.FC<WatchlistPanelProps> = ({ availableAssets }) => {
    const { watchlist, removeFromWatchlist } = useWatchlist();

    if (watchlist.length === 0) return null;

    const watchedItems = watchlist
        .map(id => availableAssets.find(a => a.id === id))
        .filter(Boolean) as WatchlistItem[];

    if (watchedItems.length === 0) return null;

    return (
        <div className="glass-panel p-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
                <Star size={14} className="text-amber-400 fill-amber-400" />
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Mis Favoritos</h3>
                <span className="text-[9px] text-slate-600 ml-1">({watchedItems.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
                {watchedItems.map(item => (
                    <div
                        key={item.id}
                        className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs group hover:border-amber-400/30 transition-colors"
                    >
                        <span className="font-bold text-slate-200">{item.label}</span>
                        {item.price !== undefined && (
                            <span className="font-mono text-white">
                                {item.currency ?? '$'}{item.price.toFixed(item.price > 1000 ? 0 : 2)}
                            </span>
                        )}
                        {item.change !== undefined && (
                            <span className={`flex items-center gap-0.5 font-semibold ${item.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {item.change >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                                {Math.abs(item.change).toFixed(2)}%
                            </span>
                        )}
                        <button
                            onClick={() => removeFromWatchlist(item.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-all"
                            aria-label={`Quitar ${item.label} de favoritos`}
                        >
                            <X size={10} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// StarButton to add/remove asset to watchlist
export const StarButton: React.FC<{ assetId: string; small?: boolean }> = ({ assetId, small = false }) => {
    const { toggleWatchlist, isWatched } = useWatchlist();
    const watched = isWatched(assetId);
    return (
        <button
            onClick={() => toggleWatchlist(assetId)}
            aria-label={watched ? `Quitar de favoritos` : `Agregar a favoritos`}
            title={watched ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            className={`transition-all ${watched ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}`}
        >
            <Star size={small ? 11 : 14} fill={watched ? 'currentColor' : 'none'} />
        </button>
    );
};
