import * as Sentry from '@sentry/react';

export function initSentry() {
    const dsn = import.meta.env.VITE_SENTRY_DSN;
    if (!dsn) {
        console.warn('⚠️ VITE_SENTRY_DSN no configurado en frontend. Error tracking desactivado.');
        return;
    }

    Sentry.init({
        dsn,
        integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration({
                maskAllText: false,
                blockAllMedia: false,
            }),
        ],
        // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
        tracesSampleRate: 1.0,
        // Capture Replay for 10% of all sessions, plus 100% of sessions with an error
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
    });

    console.log('✅ Sentry inicializado en frontend');
}
