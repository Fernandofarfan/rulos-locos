import React, { useState, useEffect } from 'react';
import { TrendingUp, Activity, BarChart3, Zap, ArrowRight, Globe, Shield, Smartphone } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { apiService } from '../services/api';
import { LoginModal } from './LoginModal';
import { AuthProvider } from '../contexts/AuthContext';
import { useAuth } from '../hooks/useAuth';

interface LiveData {
    blue: number;
    mep: number;
    ccl: number;
    oficial: number;
    risk: number;
    inflation: number;
    loading: boolean;
}

interface LandingPageProps {
    onEnter?: () => void;
}

const LandingPageContent: React.FC<LandingPageProps> = ({ onEnter }) => {
    const { theme, toggleTheme } = useTheme();
    const [loginOpen, setLoginOpen] = useState(false);
    const { isAuthenticated } = useAuth();
    const [data, setData] = useState<LiveData>({
        blue: 0, mep: 0, ccl: 0, oficial: 0, risk: 0, inflation: 0, loading: true,
    });

    useEffect(() => {
        if (isAuthenticated && onEnter) {
            const t = setTimeout(() => onEnter(), 500);
            return () => clearTimeout(t);
        }
    }, [isAuthenticated, onEnter]);

    useEffect(() => {
        const fetchLive = async () => {
            try {
                const [arb, eco] = await Promise.allSettled([
                    apiService.getArbitrage(),
                    apiService.getEconomics(),
                ]);
                const arbData = arb.status === 'fulfilled' ? arb.value : null;
                const ecoData = eco.status === 'fulfilled' ? eco.value : null;
                setData({
                    blue: arbData?.dolares?.blue?.venta ?? 0,
                    mep: arbData?.dolares?.mep?.venta ?? 0,
                    ccl: arbData?.dolares?.ccl?.venta ?? 0,
                    oficial: arbData?.dolares?.oficial?.venta ?? 0,
                    risk: ecoData?.macro?.risk ?? 0,
                    inflation: ecoData?.macro?.inflation?.interanual ?? 0,
                    loading: false,
                });
            } catch {
                setData(prev => ({ ...prev, loading: false }));
            }
        };
        fetchLive();
        const interval = setInterval(fetchLive, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleEnter = () => {
        onEnter?.();
    };

    const formatPrice = (v: number) => v ? `$${Math.round(v).toLocaleString('es-AR')}` : '---';

    return (
        <div className="min-h-screen bg-[#0b0e14] text-white font-sans">
            <nav className="border-b border-white/5 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">⚡</span>
                        <span className="text-lg font-black tracking-tight">Rulos Locos</span>
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Pro</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={toggleTheme} className="p-2 hover:bg-white/5 rounded-lg text-slate-400">
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>
                        <button
                            onClick={handleEnter}
                            className="text-xs text-slate-500 hover:text-white transition-colors"
                        >
                            Ver dashboard
                        </button>
                        <button
                            onClick={() => setLoginOpen(true)}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl transition-all border border-white/10"
                        >
                            Ingresar
                        </button>
                    </div>
                </div>
            </nav>

            <main>
                {/* Hero */}
                <section className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-600/5 via-transparent to-transparent" />
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-400/20 rounded-full text-xs text-blue-400 font-medium mb-6">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                            Datos en tiempo real
                        </div>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6">
                            Dashboard Financiero
                            <br />
                            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Argentino en Vivo</span>
                        </h1>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-10">
                            Análisis de arbitrajes, cotizaciones de dólar, indicadores macroeconómicos, 
                            paper trading y seguimiento de portafolio. Todo en tiempo real.
                        </p>
                        <div className="flex items-center justify-center gap-4">
                            <button
                                onClick={() => setLoginOpen(true)}
                                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-xl shadow-blue-500/20 flex items-center gap-2 border border-white/10"
                            >
                                Comenzar ahora <ArrowRight size={18} />
                            </button>
                            <a href="https://github.com/Fernandofarfan/rulos-locos" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-medium rounded-xl transition-all border border-white/5">
                                GitHub
                            </a>
                        </div>
                    </div>
                </section>

                {/* Ticker en vivo */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-8">
                    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mercado en vivo</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                            {[
                                { label: 'Blue', value: formatPrice(data.blue) },
                                { label: 'MEP', value: formatPrice(data.mep) },
                                { label: 'CCL', value: formatPrice(data.ccl) },
                                { label: 'Oficial', value: formatPrice(data.oficial) },
                                { label: 'Riesgo País', value: data.risk ? `${data.risk} pts` : '---' },
                                { label: 'Inflación', value: data.inflation ? `${data.inflation}%` : '---' },
                            ].map((item) => (
                                <div key={item.label} className="text-center">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">{item.label}</div>
                                    <div className="text-sm sm:text-base font-black text-white">
                                        {data.loading ? <span className="inline-block w-16 h-4 bg-white/5 rounded animate-pulse" /> : item.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl sm:text-3xl font-black mb-4">Todo lo que necesitas</h2>
                        <p className="text-slate-400 max-w-xl mx-auto">Herramientas profesionales para inversores, traders y curiosos del mercado argentino.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { icon: Zap, title: 'Arbitraje en Vivo', desc: 'Oportunidades de arbitraje entre Blue, MEP, CCL y cripto con spreads calculados automáticamente.' },
                            { icon: BarChart3, title: 'Paper Trading', desc: 'Simulá inversiones con $1.000.000 ARS virtuales sin riesgo. Probá tus estrategias.' },
                            { icon: Activity, title: 'Indicadores Macro', desc: 'Inflación, riesgo país, reservas BCRA, base monetaria. Datos oficiales actualizados.' },
                            { icon: Globe, title: 'Mercados Globales', desc: 'CEDEARs, bonos soberanos, Merval, S&P 500, Nasdaq, oro y petróleo. Todo en un solo lugar.' },
                            { icon: TrendingUp, title: 'Análisis con IA', desc: 'Insights generados por Google Gemini para entender tendencias y tomar decisiones informadas.' },
                            { icon: Shield, title: 'Alertas Inteligentes', desc: 'Notificaciones por Telegram, email y push cuando los precios cruzan tus umbrales.' },
                            { icon: Smartphone, title: 'PWA Instalable', desc: 'Instalá la app en tu celu como si fuera nativa. Funciona offline y envía notificaciones.' },
                            { icon: BarChart3, title: 'Calculadoras', desc: 'Indexación CER, préstamos UVA, tasa real, bonos e inflación. Todo lo que necesitás calcular.' },
                        ].map((f, i) => (
                            <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.04] transition-all">
                                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                                    <f.icon size={20} className="text-blue-400" />
                                </div>
                                <h3 className="font-bold text-sm mb-2">{f.title}</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* CTA */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-blue-400/10 rounded-3xl p-8 sm:p-12 text-center">
                        <h2 className="text-2xl sm:text-3xl font-black mb-4">Empezá ahora, sin costo</h2>
                        <p className="text-slate-400 max-w-lg mx-auto mb-8">
                            Creá tu cuenta gratis y accedé al dashboard completo con paper trading, alertas y análisis con IA.
                        </p>
                        <button
                            onClick={() => setLoginOpen(true)}
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-xl shadow-blue-500/20 border border-white/10"
                        >
                            Crear cuenta gratis
                        </button>
                    </div>
                </section>
            </main>

            <footer className="border-t border-white/5 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <span className="text-sm">⚡</span>
                        <span>Rulos Locos Pro &copy; {new Date().getFullYear()}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-600">
                        <span>Datos de fuentes públicas (BCRA, INDEC, DolarAPI, CryptoYa)</span>
                        <span className="text-slate-500">·</span>
                        <span>No constituye asesoramiento financiero</span>
                    </div>
                </div>
            </footer>

            <LoginModal
                isOpen={loginOpen}
                onClose={() => setLoginOpen(false)}
            />
        </div>
    );
};

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => (
    <AuthProvider>
        <LandingPageContent onEnter={onEnter} />
    </AuthProvider>
);
