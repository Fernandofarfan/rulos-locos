import { useState, useCallback } from 'react';

const STORAGE_KEY = 'rulos_locos_watchlist';

export function useWatchlist() {
    const [watchlist, setWatchlist] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? (JSON.parse(stored) as string[]) : [];
        } catch {
            return [];
        }
    });

    const addToWatchlist = useCallback((id: string) => {
        setWatchlist(prev => {
            if (prev.includes(id)) return prev;
            const next = [...prev, id];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const removeFromWatchlist = useCallback((id: string) => {
        setWatchlist(prev => {
            const next = prev.filter(item => item !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const toggleWatchlist = useCallback((id: string) => {
        setWatchlist(prev => {
            const next = prev.includes(id)
                ? prev.filter(item => item !== id)
                : [...prev, id];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const isWatched = useCallback((id: string) => {
        return watchlist.includes(id);
    }, [watchlist]);

    return { watchlist, addToWatchlist, removeFromWatchlist, toggleWatchlist, isWatched };
}
