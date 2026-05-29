import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'theme';

function getSystemTheme(): 'dark' | 'light' {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export const useTheme = () => {
    const [theme, setTheme] = useState<'dark' | 'light'>(() => {
        const stored = localStorage.getItem(STORAGE_KEY) as 'dark' | 'light' | 'system' | null;
        if (stored === 'dark' || stored === 'light') return stored;
        return getSystemTheme();
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(STORAGE_KEY, theme);

        if (theme === 'light') {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }
    }, [theme]);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: light)');
        const handler = (e: MediaQueryListEvent) => {
            const stored = localStorage.getItem(STORAGE_KEY) as 'dark' | 'light' | 'system' | null;
            if (!stored || stored === 'system') {
                setTheme(e.matches ? 'light' : 'dark');
            }
        };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    }, []);

    const resetToSystem = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setTheme(getSystemTheme());
    }, []);

    return { theme, toggleTheme, resetToSystem };
};
