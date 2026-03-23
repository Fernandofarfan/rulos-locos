import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
    soundEnabled: boolean;
    voiceEnabled: boolean;
    telegramAlerts: boolean;
    alertThresholdPct: number;
    setSoundEnabled: (val: boolean) => void;
    setVoiceEnabled: (val: boolean) => void;
    setTelegramAlerts: (val: boolean) => void;
    setAlertThresholdPct: (val: number) => void;
}

export const useSettings = create<SettingsState>()(
    persist(
        (set) => ({
            soundEnabled: true,
            voiceEnabled: false,
            telegramAlerts: false,
            alertThresholdPct: 1.5,
            setSoundEnabled: (val) => set({ soundEnabled: val }),
            setVoiceEnabled: (val) => set({ voiceEnabled: val }),
            setTelegramAlerts: (val) => set({ telegramAlerts: val }),
            setAlertThresholdPct: (val) => set({ alertThresholdPct: val }),
        }),
        {
            name: 'rulos-settings',
        }
    )
);
