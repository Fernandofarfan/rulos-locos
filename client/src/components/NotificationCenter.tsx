import React, { useState, useCallback, useMemo } from 'react';
import { Bell, CheckCheck, AlertTriangle, TrendingUp, Trophy, Info, Trash2 } from 'lucide-react';

const STORAGE_KEY = 'rulos-locos-notifications';

interface Notification {
    id: string;
    type: 'alert' | 'achievement' | 'market' | 'info';
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
}

function loadNotifs(): Notification[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function saveNotifs(notifs: Notification[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs.slice(0, 50)));
}

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
    alert: AlertTriangle,
    achievement: Trophy,
    market: TrendingUp,
    info: Info,
};

const COLOR_MAP: Record<string, string> = {
    alert: 'text-red-400 bg-red-500/10',
    achievement: 'text-amber-400 bg-amber-500/10',
    market: 'text-emerald-400 bg-emerald-500/10',
    info: 'text-blue-400 bg-blue-500/10',
};

export const NotificationCenter: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifs, setNotifs] = useState<Notification[]>(loadNotifs);

    const unreadCount = useMemo(() => notifs.filter(n => !n.read).length, [notifs]);

    const markAllRead = useCallback(() => {
        const updated = notifs.map(n => ({ ...n, read: true }));
        setNotifs(updated);
        saveNotifs(updated);
    }, [notifs]);

    const clearAll = useCallback(() => {
        setNotifs([]);
        saveNotifs([]);
    }, []);

    const markRead = useCallback((id: string) => {
        const updated = notifs.map(n => n.id === id ? { ...n, read: true } : n);
        setNotifs(updated);
        saveNotifs(updated);
    }, [notifs]);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                title="Notificaciones"
            >
                <Bell size={16} />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center text-[8px] font-black bg-red-500 text-white rounded-full px-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 z-50 w-80 glass-panel overflow-hidden animate-fade-in" style={{ transform: 'none' }}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-3 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <Bell size={14} className="text-slate-400" />
                                <span className="text-xs font-bold text-white">Notificaciones</span>
                                {unreadCount > 0 && (
                                    <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md">{unreadCount}</span>
                                )}
                            </div>
                            <div className="flex gap-1">
                                {unreadCount > 0 && (
                                    <button onClick={markAllRead} className="text-[10px] text-slate-500 hover:text-white flex items-center gap-1 transition">
                                        <CheckCheck size={10} /> Leer todo
                                    </button>
                                )}
                                <button onClick={clearAll} className="p-1 text-slate-600 hover:text-red-400 transition" title="Limpiar">
                                    <Trash2 size={10} />
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="max-h-[50vh] overflow-y-auto">
                            {notifs.length === 0 ? (
                                <div className="py-8 text-center text-xs text-slate-600">
                                    <Bell size={24} className="mx-auto mb-2 opacity-30" />
                                    Sin notificaciones
                                </div>
                            ) : (
                                notifs.map(notif => {
                                    const Icon = ICON_MAP[notif.type] || Info;
                                    const colorClass = COLOR_MAP[notif.type] || COLOR_MAP.info;
                                    const ago = Math.floor((Date.now() - notif.timestamp) / 60000);
                                    const timeStr = ago < 1 ? 'Ahora' : ago < 60 ? `${ago}m` : `${Math.floor(ago / 60)}h`;

                                    return (
                                        <div
                                            key={notif.id}
                                            onClick={() => markRead(notif.id)}
                                            className={`flex items-start gap-3 p-3 border-b border-white/[0.03] cursor-pointer transition-colors ${
                                                notif.read ? 'opacity-60' : 'hover:bg-white/[0.03]'
                                            }`}
                                        >
                                            <div className={`p-1.5 rounded-lg flex-shrink-0 ${colorClass}`}>
                                                <Icon size={12} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs font-bold text-white truncate">{notif.title}</p>
                                                    {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />}
                                                </div>
                                                <p className="text-[10px] text-slate-500 line-clamp-2">{notif.message}</p>
                                            </div>
                                            <span className="text-[9px] text-slate-600 flex-shrink-0">{timeStr}</span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

/** Add a notification from outside the component */
export function pushNotification(type: Notification['type'], title: string, message: string) {
    const notifs = loadNotifs();
    notifs.unshift({
        id: Date.now().toString(36),
        type,
        title,
        message,
        timestamp: Date.now(),
        read: false,
    });
    saveNotifs(notifs);
}
