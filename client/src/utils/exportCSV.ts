/**
 * Utilidad de exportación a CSV
 * Genera y descarga automáticamente un archivo CSV desde un array de objetos.
 */
export const exportToCSV = (data: Record<string, any>[], filename: string): void => {
    if (!data || data.length === 0) {
        console.warn('exportToCSV: no data to export');
        return;
    }

    const headers = Object.keys(data[0]);
    const escape = (val: any): string => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => escape(row[h])).join(','))
    ].join('\n');

    // BOM para que Excel abra correctamente en español (UTF-8)
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
