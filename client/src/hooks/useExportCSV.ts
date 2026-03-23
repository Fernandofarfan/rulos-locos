import { useCallback } from 'react';

/**
 * Hook to export an array of objects to a CSV file.
 */
export function useExportCSV() {
    const exportToCSV = useCallback(<T extends Record<string, any>>(
        data: T[],
        filename: string,
        columns?: (keyof T)[]
    ) => {
        if (!data || !data.length) return;

        // If columns not specified, use keys of the first object
        const cols = columns || (Object.keys(data[0]) as (keyof T)[]);

        // Build CSV string
        const csvRows = [];
        // Header
        csvRows.push(cols.join(','));

        // Data
        for (const row of data) {
            const values = cols.map(col => {
                const val = row[col];
                // Escape quotes and wrap in quotes if there's a comma inside
                const escaped = String(val ?? '').replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\r\n');

        // Create Blob and download
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, []);

    return { exportToCSV };
}
