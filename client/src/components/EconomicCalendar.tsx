import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { apiService } from '../services/api';

interface Event {
    id: string;
    fecha: string;
    title: string;
    impact: 'high' | 'medium' | 'low';
    tipo?: string;
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function formatFecha(iso: string) {
    const d = new Date(iso + 'T00:00:00');
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
function getDayName(iso: string) {
    const d = new Date(iso + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) return 'Hoy';
    if (d.getTime() === today.getTime() + 86400000) return 'Mañana';
    return DAYS[d.getDay()];
}

export const EconomicCalendar: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [sources, setSources] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiService.getCalendarEvents()
            .then(data => {
                setEvents(data.events ?? []);
                setSources(data.sources ?? []);
            })
            .catch(() => {
                setEvents([]);
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="glass-panel p-6 flex flex-col min-h-[400px] md:h-[600px]" aria-busy={loading}>
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="p-2 bg-pink-500/20 rounded-lg text-pink-400">
                            <CalendarIcon size={20} />
                        </span>
                        Calendario Económico
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 ml-10">
                        {sources.length > 0
                            ? `Fuentes: ${sources.join(' · ')}`
                            : 'Feriados reales + eventos INDEC/BCRA'}
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-t-pink-400 border-white/10 rounded-full animate-spin" />
                </div>
            ) : (
                <div className="space-y-3 relative overflow-y-auto custom-scrollbar flex-1 pr-1">
                    <div className="absolute left-[19px] top-2 bottom-2 w-px bg-white/10"></div>
                    {events.map(event => (
                        <div key={event.id} className="relative flex gap-4 items-start group">
                            <div className={`relative z-10 w-2.5 h-2.5 rounded-full mt-1.5 border-2 border-[#0b0e14] ml-3 flex-shrink-0 ${
                                event.impact === 'high' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                                event.impact === 'medium' ? 'bg-orange-500' : 'bg-blue-500'
                            }`} />
                            <div className="flex-1 bg-white/[0.02] hover:bg-white/5 border border-white/5 rounded-xl p-3 transition-all">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-bold text-slate-300">
                                        {formatFecha(event.fecha)} · {getDayName(event.fecha)}
                                    </span>
                                    {event.tipo && (
                                        <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-slate-400 flex items-center gap-1">
                                            <Clock size={9} /> {event.tipo}
                                        </span>
                                    )}
                                </div>
                                <h4 className="text-sm font-medium text-white group-hover:text-accent-primary transition-colors">
                                    {event.title}
                                </h4>
                                <span className={`text-[9px] uppercase tracking-wider font-bold ${
                                    event.impact === 'high' ? 'text-red-400' :
                                    event.impact === 'medium' ? 'text-orange-400' : 'text-blue-400'
                                }`}>
                                    Impacto {event.impact === 'high' ? 'Alto' : event.impact === 'medium' ? 'Medio' : 'Bajo'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
