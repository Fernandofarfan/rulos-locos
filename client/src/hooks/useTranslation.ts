import { useState, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'rulos-locos-lang';

type Lang = 'es' | 'en' | 'pt';

const translations: Record<Lang, Record<string, string>> = {
    es: {
        'nav.dashboard': 'Dashboard',
        'nav.rates': 'Tasas',
        'nav.arbitrage': 'Arbitraje',
        'nav.tools': 'Herramientas',
        'nav.analysis': 'Análisis',
        'nav.portfolio': 'Portfolio',
        'header.subtitle': 'Pro Dashboard',
        'header.updated': 'Actualizado',
        'theme.dark': 'Modo oscuro',
        'theme.light': 'Modo claro',
        'search.placeholder': 'Buscar secciones...',
        'login.enter': 'Ingresar',
        'login.logout': 'Cerrar sesión',
        'footer.status': 'Estado del Sistema',
        'footer.operative': 'OPERATIVO',
        'footer.description': 'Plataforma avanzada de análisis y arbitraje financiero en tiempo real.',
        'alert.critical': 'ALERTA CRÍTICA',
        'alert.market': 'ALERTA DE MERCADO',
        'share.button': 'Compartir',
        'share.copied': '¡Copiado!',
        'share.capturing': 'Capturando...',
        'kiosk.compact': 'Vista compacta',
        'kiosk.single': 'Vista individual',
        'ai.placeholder': '¿Conviene comprar Blue hoy?',
        'ai.greeting': '¡Hola! 👋 Soy Rulo Bot, tu asistente de mercado argentino.',
        'achievements.title': 'Logros',
        'achievements.new': 'Nuevo Logro',
        'lang.es': 'Español',
        'lang.en': 'English',
        'lang.pt': 'Português',
    },
    en: {
        'nav.dashboard': 'Dashboard',
        'nav.rates': 'Rates',
        'nav.arbitrage': 'Arbitrage',
        'nav.tools': 'Tools',
        'nav.analysis': 'Analysis',
        'nav.portfolio': 'Portfolio',
        'header.subtitle': 'Pro Dashboard',
        'header.updated': 'Updated',
        'theme.dark': 'Dark mode',
        'theme.light': 'Light mode',
        'search.placeholder': 'Search sections...',
        'login.enter': 'Log in',
        'login.logout': 'Log out',
        'footer.status': 'System Status',
        'footer.operative': 'OPERATIONAL',
        'footer.description': 'Advanced financial analysis and arbitrage platform in real time.',
        'alert.critical': 'CRITICAL ALERT',
        'alert.market': 'MARKET ALERT',
        'share.button': 'Share',
        'share.copied': 'Copied!',
        'share.capturing': 'Capturing...',
        'kiosk.compact': 'Compact view',
        'kiosk.single': 'Single view',
        'ai.placeholder': 'Should I buy Blue today?',
        'ai.greeting': 'Hello! 👋 I\'m Rulo Bot, your Argentine market assistant.',
        'achievements.title': 'Achievements',
        'achievements.new': 'New Achievement',
        'lang.es': 'Español',
        'lang.en': 'English',
        'lang.pt': 'Português',
    },
    pt: {
        'nav.dashboard': 'Painel',
        'nav.rates': 'Taxas',
        'nav.arbitrage': 'Arbitragem',
        'nav.tools': 'Ferramentas',
        'nav.analysis': 'Análise',
        'nav.portfolio': 'Portfólio',
        'header.subtitle': 'Pro Dashboard',
        'header.updated': 'Atualizado',
        'theme.dark': 'Modo escuro',
        'theme.light': 'Modo claro',
        'search.placeholder': 'Buscar seções...',
        'login.enter': 'Entrar',
        'login.logout': 'Sair',
        'footer.status': 'Status do Sistema',
        'footer.operative': 'OPERACIONAL',
        'footer.description': 'Plataforma avançada de análise financeira e arbitragem em tempo real.',
        'alert.critical': 'ALERTA CRÍTICO',
        'alert.market': 'ALERTA DE MERCADO',
        'share.button': 'Compartilhar',
        'share.copied': 'Copiado!',
        'share.capturing': 'Capturando...',
        'kiosk.compact': 'Visão compacta',
        'kiosk.single': 'Visão individual',
        'ai.placeholder': 'Devo comprar Blue hoje?',
        'ai.greeting': 'Olá! 👋 Sou Rulo Bot, seu assistente de mercado argentino.',
        'achievements.title': 'Conquistas',
        'achievements.new': 'Nova Conquista',
        'lang.es': 'Español',
        'lang.en': 'English',
        'lang.pt': 'Português',
    },
};

export const LANGS: { id: Lang; label: string; flag: string }[] = [
    { id: 'es', label: 'Español', flag: '🇦🇷' },
    { id: 'en', label: 'English', flag: '🇺🇸' },
    { id: 'pt', label: 'Português', flag: '🇧🇷' },
];

export const useTranslation = () => {
    const [lang, setLangState] = useState<Lang>(() => {
        return (localStorage.getItem(STORAGE_KEY) as Lang) || 'es';
    });

    const setLang = useCallback((l: Lang) => {
        setLangState(l);
        localStorage.setItem(STORAGE_KEY, l);
    }, []);

    const t = useCallback((key: string, fallback?: string): string => {
        return translations[lang]?.[key] ?? fallback ?? key;
    }, [lang]);

    const dict = useMemo(() => translations[lang], [lang]);

    return { lang, setLang, t, dict, langs: LANGS };
};
