import * as Sentry from '@sentry/node';
import config from './config';

let _initialized = false;

export function initSentry() {
    if (_initialized) return;
    _initialized = true;

    const dsn = process.env.SENTRY_DSN;
    if (!dsn) {
        console.warn('⚠️ Sentry DSN no configurado en backend. Error tracking desactivado.');
        return;
    }

    Sentry.init({
        dsn,
        environment: config.NODE_ENV,
        tracesSampleRate: 1.0,
    });

    console.log('✅ Sentry inicializado en backend');
}
