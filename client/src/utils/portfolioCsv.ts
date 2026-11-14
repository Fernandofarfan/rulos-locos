export type DateFormat = 'iso' | 'dmy';
export type DecimalSeparator = ',' | '.';
export type ColumnMapping = { asset: number; amount: number; price: number; date: number; note: number | null };

export function parseCsv(text: string, separator: ',' | ';' = ','): string[][] {
    const rows: string[][] = [];
    let row: string[] = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (quoted) {
            if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
            else if (char === '"') quoted = false;
            else cell += char;
        } else if (char === '"' && cell === '') quoted = true;
        else if (char === separator) { row.push(cell.trim()); cell = ''; }
        else if (char === '\n' || char === '\r') {
            if (char === '\r' && text[i + 1] === '\n') i++;
            row.push(cell.trim()); cell = '';
            if (row.some(value => value !== '')) rows.push(row);
            row = [];
        } else cell += char;
    }
    if (quoted) throw new Error('Hay una comilla sin cerrar.');
    row.push(cell.trim());
    if (row.some(value => value !== '')) rows.push(row);
    return rows;
}

function parseNumber(value: string, decimal: DecimalSeparator): number {
    const normalized = decimal === ',' ? value.replace(/\./g, '').replace(',', '.') : value.replace(/,/g, '');
    if (!/^\d+(?:\.\d+)?$/.test(normalized)) return NaN;
    return Number(normalized);
}

function parseDate(value: string, format: DateFormat): string {
    const match = format === 'dmy' ? /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value) : /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) throw new Error('Fecha inválida');
    const iso = format === 'dmy' ? `${match[3]}-${match[2]}-${match[1]}` : value;
    const date = new Date(`${iso}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== iso) throw new Error('Fecha inválida');
    return iso;
}

// Los formatos de IOL, Balanz y PPI requieren archivos reales de ejemplo antes de agregar presets.
export function mapPortfolioCsv(rows: string[][], mapping: ColumnMapping, dateFormat: DateFormat, decimal: DecimalSeparator) {
    const required = [mapping.asset, mapping.amount, mapping.price, mapping.date];
    if (required.some(index => !Number.isInteger(index) || index < 0) ||
        new Set([...required, ...(mapping.note === null ? [] : [mapping.note])]).size !== required.length + (mapping.note === null ? 0 : 1)) {
        throw new Error('Asigná una columna distinta a cada campo requerido.');
    }
    return rows.slice(1).map((row, i) => {
        try {
            const asset = row[mapping.asset]?.trim();
            const amount = parseNumber(row[mapping.amount]?.trim() ?? '', decimal);
            const buyPrice = parseNumber(row[mapping.price]?.trim() ?? '', decimal);
            const date = parseDate(row[mapping.date]?.trim() ?? '', dateFormat);
            const note = mapping.note === null ? undefined : row[mapping.note]?.trim();
            if (!asset || asset.length > 20 || !Number.isFinite(amount) || amount <= 0 ||
                !Number.isFinite(buyPrice) || buyPrice <= 0 || (note && note.length > 500)) throw new Error('Campo inválido');
            return { asset, amount, buyPrice, date, note };
        } catch {
            throw new Error(`Revisá los datos de la fila ${i + 2}.`);
        }
    });
}
