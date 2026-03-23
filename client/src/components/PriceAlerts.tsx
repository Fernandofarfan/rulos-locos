import React, { useState, useEffect, useRef } from 'react';
import { Bell, Trash2, Plus, AlertCircle, Send, Wifi, WifiOff } from 'lucide-react';
import { apiService } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { Tooltip } from './ui/Tooltip';

interface Alert {
    id: string;
    token: 'blue' | 'mep' | 'oficial' | 'crypto';
    targetPrice: number;
    condition: 'above' | 'below';
    active: boolean;
}

interface PriceAlertsProps {
    prices: {
        blue: number;
        mep: number;
        oficial: number;
        crypto: number;
    };
}

export const PriceAlerts: React.FC<PriceAlertsProps> = ({ prices }) => {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [newToken, setNewToken] = useState<'blue' | 'mep' | 'oficial' | 'crypto'>('blue');
    const [newPrice, setNewPrice] = useState<string>('');
    const [newCondition, setNewCondition] = useState<'above' | 'below'>('above');
    const [permission, setPermission] = useState<NotificationPermission>('default');


    // WebSocket — actualizaciones en tiempo real
    const { socket, isConnected } = useSocket();
    const livePricesRef = useRef(prices);

    // Sincronizar precios del prop con la ref
    useEffect(() => { livePricesRef.current = prices; }, [prices]);

    // Suscribirse a actualizaciones de arbitrage via WebSocket
    useEffect(() => {
        if (!socket) return;

        const handleArbitrageUpdate = (data: { dolares?: { blue?: { venta?: number }; mep?: { venta?: number }; oficial?: { venta?: number }; crypto?: { venta?: number } } }) => {
            if (!data?.dolares) return;
            const updated = {
                blue: data.dolares.blue?.venta ?? livePricesRef.current.blue,
                mep: data.dolares.mep?.venta ?? livePricesRef.current.mep,
                oficial: data.dolares.oficial?.venta ?? livePricesRef.current.oficial,
                crypto: data.dolares.crypto?.venta ?? livePricesRef.current.crypto,
            };
            livePricesRef.current = updated;
        };

        socket.on('arbitrage-update', handleArbitrageUpdate);
        return () => { socket.off('arbitrage-update', handleArbitrageUpdate); };
    }, [socket]);

    // Load alerts from local storage
    useEffect(() => {
        const saved = localStorage.getItem('rulos_alerts');
        if (saved) {
            setAlerts(JSON.parse(saved));
        }

        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    // Save alerts
    useEffect(() => {
        localStorage.setItem('rulos_alerts', JSON.stringify(alerts));
    }, [alerts]);

    // Check alerts
    useEffect(() => {
        if (!prices.blue || !prices.mep) return;

        alerts.forEach(alert => {
            if (!alert.active) return;

            const currentPrice = prices[alert.token];
            let triggered = false;

            if (alert.condition === 'above' && currentPrice >= alert.targetPrice) {
                triggered = true;
            } else if (alert.condition === 'below' && currentPrice <= alert.targetPrice) {
                triggered = true;
            }

            if (triggered) {
                notifyUser(alert, currentPrice);
                // Deactivate alert after trigger to avoid spam
                toggleAlert(alert.id, false);
            }
        });
    }, [prices, alerts]);

    const requestPermission = async () => {
        if ('Notification' in window) {
            const perm = await Notification.requestPermission();
            setPermission(perm);
        }
    };



    const notifyUser = (alert: Alert, currentPrice: number) => {
        const dirText = alert.condition === 'above' ? 'superó' : 'bajó de';
        const body = `El Dólar ${alert.token.toUpperCase()} llegó a $${currentPrice.toLocaleString('es-AR')} (${dirText} $${alert.targetPrice.toLocaleString('es-AR')})`;

        // Notificación del browser
        if (permission === 'granted') {
            new Notification('🔔 Rulos Locos — Alerta de Precio', {
                body,
                icon: '/icons/icon-192.svg',
            });
        }

        // Envío automático a Telegram (best-effort, no bloquea UI)
        apiService.sendTelegramAlert({
            message: `🔔 <b>Alerta de Precio — Rulos Locos</b>\n${body}\n\n<a href="https://rulos-locos-dashboard.vercel.app">Ver Dashboard</a>`,
        }).catch(() => { /* Telegram no configurado o sin conexión */ });
    };

    const addAlert = () => {
        if (!newPrice) return;
        const alert: Alert = {
            id: Date.now().toString(),
            token: newToken,
            targetPrice: parseFloat(newPrice),
            condition: newCondition,
            active: true
        };
        setAlerts([...alerts, alert]);
        setNewPrice('');

        if (permission === 'default') {
            requestPermission();
        }
    };

    const deleteAlert = (id: string) => {
        setAlerts(alerts.filter(a => a.id !== id));
    };

    const toggleAlert = (id: string, state: boolean) => {
        setAlerts(alerts.map(a => a.id === id ? { ...a, active: state } : a));
    };

    return (
        <div className="glass-panel p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="p-2 bg-accent-secondary/20 rounded-lg text-accent-secondary">
                        <Bell size={20} />
                    </span>
                    Alertas
                    {/* Indicador WebSocket */}
                    <Tooltip content={isConnected ? 'WebSocket conectado — alertas en tiempo real' : 'WebSocket desconectado — usando polling'}>
                        <span
                            className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border"
                            style={isConnected
                                ? { background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', color: '#34d399' }
                                : { background: 'rgba(100,116,139,0.1)', borderColor: 'rgba(100,116,139,0.2)', color: '#64748b' }
                            }
                        >
                            {isConnected
                                ? <><Wifi size={9} />LIVE</>
                                : <><WifiOff size={9} />POLL</>
                            }
                        </span>
                    </Tooltip>
                </h3>
                <div className="flex items-center gap-2">
                    {permission === 'default' && (
                        <button onClick={requestPermission} className="text-xs text-accent-primary hover:underline">
                            Activar
                        </button>
                    )}
                    <Tooltip content="Activar notificaciones push gratuitas vía Telegram" placement="bottom">
                        <a
                            href="https://t.me/RulosLocosBot?start=true"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all bg-[#0088cc]/10 hover:bg-[#0088cc]/20 text-[#0088cc] border border-[#0088cc]/20 font-bold"
                        >
                            <Send size={12} /> Bot Push
                        </a>
                    </Tooltip>
                </div>
            </div>

            {/* Add Alert Form */}
            <div className="flex flex-col gap-3 mb-6 bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="flex gap-2">
                    <select
                        value={newToken}
                        onChange={(e) => setNewToken(e.target.value as any)}
                        className="bg-black/40 text-sm text-white border border-white/10 rounded-lg px-2 py-2 outline-none focus:border-accent-secondary/50"
                    >
                        <option value="blue">Blue</option>
                        <option value="mep">MEP</option>
                        <option value="oficial">Oficial</option>
                        <option value="crypto">Crypto</option>
                    </select>
                    <select
                        value={newCondition}
                        onChange={(e) => setNewCondition(e.target.value as any)}
                        className="bg-black/40 text-sm text-white border border-white/10 rounded-lg px-2 py-2 outline-none focus:border-accent-secondary/50"
                    >
                        <option value="above">Mayor a</option>
                        <option value="below">Menor a</option>
                    </select>
                </div>
                <div className="flex gap-2">
                    <input
                        type="number"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        placeholder="Precio Objetivo"
                        className="flex-1 bg-black/40 text-sm text-white border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-accent-secondary/50 placeholder-slate-600"
                    />
                    <Tooltip content="Agregar alerta">
                        <button
                            onClick={addAlert}
                            disabled={!newPrice}
                            aria-label="Agregar alerta de precio"
                            className="bg-accent-secondary hover:bg-accent-secondary/80 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus size={20} />
                        </button>
                    </Tooltip>
                </div>
            </div>

            {/* Alerts List */}
            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {alerts.length === 0 ? (
                    <div className="text-center py-4 text-slate-500 text-sm flex flex-col items-center gap-2">
                        <AlertCircle size={24} className="opacity-50" />
                        Sin alertas activas
                    </div>
                ) : (
                    alerts.map(alert => (
                        <div key={alert.id} className={`flex items-center justify-between p-3 rounded-lg border ${alert.active ? 'bg-white/5 border-white/10' : 'bg-white/[0.02] border-white/5 opacity-60'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${alert.active ? 'bg-success animate-pulse' : 'bg-slate-600'}`}></div>
                                <div>
                                    <div className="text-sm font-bold text-white">
                                        {alert.token.toUpperCase()} {alert.condition === 'above' ? '>' : '<'} ${alert.targetPrice}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                        {alert.active ? 'Monitoreando...' : 'Desactivada'}
                                    </div>
                                </div>
                            </div>
                            <Tooltip content="Eliminar alerta" placement="left">
                                <button
                                    onClick={() => deleteAlert(alert.id)}
                                    aria-label="Eliminar alerta"
                                    className="text-slate-500 hover:text-error transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </Tooltip>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
