/**
 * Tests para el hook useDashboardData
 * Verifica fetching, estado de carga, datos retornados y refresco.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ── Mock: apiService ─────────────────────────────────────────────────────────
const { mockRate, mockArbitrage, mockEconomics } = vi.hoisted(() => ({
    mockRate: {
        ask: 1200, bid: 1150,
        totalAsk: 1200, totalBid: 1150,
        source: 'mock',
    },
    mockArbitrage: {
        opportunities: [
            {
                type: 'USDT→ARS',
                description: 'Binance MEP',
                buyIn: 'Binance',
                buyPrice: 1100,
                sellIn: 'Mercado',
                sellPrice: 1200,
                rentabilidad: 9.09,
                ganancia: 100,
                riesgo: 'Bajo',
            },
        ],
        dolares: {
            blue: { compra: 1150, venta: 1180 },
            oficial: { compra: 1040, venta: 1090 },
        },
    },
    mockEconomics: {
        macro: {
            inflation: { mensual: 3.2, interanual: 120, fecha: '2026-02-01' },
            risk: 650,
            reserves: 45000,
            baseMonetaria: 60e12,
            dolarEquilibrio: 1333,
        },
        market: { merval: [], cedears: [], bonds: [] },
        global: [],
        timestamp: new Date().toISOString(),
    }
}));

vi.mock('../services/api', () => ({
    apiService: {
        getRate:      vi.fn().mockResolvedValue(mockRate),
        getArbitrage: vi.fn().mockResolvedValue(mockArbitrage),
        getEconomics: vi.fn().mockResolvedValue(mockEconomics),
    },
}));

// ── Mock: useSocket (socket.io no disponible en jsdom) ───────────────────────
vi.mock('./useSocket', () => ({
    useSocket: () => ({ socket: null }),
}));

// ── Importar DESPUÉS de los mocks ─────────────────────────────────────────────
import { useDashboardData } from './useDashboardData';

describe('useDashboardData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('inicia con loading=true y datos nulos', async () => {
        const { result } = renderHook(() => useDashboardData());
        expect(result.current.loading).toBe(true);
        expect(result.current.rate).toBeNull();
        expect(result.current.arbitrage).toBeNull();
        expect(result.current.economics).toBeNull();
        
        // Wait for it to finish to avoid act() leakage
        await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it('establece loading=false tras el primer fetch', async () => {
        const { result } = renderHook(() => useDashboardData());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });
    });

    it('popula rate con los datos de la API', async () => {
        const { result } = renderHook(() => useDashboardData());

        await waitFor(() => expect(result.current.rate).not.toBeNull());
        expect(result.current.rate?.ask).toBe(1200);
        expect(result.current.rate?.source).toBe('mock');
    });

    it('popula arbitrage con las oportunidades de la API', async () => {
        const { result } = renderHook(() => useDashboardData());

        await waitFor(() => expect(result.current.arbitrage).not.toBeNull());
        expect(result.current.arbitrage?.opportunities).toHaveLength(1);
        expect(result.current.arbitrage?.opportunities[0].rentabilidad).toBe(9.09);
    });

    it('popula economics con los datos macroeconómicos', async () => {
        const { result } = renderHook(() => useDashboardData());

        await waitFor(() => expect(result.current.economics).not.toBeNull());
        expect(result.current.economics?.macro.risk).toBe(650);
        expect(result.current.economics?.macro.inflation.interanual).toBe(120);
        expect(result.current.economics?.global).toEqual([]);
    });

    it('setea lastUpdated tras un fetch exitoso', async () => {
        const { result } = renderHook(() => useDashboardData());

        await waitFor(() => expect(result.current.lastUpdated).not.toBeNull());
        expect(result.current.lastUpdated).toBeInstanceOf(Date);
    });

    it('expone una función refresh', async () => {
        const { result } = renderHook(() => useDashboardData());
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(typeof result.current.refresh).toBe('function');
    });

    it('inicia isRefreshing en false', async () => {
        const { result } = renderHook(() => useDashboardData());
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.isRefreshing).toBe(false);
    });

    it('calcula rateChange=0 en el primer fetch (sin valor previo)', async () => {
        const { result } = renderHook(() => useDashboardData());

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.rateChange).toBe(0);
    });

    it('re-fetcha cuando se llama a refresh()', async () => {
        const { apiService } = await import('../services/api');
        const getRateMock = vi.fn()
            .mockResolvedValueOnce(mockRate)
            .mockResolvedValueOnce(mockRate)
            .mockResolvedValueOnce({ ...mockRate, ask: 1300 });

        (apiService.getRate as ReturnType<typeof vi.fn>) = getRateMock;

        const { result } = renderHook(() => useDashboardData());
        await waitFor(() => expect(result.current.rate?.ask).toBe(1200));

        await act(async () => {
            await result.current.refresh();
        });

        // El mock se llamó al menos 2 veces (fetch inicial + refresh)
        expect(getRateMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
});
