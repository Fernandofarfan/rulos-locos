import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Star, Zap, Eye, Bell, Monitor, Target, Award, X } from 'lucide-react';

const STORAGE_KEY = 'rulos-locos-achievements';

interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: React.FC<{ size?: number; className?: string }>;
    condition: (stats: UserStats) => boolean;
    color: string;
}

interface UserStats {
    visits: number;
    firstVisit: string;
    alertsCreated: number;
    kioskUsed: boolean;
    sectionsVisited: Set<string>;
    sharesCount: number;
}

const ACHIEVEMENTS: Achievement[] = [
    { id: 'first_visit', title: 'Bienvenido', description: 'Visitaste Rulos Locos por primera vez', icon: Star, condition: () => true, color: 'text-blue-400' },
    { id: 'explorer', title: 'Explorador', description: 'Visitaste las 6 secciones del dashboard', icon: Eye, condition: (s) => s.sectionsVisited.size >= 5, color: 'text-emerald-400' },
    { id: 'regular', title: 'Habitué', description: 'Visitaste la app 10 veces', icon: Zap, condition: (s) => s.visits >= 10, color: 'text-amber-400' },
    { id: 'power_user', title: 'Power User', description: 'Visitaste la app 50 veces', icon: Trophy, condition: (s) => s.visits >= 50, color: 'text-purple-400' },
    { id: 'alert_creator', title: 'Centinela', description: 'Configuraste tu primera alerta', icon: Bell, condition: (s) => s.alertsCreated >= 1, color: 'text-rose-400' },
    { id: 'kiosk_master', title: 'TV Mode', description: 'Activaste el modo kiosco', icon: Monitor, condition: (s) => s.kioskUsed, color: 'text-cyan-400' },
    { id: 'sharer', title: 'Difusor', description: 'Compartiste el dashboard', icon: Target, condition: (s) => s.sharesCount >= 1, color: 'text-orange-400' },
    { id: 'veteran', title: 'Veterano', description: 'Usás la app hace más de 30 días', icon: Award, condition: (s) => { const days = (Date.now() - new Date(s.firstVisit).getTime()) / 86400000; return days >= 30; }, color: 'text-yellow-400' },
];

function loadStats(): UserStats {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return { ...parsed, sectionsVisited: new Set(parsed.sectionsVisited || []) };
        }
    } catch { /* ignore */ }
    return {
        visits: 0,
        firstVisit: new Date().toISOString(),
        alertsCreated: 0,
        kioskUsed: false,
        sectionsVisited: new Set<string>(),
        sharesCount: 0,
    };
}

function saveStats(stats: UserStats) {
    const serializable = { ...stats, sectionsVisited: Array.from(stats.sectionsVisited) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
}

interface AchievementSystemProps {
    activeView?: string;
}

export const AchievementSystem: React.FC<AchievementSystemProps> = ({ activeView }) => {
    const [stats, setStats] = useState<UserStats>(loadStats);
    const [showToast, setShowToast] = useState<Achievement | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const prevUnlocked = React.useRef<Set<string>>(new Set());

    // Track visit count on mount
    useEffect(() => {
        setStats(prev => {
            const updated = { ...prev, visits: prev.visits + 1 };
            saveStats(updated);
            return updated;
        });
    }, []);

    // Track section visits
    useEffect(() => {
        if (!activeView) return;
        setStats(prev => {
            const updated = { ...prev, sectionsVisited: new Set(prev.sectionsVisited).add(activeView) };
            saveStats(updated);
            return updated;
        });
    }, [activeView]);

    const unlockedIds = useMemo(() => {
        return new Set(ACHIEVEMENTS.filter(a => a.condition(stats)).map(a => a.id));
    }, [stats]);

    // Show toast for newly unlocked
    useEffect(() => {
        for (const id of unlockedIds) {
            if (!prevUnlocked.current.has(id) && prevUnlocked.current.size > 0) {
                const ach = ACHIEVEMENTS.find(a => a.id === id);
                if (ach) {
                    setShowToast(ach);
                    setTimeout(() => setShowToast(null), 4000);
                }
                break;
            }
        }
        prevUnlocked.current = new Set(unlockedIds);
    }, [unlockedIds]);

    const unlockCount = unlockedIds.size;
    const totalCount = ACHIEVEMENTS.length;

    return (
        <>
            {/* Trigger button */}
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-amber-400 transition-colors"
                title={`Logros: ${unlockCount}/${totalCount}`}
            >
                <Trophy size={12} />
                {unlockCount}/{totalCount}
            </button>

            {/* Toast for new achievements */}
            {showToast && (
                <div className="fixed top-24 right-4 z-[9999] animate-fade-in">
                    <div className="glass-panel p-4 flex items-center gap-3 border border-amber-500/30 bg-amber-950/30" style={{ transform: 'none' }}>
                        <div className="p-2 rounded-xl bg-amber-500/10">
                            <showToast.icon size={20} className={showToast.color} />
                        </div>
                        <div>
                            <p className="text-[10px] text-amber-400/70 uppercase font-bold tracking-wider">🏆 Nuevo Logro</p>
                            <p className="text-sm font-bold text-white">{showToast.title}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
                    <div className="relative z-10 w-full max-w-sm mx-4 glass-panel p-6 animate-fade-in" style={{ transform: 'none' }}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Trophy size={18} className="text-amber-400" />
                                <h3 className="text-lg font-bold text-white">Logros</h3>
                                <span className="text-xs font-mono text-slate-500">{unlockCount}/{totalCount}</span>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500">
                                <X size={14} />
                            </button>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-2 bg-white/5 rounded-full mb-5 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-700"
                                style={{ width: `${(unlockCount / totalCount) * 100}%` }}
                            />
                        </div>

                        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                            {ACHIEVEMENTS.map(ach => {
                                const unlocked = unlockedIds.has(ach.id);
                                const Icon = ach.icon;
                                return (
                                    <div key={ach.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                                        unlocked ? 'bg-white/5' : 'bg-white/[0.02] opacity-50'
                                    }`}>
                                        <div className={`p-2 rounded-lg ${unlocked ? 'bg-white/10' : 'bg-white/5'}`}>
                                            <Icon size={16} className={unlocked ? ach.color : 'text-slate-600'} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-bold ${unlocked ? 'text-white' : 'text-slate-600'}`}>{ach.title}</p>
                                            <p className="text-[10px] text-slate-500 truncate">{ach.description}</p>
                                        </div>
                                        {unlocked && <span className="text-emerald-400 text-xs">✓</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

/** Helper to track events from outside (e.g., when user creates alert) */
export function trackAchievementEvent(event: 'alert_created' | 'kiosk_used' | 'shared') {
    const stats = loadStats();
    if (event === 'alert_created') stats.alertsCreated++;
    if (event === 'kiosk_used') stats.kioskUsed = true;
    if (event === 'shared') stats.sharesCount++;
    saveStats(stats);
}
