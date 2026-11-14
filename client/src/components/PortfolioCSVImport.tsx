import { useMemo, useState } from 'react';
import client from '../services/api';
import { mapPortfolioCsv, parseCsv, type ColumnMapping, type DateFormat, type DecimalSeparator } from '../utils/portfolioCsv';

const fields: { key: keyof ColumnMapping; label: string }[] = [
    { key: 'asset', label: 'Activo' }, { key: 'amount', label: 'Cantidad' }, { key: 'price', label: 'Precio de compra' },
    { key: 'date', label: 'Fecha' }, { key: 'note', label: 'Nota (opcional)' },
];

export function PortfolioCSVImport({ onImported }: { onImported: () => void }) {
    const [text, setText] = useState('');
    const [separator, setSeparator] = useState<',' | ';'>(',');
    const [decimal, setDecimal] = useState<DecimalSeparator>('.');
    const [dateFormat, setDateFormat] = useState<DateFormat>('iso');
    const [mapping, setMapping] = useState<ColumnMapping>({ asset: -1, amount: -1, price: -1, date: -1, note: null });
    const [message, setMessage] = useState('');
    const parsed = useMemo(() => {
        try { return { rows: parseCsv(text, separator), error: '' }; }
        catch { return { rows: [], error: 'No se pudo leer el CSV: revisá las comillas.' }; }
    }, [text, separator]);
    async function submit() {
        try {
            const positions = mapPortfolioCsv(parsed.rows, mapping, dateFormat, decimal);
            if (!positions.length) { setMessage('El archivo no tiene posiciones.'); return; }
            const response = await client.post<{ imported: number }>('/portfolio/import/json', {
                data: { exportDate: new Date().toISOString(), positions }, merge: true,
            });
            setMessage(`Se importaron ${response.data.imported} posiciones.`);
            onImported();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'No se pudo importar el archivo.');
        }
    }
    return <details className="border border-slate-700 rounded-lg p-3 mt-4 text-sm">
        <summary className="cursor-pointer font-semibold">Importar CSV genérico</summary>
        <div className="space-y-3 mt-3">
            <label>Archivo CSV <input type="file" accept=".csv,text/csv" onChange={event => {
                const file = event.target.files?.[0];
                if (file) void file.text().then(setText).catch(() => setMessage('No se pudo leer el archivo.'));
            }} /></label>
            <div className="flex flex-wrap gap-3">
                <label>Separador de columnas <select value={separator} onChange={event => setSeparator(event.target.value as ',' | ';')} className="bg-slate-900 p-2">
                    <option value=",">Coma</option><option value=";">Punto y coma</option>
                </select></label>
                <label>Separador decimal <select value={decimal} onChange={event => setDecimal(event.target.value as DecimalSeparator)} className="bg-slate-900 p-2">
                    <option value=".">Punto</option><option value=",">Coma</option>
                </select></label>
                <label>Fecha <select value={dateFormat} onChange={event => setDateFormat(event.target.value as DateFormat)} className="bg-slate-900 p-2">
                    <option value="iso">AAAA-MM-DD</option><option value="dmy">DD/MM/AAAA</option>
                </select></label>
            </div>
            {parsed.error && <p role="alert">{parsed.error}</p>}
            {parsed.rows.length > 0 && <>
                <div className="grid sm:grid-cols-2 gap-2">
                    {fields.map(field => <label key={field.key}>{field.label}
                        <select value={mapping[field.key] ?? -1} onChange={event => {
                            const index = Number(event.target.value);
                            setMapping(previous => ({ ...previous, [field.key]: field.key === 'note' && index === -1 ? null : index }));
                        }} className="block w-full bg-slate-900 p-2">
                            <option value="-1">Sin asignar</option>
                            {parsed.rows[0].map((heading, index) => <option key={index} value={index}>{heading || `Columna ${index + 1}`}</option>)}
                        </select>
                    </label>)}
                </div>
                <div className="overflow-x-auto"><table className="text-xs"><caption>Vista previa: primeras cinco filas</caption>
                    <thead><tr>{parsed.rows[0].map((cell, i) => <th key={i} className="p-1">{cell}</th>)}</tr></thead>
                    <tbody>{parsed.rows.slice(1, 6).map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className="p-1">{cell}</td>)}</tr>)}</tbody>
                </table></div>
                <button type="button" onClick={() => { void submit(); }} className="border border-slate-600 rounded p-2">Importar sin borrar posiciones</button>
            </>}
            {message && <p role="status">{message}</p>}
        </div>
    </details>;
}
