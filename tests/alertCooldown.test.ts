jest.mock('../src/utils/db', () => ({ __esModule: true, default: { alert: { findMany: jest.fn(), updateMany: jest.fn() } } }));
jest.mock('../src/utils/cache', () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock('../src/services/notificationService', () => ({ __esModule: true, default: { sendTelegramMessage: jest.fn().mockResolvedValue(true) } }));
jest.mock('../src/services/emailService', () => ({ sendPriceAlertEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../src/controllers/pushController', () => ({ broadcastPush: jest.fn().mockResolvedValue(undefined) }));

import prisma from '../src/utils/db';
import cache from '../src/utils/cache';
import notificationService from '../src/services/notificationService';
import { AlertService } from '../src/services/alertService';

beforeEach(() => jest.clearAllMocks());

it('claims a price alert once across service instances for six hours', async () => {
    const alert = { id: 'alert', kind: 'PRICE', asset: 'blue', condition: 'above', threshold: 1000,
        active: true, user: { email: 'test@example.com' } };
    jest.mocked(prisma!.alert.findMany).mockResolvedValue([alert] as never);
    let lastTriggeredAt: Date | null = null;
    jest.mocked(prisma!.alert.updateMany).mockImplementation(async args => {
        const now = args.data.lastTriggeredAt as Date;
        if (lastTriggeredAt && now.getTime() - lastTriggeredAt.getTime() < 6 * 60 * 60 * 1000) return { count: 0 };
        lastTriggeredAt = now;
        return { count: 1 };
    });
    const first = new AlertService();
    const second = new AlertService();
    jest.spyOn(first, 'getCurrentPrices').mockResolvedValue({ blue: 1100 });
    jest.spyOn(second, 'getCurrentPrices').mockResolvedValue({ blue: 1100 });
    await Promise.all([first.checkAndTriggerAlerts(), second.checkAndTriggerAlerts()]);
    expect(notificationService.sendTelegramMessage).toHaveBeenCalledTimes(1);
    expect(prisma!.alert.updateMany).toHaveBeenCalledTimes(2);
});

it('triggers a rulo alert only when the net return reaches its threshold', async () => {
    const alert = { id: 'rulo', kind: 'RULO', routeId: 'blue-mep', capital: 100_000, asset: 'rulo',
        condition: 'above', threshold: 5, active: true, user: { email: 'test@example.com' } };
    jest.mocked(prisma!.alert.findMany).mockResolvedValue([alert] as never);
    jest.mocked(prisma!.alert.updateMany).mockResolvedValue({ count: 1 });
    jest.mocked(cache.get).mockResolvedValue({
        dolares: { blue: { casa: 'blue', nombre: 'Blue', compra: 990, venta: 1000 },
            mep: { casa: 'bolsa', nombre: 'MEP', compra: 1100, venta: 1110 }, oficial: null, ccl: null },
        cryptos: {}, opportunities: [], timestamp: '2026-11-13T00:00:00Z',
    });
    await new AlertService().checkAndTriggerAlerts();
    expect(notificationService.sendTelegramMessage).toHaveBeenCalledWith(expect.stringContaining('blue-mep'));
    expect(notificationService.sendTelegramMessage).toHaveBeenCalledWith(expect.stringContaining('Rentabilidad neta estimada'));
    jest.mocked(notificationService.sendTelegramMessage).mockClear();
    jest.mocked(prisma!.alert.updateMany).mockClear();
    jest.mocked(prisma!.alert.findMany).mockResolvedValue([{ ...alert, threshold: 20 }] as never);
    await new AlertService().checkAndTriggerAlerts();
    expect(prisma!.alert.updateMany).not.toHaveBeenCalled();
    expect(notificationService.sendTelegramMessage).not.toHaveBeenCalled();
});
