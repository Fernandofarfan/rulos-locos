import { useState } from 'react';

export function WidgetEmbed() {
    const [type, setType] = useState('blue');
    const [theme, setTheme] = useState('dark');
    const [copied, setCopied] = useState(false);
    const url = `https://rulos-locos.vercel.app/widget.html?type=${type}&theme=${theme}`;
    const code = `<iframe src="${url}" title="Cotización del dólar" width="360" height="150"></iframe>`;
    return <section className="p-5 border-b border-white/10 space-y-2">
        <h3 className="text-base font-bold text-white">Insertá el widget</h3>
        <label>Tipo <select className="bg-slate-900 p-2" value={type} onChange={event => setType(event.target.value)}>
            {['blue', 'mep', 'ccl', 'oficial', 'cripto'].map(value => <option value={value} key={value}>{value.toUpperCase()}</option>)}
        </select></label>{' '}
        <label>Tema <select className="bg-slate-900 p-2" value={theme} onChange={event => setTheme(event.target.value)}>
            <option value="dark">Oscuro</option><option value="light">Claro</option>
        </select></label>
        <label className="block text-xs">Código para insertar<textarea readOnly value={code} className="block w-full bg-slate-900 border border-slate-600 p-2" /></label>
        <button type="button" onClick={() => { void navigator.clipboard.writeText(code).then(() => setCopied(true)).catch(() => setCopied(false)); }}
            className="border border-slate-600 rounded p-2">{copied ? 'Copiado' : 'Copiar código'}</button>
    </section>;
}
