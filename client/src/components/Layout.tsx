import React from 'react';
import { Menu, X, Github, Clock, Settings, RefreshCw, SlidersHorizontal, LogIn, LogOut, User, BarChart3, Landmark, Zap, Wrench, LineChart, Newspaper, Sun, Moon, Search } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useDashboardData } from '../hooks/useDashboardData';

import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useRefreshCountdown } from '../hooks/useRefreshCountdown';
import { useAuth } from '../hooks/useAuth';
import { SettingsModal } from './SettingsModal';
import { SettingsOverlay } from './SettingsOverlay';
import { LoginModal } from './LoginModal';
import { Tooltip } from './ui/Tooltip';
import { MarketTicker } from './MarketTicker';
import { PDFExport } from './PDFExport';
import { TopProgress } from './ui/TopProgress';
import { ScrollToTop } from './ui/ScrollToTop';
import { OfflineBanner } from './ui/OfflineBanner';
import { QRShareButton } from './QRShare';
import { useTranslation, LANGS } from '../hooks/useTranslation';
import { ThemeCustomizer } from './ThemeCustomizer';

interface LayoutProps {
    children: React.ReactNode;
    activeView: string;
    onViewChange: (view: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeView, onViewChange }) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
    const [isOverlayOpen, setIsOverlayOpen] = React.useState(false);
    const [isLoginOpen, setIsLoginOpen] = React.useState(false);
    const { lastUpdated, rate, arbitrage, economics, loading, isRefreshing } = useDashboardData();
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { lang, setLang, t } = useTranslation();
    const countdown = useRefreshCountdown(lastUpdated);
    const [isSearchOpen, setIsSearchOpen] = React.useState(false);

    // Keyboard shortcuts: Alt+1..6 navega secciones, Escape cierra menú/settings/overlay
    useKeyboardShortcuts({
        onEscape: () => {
            if (isMenuOpen) setIsMenuOpen(false);
            else if (isSettingsOpen) setIsSettingsOpen(false);
            else if (isOverlayOpen) setIsOverlayOpen(false);
            else if (isSearchOpen) setIsSearchOpen(false);
        },
        onSearch: () => setIsSearchOpen(prev => !prev),
    });

    const navLink = (id: string, label: string) => (
        <button
            onClick={() => onViewChange(id)}
            className={[
                'text-xs font-medium px-3 py-1.5 rounded-lg transition-all',
                activeView === id
                    ? 'text-white bg-white/10 border border-white/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5',
            ].join(' ')}
        >
            {label}
        </button>
    );

    return (
        <div className="min-h-screen relative flex flex-col bg-app text-primary overflow-x-hidden">
            <TopProgress loading={loading || isRefreshing} />
            <OfflineBanner />
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-accent-primary/20 blur-[100px] animate-pulse-soft"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent-secondary/20 blur-[100px] animate-pulse-soft" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 transition-all duration-300">
                <div className="max-w-7xl mx-auto glass-panel px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-indigo-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                            <span className="text-xl">⚡</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight leading-none">
                                <span className="text-gradient-brand">Rulos Locos</span>
                            </h1>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-accent-primary tracking-wider uppercase">{t('header.subtitle')}</span>
                                {lastUpdated && (
                                    <Tooltip content={`Actualizado: ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`} placement="bottom">
                                        <span
                                            className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-900/50 px-1.5 py-0.5 rounded border border-slate-800 min-w-[42px] justify-center cursor-default"
                                        >
                                            {isRefreshing ? (
                                                <RefreshCw size={8} className="animate-spin text-accent-primary flex-shrink-0" />
                                            ) : countdown <= 10 ? (
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                                            ) : (
                                                <Clock size={8} className="flex-shrink-0" />
                                            )}
                                            {isRefreshing ? 'sync…' : `${countdown}s`}
                                        </span>
                                    </Tooltip>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navLink('dashboard', t('nav.dashboard'))}
                        {navLink('mercado', t('nav.rates'))}
                        {navLink('arbitrage', t('nav.arbitrage'))}
                        {navLink('herramientas', t('nav.tools'))}
                        {navLink('charts', t('nav.analysis'))}
                        {navLink('portfolio', t('nav.portfolio'))}
                        <div className="h-4 w-px bg-white/10 mx-2"></div>
                        <Tooltip content="Buscar secciones (Ctrl+K)" placement="bottom">
                            <button
                                onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
                                aria-label="Buscar"
                                className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-all"
                            >
                                <Search size={18} />
                            </button>
                        </Tooltip>
                        <Tooltip content="Cambiar tema" placement="bottom">
                            <button
                                onClick={toggleTheme}
                                aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                                className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-all"
                            >
                                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                            </button>
                        </Tooltip>
                        <Tooltip content="Configurar alertas" placement="bottom">
                            <button
                                onClick={() => setIsOverlayOpen(true)}
                                aria-label="Configurar alertas"
                                className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-all"
                            >
                                <SlidersHorizontal size={18} />
                            </button>
                        </Tooltip>
                        <Tooltip content="Tema & apariencia" placement="bottom">
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                aria-label="Abrir configuración"
                                className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-all"
                            >
                                <Settings size={20} />
                            </button>
                        </Tooltip>
                        <a href="https://github.com/Fernandofarfan/rulos-locos" target="_blank" rel="noopener noreferrer" aria-label="Ver código en GitHub" className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-all">
                            <Github size={20} />
                        </a>

                        {/* Botón de Login / Avatar */}
                        {user ? (
                            <Tooltip content={`${user.email} — Cerrar sesión`} placement="bottom">
                                <button
                                    onClick={logout}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all border border-slate-700"
                                >
                                    <User size={14} />
                                    {user.name || user.email.split('@')[0]}
                                    <LogOut size={12} className="text-slate-500" />
                                </button>
                            </Tooltip>
                        ) : (
                            <Tooltip content="Iniciar sesión" placement="bottom">
                                <button
                                    onClick={() => setIsLoginOpen(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 transition-all"
                                >
                                    <LogIn size={14} />
                                    {t('login.enter')}
                                </button>
                            </Tooltip>
                        )}
                    </nav>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 text-slate-300 hover:text-white"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                        aria-expanded={isMenuOpen}
                    >
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/85 backdrop-blur-lg pt-24 px-5 md:hidden overflow-y-auto pb-8"
                    onClick={(e) => { if (e.target === e.currentTarget) setIsMenuOpen(false); }}
                >
                    <nav className="flex flex-col gap-1.5">
                        {(
                            [
                                { id: 'dashboard', label: 'Dashboard', icon: BarChart3, badge: 'LIVE', badgeColor: 'text-blue-400 bg-blue-400/10' },
                                { id: 'mercado', label: 'Tasas & Mercado', icon: Landmark, badge: 'BCRA', badgeColor: 'text-emerald-400 bg-emerald-400/10' },
                                { id: 'arbitrage', label: 'Arbitraje', icon: Zap, badge: 'RT', badgeColor: 'text-amber-400 bg-amber-400/10' },
                                { id: 'herramientas', label: 'Herramientas', icon: Wrench, badge: null, badgeColor: '' },
                                { id: 'charts', label: 'Análisis Técnico', icon: LineChart, badge: null, badgeColor: '' },
                                { id: 'portfolio', label: 'Portfolio & Noticias', icon: Newspaper, badge: null, badgeColor: '' },
                            ] as const
                        ).map(({ id, label, icon: Icon, badge, badgeColor }) => (
                            <button
                                key={id}
                                onClick={() => {
                                    onViewChange(id);
                                    setIsMenuOpen(false);
                                }}
                                className={[
                                    'flex items-center gap-4 py-3.5 px-4 rounded-xl transition-all w-full text-left',
                                    activeView === id
                                        ? 'bg-accent-primary/10 border border-accent-primary/20 text-white'
                                        : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent',
                                ].join(' ')}
                            >
                                <div className={`p-2 rounded-lg ${activeView === id ? 'bg-accent-primary/20' : 'bg-white/5'}`}>
                                    <Icon size={16} className={activeView === id ? 'text-accent-primary' : 'text-slate-400'} />
                                </div>
                                <span className="text-sm font-medium flex-1">{label}</span>
                                {badge && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-current/20 ${badgeColor}`}>
                                        {badge}
                                    </span>
                                )}
                                {activeView === id && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
                                )}
                            </button>
                        ))}

                        {/* Separador + acciones rápidas */}
                        <div className="mt-3 pt-3 border-t border-white/5 flex gap-2">
                            <button
                                onClick={() => { setIsMenuOpen(false); setIsOverlayOpen(true); }}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white text-xs font-medium transition-all"
                            >
                                <SlidersHorizontal size={13} />
                                Alertas
                            </button>
                            <button
                                onClick={() => { setIsMenuOpen(false); setIsSettingsOpen(true); }}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white text-xs font-medium transition-all"
                            >
                                <Settings size={13} />
                                Ajustes
                            </button>
                            {!user && (
                                <button
                                    onClick={() => { setIsMenuOpen(false); setIsLoginOpen(true); }}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:text-blue-300 text-xs font-medium transition-all"
                                >
                                    <LogIn size={13} />
                                    Ingresar
                                </button>
                            )}
                        </div>
                    </nav>
                </div>
            )}

            {/* Bloomberg Market Ticker */}
            <div className="fixed top-[88px] left-0 right-0 z-40">
                <MarketTicker
                    rate={rate}
                    dolares={arbitrage?.dolares}
                    global={economics?.global ?? []}
                    merval={economics?.market?.merval ?? []}
                />
            </div>

            {/* Main Content */}
            <main className="flex-grow z-10 pt-[136px] pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                {children}
            </main>

            <PDFExport />
            <ScrollToTop />

            {/* Footer */}
            <footer className="z-10 py-8 border-t border-white/5 mt-auto bg-black/40 backdrop-blur-md relative">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent-primary/50 to-transparent opacity-30"></div>

                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <span className="text-xs">⚡</span>
                            </div>
                            <span className="text-white font-bold tracking-tight">Rulos Locos <span className="text-accent-primary">Pro</span></span>
                        </div>
                        <p className="text-xs text-slate-500 max-w-xs">
                            {t('footer.description')}
                        </p>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{t('footer.status')}</span>
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-xs font-mono text-emerald-400">{t('footer.operative')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <a href="https://github.com/Fernandofarfan" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1 group">
                            <Github size={12} className="group-hover:text-white transition-colors" /> GitHub
                        </a>
                        <div className="h-4 w-px bg-white/10"></div>
                            <span className="text-xs text-slate-600">
                            v3.1.0
                        </span>
                        <div className="h-4 w-px bg-white/10" />
                        <QRShareButton />
                        {/* Language selector */}
                        <div className="flex items-center gap-1">
                            {LANGS.map(l => (
                                <button
                                    key={l.id}
                                    onClick={() => setLang(l.id)}
                                    className={`text-xs px-1.5 py-0.5 rounded transition-all ${
                                        lang === l.id
                                            ? 'text-white bg-white/10'
                                            : 'text-slate-600 hover:text-slate-400'
                                    }`}
                                    title={l.label}
                                >
                                    {l.flag}
                                </button>
                            ))}
                        </div>
                        <div className="h-4 w-px bg-white/10" />
                        <div className="relative">
                            <ThemeCustomizer />
                        </div>
                    </div>
                </div>
            </footer>

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            <SettingsOverlay isOpen={isOverlayOpen} onClose={() => setIsOverlayOpen(false)} />
            <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
        </div>
    );
};
