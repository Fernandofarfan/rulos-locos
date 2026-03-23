import { useRef, useCallback } from 'react';

type SoundType = 'up' | 'down' | 'alert' | 'success';

/**
 * Genera sonidos usando el API Web Audio (sin archivos externos).
 * up    → tono ascendente (Blue subió)
 * down  → tono descendente (Blue bajó)
 * alert → pitido corto (umbral alcanzado)
 * success → acorde positivo
 */
export function useSoundAlert() {
    const audioCtx = useRef<AudioContext | null>(null);

    const getCtx = useCallback(() => {
        if (!audioCtx.current || audioCtx.current.state === 'closed') {
            audioCtx.current = new AudioContext();
        }
        if (audioCtx.current.state === 'suspended') {
            audioCtx.current.resume();
        }
        return audioCtx.current;
    }, []);

    const playTone = useCallback((
        frequency: number,
        duration: number,
        type: OscillatorType = 'sine',
        delay = 0,
        gain = 0.3
    ) => {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
        gainNode.gain.setValueAtTime(0, ctx.currentTime + delay);
        gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + duration);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + duration + 0.01);
    }, [getCtx]);

    const play = useCallback((type: SoundType) => {
        try {
            switch (type) {
                case 'up':
                    // Ascending arpeggio
                    playTone(440, 0.15, 'sine', 0, 0.25);
                    playTone(554, 0.15, 'sine', 0.15, 0.25);
                    playTone(659, 0.20, 'sine', 0.30, 0.25);
                    break;
                case 'down':
                    // Descending tones
                    playTone(659, 0.15, 'sine', 0, 0.25);
                    playTone(440, 0.15, 'sine', 0.15, 0.25);
                    playTone(330, 0.20, 'sine', 0.30, 0.25);
                    break;
                case 'alert':
                    // Sharp beep
                    playTone(880, 0.08, 'square', 0, 0.20);
                    playTone(880, 0.08, 'square', 0.12, 0.20);
                    break;
                case 'success':
                    // Major chord
                    playTone(523, 0.3, 'sine', 0, 0.20); // C5
                    playTone(659, 0.3, 'sine', 0, 0.15); // E5
                    playTone(784, 0.4, 'sine', 0, 0.12); // G5
                    break;
            }
        } catch {
            // Web Audio not supported — silent fail
        }
    }, [playTone]);

    return { play };
}
