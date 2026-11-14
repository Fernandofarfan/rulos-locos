const key = 'rulos_tab_session';
let sessionId = '';
function getSession(): string {
    if (sessionId) return sessionId;
    try {
        sessionId = sessionStorage.getItem(key) ?? crypto.randomUUID();
        sessionStorage.setItem(key, sessionId);
    } catch { sessionId = crypto.randomUUID(); }
    return sessionId;
}

export function track(name: 'section.open' | 'tab.open' | 'tool.open', feature: string): void {
    if (!navigator.sendBeacon) return;
    const base = import.meta.env.VITE_API_URL || '/api';
    const body = JSON.stringify({ name, path: '/', props: { feature }, sessionHash: getSession() });
    navigator.sendBeacon(`${base}/analytics/track`, new Blob([body], { type: 'application/json' }));
}
