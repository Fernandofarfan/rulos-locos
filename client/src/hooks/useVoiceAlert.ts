import { useCallback } from 'react';

export function useVoiceAlert() {
    const speak = useCallback((text: string) => {
        if (!('speechSynthesis' in window)) return;

        // Cancel previous speech if any
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-AR'; // Español Argentina
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Try to find an Argentinian voice, fallback to any Spanish
        const voices = window.speechSynthesis.getVoices();
        const arVoice = voices.find(v => v.lang === 'es-AR')
            || voices.find(v => v.lang.startsWith('es'));

        if (arVoice) {
            utterance.voice = arVoice;
        }

        window.speechSynthesis.speak(utterance);
    }, []);

    const speakPriceChange = useCallback((asset: string, price: number, direction: 'sube' | 'baja') => {
        const text = `Atención. El ${asset} ${direction} a ${price} pesos.`;
        speak(text);
    }, [speak]);

    return { speak, speakPriceChange };
}
