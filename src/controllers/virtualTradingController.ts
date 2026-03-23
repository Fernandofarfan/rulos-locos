import { Request, Response } from 'express';
import prisma from '../utils/db';
import logger from '../utils/logger';

interface AuthRequest extends Request {
    user?: { id: string; email: string };
}

class VirtualTradingController {

    // Asigna bono de bienvenida de $1,000,000 ARS si no tiene balance
    async initBalance(req: AuthRequest, res: Response): Promise<void> {
        if (!prisma) { res.status(503).json({ error: 'DB no disponible' }); return; }
        try {
            const userId = req.user?.id;
            if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }

            const arsBalance = await prisma.virtualBalance.findUnique({
                where: { userId_currency: { userId, currency: 'ARS' } }
            });

            if (!arsBalance) {
                // Bono inicial
                await prisma.virtualBalance.create({
                    data: { userId, currency: 'ARS', amount: 1000000 }
                });

                await prisma.virtualTransaction.create({
                    data: {
                        userId,
                        type: 'DEPOSIT',
                        asset: 'ARS',
                        amount: 1000000,
                        price: 1,
                        totalArs: 1000000
                    }
                });
            }

            const allBalances = await prisma.virtualBalance.findMany({ where: { userId } });
            res.json(allBalances);
        } catch (error) {
            logger.error('Error initBalance: %s', (error as Error).message);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Comprar / Vender activos virtuales
    async trade(req: AuthRequest, res: Response): Promise<void> {
        if (!prisma) { res.status(503).json({ error: 'DB no disponible' }); return; }
        try {
            const userId = req.user?.id;
            if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }

            const { type, asset, amount, price } = req.body as { type: 'BUY' | 'SELL'; asset: string; amount: number; price: number };
            const totalArs = amount * price;

            // Transacción atómica
            await prisma.$transaction(async (tx: any) => {
                let arsBal = await tx.virtualBalance.findUnique({ where: { userId_currency: { userId, currency: 'ARS' } } });
                if (!arsBal && type === 'SELL') throw new Error("No ARS balance to sell against");

                let assetBal = await tx.virtualBalance.findUnique({ where: { userId_currency: { userId, currency: asset } } });

                if (type === 'BUY') {
                    if (!arsBal || arsBal.amount < totalArs) throw new Error("Saldo ARS insuficiente para la compra");

                    // Restar ARS
                    await tx.virtualBalance.update({
                        where: { id: arsBal.id },
                        data: { amount: arsBal.amount - totalArs }
                    });

                    // Sumar Asset
                    if (assetBal) {
                        await tx.virtualBalance.update({
                            where: { id: assetBal.id },
                            data: { amount: assetBal.amount + amount }
                        });
                    } else {
                        await tx.virtualBalance.create({
                            data: { userId, currency: asset, amount }
                        });
                    }
                } else if (type === 'SELL') {
                    if (!assetBal || assetBal.amount < amount) throw new Error(`Saldo ${asset} insuficiente para la venta`);

                    // Restar Asset
                    await tx.virtualBalance.update({
                        where: { id: assetBal.id },
                        data: { amount: assetBal.amount - amount }
                    });

                    // Sumar ARS
                    if (arsBal) {
                        await tx.virtualBalance.update({
                            where: { id: arsBal.id },
                            data: { amount: arsBal.amount + totalArs }
                        });
                    } else {
                        await tx.virtualBalance.create({
                            data: { userId, currency: 'ARS', amount: totalArs }
                        });
                    }
                }

                // Registrar tx
                await tx.virtualTransaction.create({
                    data: { userId, type, asset, amount, price, totalArs }
                });
            });

            // Devolver saldos actualizados
            const finalBalances = await prisma.virtualBalance.findMany({ where: { userId } });
            res.json(finalBalances);

        } catch (error) {
            logger.warn('Trade err: %s', (error as Error).message);
            res.status(400).json({ error: (error as Error).message });
        }
    }
}

export default new VirtualTradingController();
