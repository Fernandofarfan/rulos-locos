import { useState } from 'react';

export function ShareButton({ text, url = window.location.href }: { text: string; url?: string }) {
    const [copied, setCopied] = useState(false);
    const message = `${text} ${url}`;
    return <div className="flex flex-wrap items-center gap-2 text-xs">
        {typeof navigator.share === 'function' && <button type="button" onClick={() => { void navigator.share({ text, url }).catch(() => {}); }}>Compartir</button>}
        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">WhatsApp</a>
        <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">X</a>
        <button type="button" onClick={() => { void navigator.clipboard.writeText(message).then(() => setCopied(true)).catch(() => setCopied(false)); }}>
            {copied ? 'Copiado' : 'Copiar'}
        </button>
    </div>;
}
