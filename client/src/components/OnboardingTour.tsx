import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, BarChart3, Landmark, Zap, Wrench, LineChart, Newspaper } from 'lucide-react';

const STORAGE_KEY = 'rulos-locos-onboarding-done';

interface TourStep {
    title: string;
    description: string;
    icon: React.FC<{ size?: number; className?: string }>;
    color: string;
    viewId: string;
}

const STEPS: TourStep[] = [
    {
        title: 'Dashboard Principal',
        description: 'Panorama en tiempo real del dólar, inflación, riesgo país y reservas. El scanner de rulos y la IA te recomiendan oportunidades.',
        icon: BarChart3,
        color: 'text-blue-400',
        viewId: 'dashboard',
    },
    {
        title: 'Tasas & Mercado',
        description: 'Tasas de interés, bonos, plazo fijo por banco, FCI, CEDEARs, Merval, commodities y criptomonedas.',
        icon: Landmark,
        color: 'text-emerald-400',
        viewId: 'mercado',
    },
    {
        title: 'Arbitraje',
        description: 'Oportunidades de arbitraje en tiempo real entre dólares (MEP, Blue, Crypto). Calculadora, alertas y comparador de plataformas.',
        icon: Zap,
        color: 'text-amber-400',
        viewId: 'arbitrage',
    },
    {
        title: 'Herramientas',
        description: 'Calculadoras financieras: bonos, inflación, CER, UVA, simuladores, impuestos, backtester de rulos y comparador de rendimientos.',
        icon: Wrench,
        color: 'text-violet-400',
        viewId: 'herramientas',
    },
    {
        title: 'Análisis Técnico',
        description: 'Gráficos históricos con SMA, curva de rendimiento, correlaciones, carry trade y análisis dólar vs inflación.',
        icon: LineChart,
        color: 'text-cyan-400',
        viewId: 'charts',
    },
    {
        title: 'Portfolio & Noticias',
        description: 'Seguimiento de tu cartera de inversiones con P&L, noticias económicas y calendario de eventos.',
        icon: Newspaper,
        color: 'text-rose-400',
        viewId: 'portfolio',
    },
];

interface OnboardingTourProps {
    onViewChange?: (view: string) => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onViewChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(0);

    useEffect(() => {
        const done = localStorage.getItem(STORAGE_KEY);
        if (!done) {
            // Show after a small delay so the app loads first
            const timer = setTimeout(() => setIsOpen(true), 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    const closeTour = useCallback(() => {
        setIsOpen(false);
        localStorage.setItem(STORAGE_KEY, 'true');
    }, []);

    const nextStep = useCallback(() => {
        if (step < STEPS.length - 1) {
            const next = step + 1;
            setStep(next);
            onViewChange?.(STEPS[next].viewId);
        } else {
            closeTour();
        }
    }, [step, closeTour, onViewChange]);

    const prevStep = useCallback(() => {
        if (step > 0) {
            const prev = step - 1;
            setStep(prev);
            onViewChange?.(STEPS[prev].viewId);
        }
    }, [step, onViewChange]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeTour();
            if (e.key === 'ArrowRight' || e.key === 'Enter') nextStep();
            if (e.key === 'ArrowLeft') prevStep();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, nextStep, prevStep, closeTour]);

    if (!isOpen) return null;

    const current = STEPS[step];
    const Icon = current.icon;
    const isLast = step === STEPS.length - 1;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeTour} />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
                <div className="glass-panel p-6 border border-white/10" style={{ transform: 'none' }}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Sparkles size={16} className="text-amber-400" />
                            <span className="text-xs font-bold text-amber-400/80 uppercase tracking-wider">
                                Tour Guiado
                            </span>
                        </div>
                        <button
                            onClick={closeTour}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Step Counter */}
                    <div className="flex gap-1.5 mb-6">
                        {STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1 rounded-full flex-1 transition-all duration-300 ${i === step ? 'bg-accent-primary' : i < step ? 'bg-accent-primary/40' : 'bg-white/10'}`}
                            />
                        ))}
                    </div>

                    {/* Content */}
                    <div className="text-center mb-8" key={step}>
                        <div className={`inline-flex p-4 rounded-2xl bg-white/5 border border-white/10 mb-4`}>
                            <Icon size={32} className={current.color} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{current.title}</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">{current.description}</p>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={prevStep}
                            disabled={step === 0}
                            className={`flex items-center gap-1 text-xs font-medium px-3 py-2 rounded-lg transition-all ${step === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <ChevronLeft size={14} />
                            Anterior
                        </button>

                        <span className="text-[10px] text-slate-600 font-mono">
                            {step + 1} / {STEPS.length}
                        </span>

                        <button
                            onClick={nextStep}
                            className="flex items-center gap-1 text-xs font-bold px-4 py-2 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary hover:bg-accent-primary/30 transition-all"
                        >
                            {isLast ? '¡Empezar!' : 'Siguiente'}
                            {!isLast && <ChevronRight size={14} />}
                        </button>
                    </div>

                    {/* Skip link */}
                    <div className="text-center mt-4">
                        <button
                            onClick={closeTour}
                            className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
                        >
                            Saltar tour
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/** Button to restart the onboarding tour manually */
export const OnboardingButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button
        onClick={() => {
            localStorage.removeItem(STORAGE_KEY);
            onClick();
        }}
        className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-white transition-colors"
        title="Ver tour guiado"
    >
        <Sparkles size={12} />
        Tour
    </button>
);
