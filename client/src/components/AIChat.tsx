import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Minimize2 } from 'lucide-react';
import { apiService } from '../services/api';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export const AIChat: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: '¡Hola! 👋 Soy Rulo Bot, tu asistente de mercado argentino. Preguntame sobre cotizaciones, arbitraje o estrategias.', timestamp: new Date() },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

    useEffect(() => {
        if (isOpen && !isMinimized) inputRef.current?.focus();
    }, [isOpen, isMinimized]);

    const sendMessage = useCallback(async () => {
        const q = input.trim();
        if (!q || loading) return;

        const userMsg: Message = { role: 'user', content: q, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            // Get current market context
            const context = await apiService.getRate();
            const prompt = {
                labels: [],
                values: [],
                assetName: `Pregunta del usuario: "${q}" | Contexto: Blue $${context?.ask ?? '?'} | Fecha: ${new Date().toLocaleDateString('es-AR')}`,
            };

            const result = await apiService.post<{ insight: string }>('/ai/chart-insight', prompt);
            const reply = result?.insight ?? 'No pude generar una respuesta. Verificá tu API key de Gemini.';

            setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: new Date() }]);
        } catch {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '❌ Error conectando con la IA. Intentá de nuevo en unos segundos.',
                timestamp: new Date(),
            }]);
        } finally {
            setLoading(false);
        }
    }, [input, loading]);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-20 md:bottom-6 right-4 z-40 p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all group"
                title="Chat con IA"
            >
                <MessageCircle size={22} />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0b0e14] animate-pulse" />
            </button>
        );
    }

    if (isMinimized) {
        return (
            <div className="fixed bottom-20 md:bottom-6 right-4 z-40">
                <button
                    onClick={() => setIsMinimized(false)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl hover:shadow-2xl transition-all"
                >
                    <Bot size={16} />
                    <span className="text-xs font-bold">Rulo Bot</span>
                    {messages.length > 1 && <span className="text-[10px] opacity-70">{messages.length - 1} msgs</span>}
                </button>
            </div>
        );
    }

    return (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-40 w-80 max-h-[70vh] flex flex-col glass-panel overflow-hidden animate-fade-in" style={{ transform: 'none' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/5 bg-gradient-to-r from-blue-600/10 to-indigo-600/10">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/20">
                        <Bot size={14} className="text-blue-400" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-white">Rulo Bot</p>
                        <p className="text-[9px] text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Online
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setIsMinimized(true)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition">
                        <Minimize2 size={12} />
                    </button>
                    <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition">
                        <X size={12} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px] max-h-[45vh]">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${
                            msg.role === 'user' ? 'bg-indigo-500/20' : 'bg-blue-500/20'
                        }`}>
                            {msg.role === 'user' ? <User size={12} className="text-indigo-400" /> : <Bot size={12} className="text-blue-400" />}
                        </div>
                        <div className={`max-w-[80%] p-2.5 rounded-xl text-xs leading-relaxed ${
                            msg.role === 'user'
                                ? 'bg-indigo-500/20 text-white rounded-tr-none'
                                : 'bg-white/5 text-slate-300 rounded-tl-none'
                        }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Bot size={12} className="text-blue-400" />
                        </div>
                        <div className="bg-white/5 p-2.5 rounded-xl rounded-tl-none">
                            <Loader2 size={14} className="animate-spin text-blue-400" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/5">
                <div className="flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                        placeholder="¿Conviene comprar Blue hoy?"
                        disabled={loading}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-blue-500/50 outline-none"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || loading}
                        className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 disabled:opacity-30 transition-all"
                    >
                        <Send size={14} />
                    </button>
                </div>
                <p className="text-[8px] text-slate-600 mt-1.5 text-center">Powered by Gemini · Las respuestas son orientativas</p>
            </div>
        </div>
    );
};
