import prisma from '../utils/db';
import logger from '../utils/logger';

interface PortfolioExportData {
    exportDate: string;
    positions: Array<{
        asset: string;
        buyPrice: number;
        amount: number;
        date: string;
        note?: string;
    }>;
}

class PortfolioImportExportService {
    /**
     * Exportar portfolio a JSON
     */
    async exportAsJSON(userId: string): Promise<PortfolioExportData> {
        try {
            if (!prisma) throw new Error('BD no disponible');

            const positions = await prisma.portfolioPosition.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                select: {
                    asset: true,
                    buyPrice: true,
                    amount: true,
                    date: true,
                    note: true,
                },
            });

            return {
                exportDate: new Date().toISOString(),
                positions: positions.map((p: any) => ({ ...p, note: p.note || undefined })),
            };
        } catch (error) {
            logger.error('Error exportando portfolio: %s', (error as Error).message);
            throw error;
        }
    }

    /**
     * Exportar portfolio a CSV
     */
    async exportAsCSV(userId: string): Promise<string> {
        try {
            if (!prisma) throw new Error('BD no disponible');

            const positions = await prisma.portfolioPosition.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });

            // CSV headers
            let csv = 'Asset,Amount,Buy Price (ARS),Date,Note\n';

            // Add rows
            for (const pos of positions) {
                const note = pos.note ? `"${pos.note.replace(/"/g, '""')}"` : '';
                csv += `${pos.asset},${pos.amount},${pos.buyPrice},${pos.date},${note}\n`;
            }

            return csv;
        } catch (error) {
            logger.error('Error exportando portfolio a CSV: %s', (error as Error).message);
            throw error;
        }
    }

    /**
     * Importar portfolio desde JSON
     * @param userId - ID del usuario
     * @param data - Datos exportados
     * @param merge - Si true, agrega posiciones; si false, reemplaza
     */
    async importFromJSON(userId: string, data: PortfolioExportData, merge: boolean = false): Promise<number> {
        try {
            if (!prisma) throw new Error('BD no disponible');

            // Si no merge, eliminar posiciones existentes
            if (!merge) {
                await prisma.portfolioPosition.deleteMany({ where: { userId } });
            }

            // Importar nuevas posiciones
            let imported = 0;
            for (const pos of data.positions) {
                try {
                    await prisma.portfolioPosition.create({
                        data: {
                            userId,
                            asset: pos.asset,
                            buyPrice: pos.buyPrice,
                            amount: pos.amount,
                            date: pos.date,
                            note: pos.note,
                        },
                    });
                    imported++;
                } catch (e) {
                    logger.warn('Error importando posición %s: %s', pos.asset, (e as Error).message);
                }
            }

            logger.info('Portfolio importado: %d posiciones para usuario %s', imported, userId);
            return imported;
        } catch (error) {
            logger.error('Error importando portfolio: %s', (error as Error).message);
            throw error;
        }
    }

    /**
     * Importar portfolio desde CSV
     */
    async importFromCSV(userId: string, csvContent: string, merge: boolean = false): Promise<number> {
        try {
            if (!prisma) throw new Error('BD no disponible');

            const lines = csvContent.trim().split('\n');
            if (lines.length < 2) throw new Error('CSV vacío');

            // Skip header
            const rows = lines.slice(1);

            // Si no merge, eliminar posiciones existentes
            if (!merge) {
                await prisma.portfolioPosition.deleteMany({ where: { userId } });
            }

            let imported = 0;
            for (const row of rows) {
                try {
                    // Simple CSV parsing (no maneja quoted fields complejos)
                    const [asset, amount, buyPrice, date, note] = row.split(',').map(s => s.trim());

                    if (!asset || !amount || !buyPrice || !date) continue;

                    await prisma.portfolioPosition.create({
                        data: {
                            userId,
                            asset,
                            amount: parseFloat(amount),
                            buyPrice: parseFloat(buyPrice),
                            date,
                            note: note || undefined,
                        },
                    });
                    imported++;
                } catch (e) {
                    logger.warn('Error parseando CSV row: %s', (e as Error).message);
                }
            }

            logger.info('Portfolio importado desde CSV: %d posiciones para usuario %s', imported, userId);
            return imported;
        } catch (error) {
            logger.error('Error importando portfolio desde CSV: %s', (error as Error).message);
            throw error;
        }
    }

    /**
     * Obtener statisticas del portfolio
     */
    async getStats(userId: string): Promise<{
        totalPositions: number;
        totalInvested: number;
        assets: string[];
    }> {
        try {
            if (!prisma) throw new Error('BD no disponible');

            const positions = await prisma.portfolioPosition.findMany({
                where: { userId },
            });

            const totalInvested = positions.reduce((sum: number, pos: { buyPrice: number; amount: number }) => sum + pos.buyPrice * pos.amount, 0);
            const assets = Array.from(new Set<string>(positions.map((pos: { asset: string }) => pos.asset)));

            return {
                totalPositions: positions.length,
                totalInvested,
                assets,
            };
        } catch (error) {
            logger.error('Error calculando stats: %s', (error as Error).message);
            throw error;
        }
    }
}

export default new PortfolioImportExportService();
