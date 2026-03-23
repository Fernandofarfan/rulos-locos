/**
 * @vitest-environment jsdom
 * Tests para InterestRates
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ── Mock: apiService ──────────────────────────────────────────────────────────
const { mockRatesData } = vi.hoisted(() => ({
    mockRatesData: {
        badlar:    { tna: 34.0,  tem: 2.83,  tea: 40.5,  fecha: '2026-02-01' },
        plazoFijo: { tna: 33.0,  tem: 2.75,  tea: 39.1,  fecha: '' },
        inflation: { mensual: 3.2, interanual: 120.0, fecha: '2026-02-01' },
        realRate: -86.0, // 34 - 120 = -86
        timestamp: new Date().toISOString(),
    }
}));

vi.mock('../services/api', () => ({
    apiService: {
        getRates: vi.fn().mockResolvedValue(mockRatesData),
    },
}));

// ── Importar después de los mocks ─────────────────────────────────────────────
import { InterestRates } from './InterestRates';

describe('InterestRates', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('muestra el skeleton de carga antes de recibir datos', () => {
        const { container } = render(<InterestRates />);
        // Durante la carga debe mostrar el skeleton
        const pulse = container.querySelector('.animate-pulse');
        expect(pulse).toBeTruthy();
    });

    it('muestra el título "Tasas de Interés" tras cargar', async () => {
        render(<InterestRates />);
        await waitFor(() => {
            expect(screen.getByText(/tasas de interés/i)).toBeTruthy();
        });
    });

    it('renderiza la card BADLAR con TNA 34.00%', async () => {
        render(<InterestRates />);
        await waitFor(() => {
            expect(screen.getByText('BADLAR')).toBeTruthy();
        });
        // El valor TNA de BADLAR
        expect(screen.getByText('34.00')).toBeTruthy();
    });

    it('renderiza la card Plazo Fijo con TNA 33.00%', async () => {
        render(<InterestRates />);
        await waitFor(() => {
            expect(screen.getByText('Plazo Fijo')).toBeTruthy();
        });
        expect(screen.getByText('33.00')).toBeTruthy();
    });

    it('muestra "La tasa no cubre la inflación" cuando la tasa real es negativa', async () => {
        // mockRatesData tiene realRate = -86 (negativo)
        render(<InterestRates />);
        await waitFor(() => {
            expect(screen.getByText(/la tasa no cubre la inflación/i)).toBeTruthy();
        });
    });

    it('muestra "La tasa supera la inflación" cuando la tasa real es positiva', async () => {
        const { apiService } = await import('../services/api');
        (apiService.getRates as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ...mockRatesData,
            badlar: { ...mockRatesData.badlar, tna: 150 },
            realRate: 30, // positivo
        });

        render(<InterestRates />);
        await waitFor(() => {
            expect(screen.getByText(/la tasa supera la inflación/i)).toBeTruthy();
        });
    });

    it('muestra la barra de cobertura de inflación', async () => {
        render(<InterestRates />);
        await waitFor(() => screen.getByText(/cobertura/i));
        expect(screen.getByText(/cobertura/i)).toBeTruthy();
    });

    it('botón "Actualizar" llama a getRates de nuevo', async () => {
        const { apiService } = await import('../services/api');

        render(<InterestRates />);
        await waitFor(() => screen.getByText(/tasas de interés/i));

        const refreshBtn = screen.getByLabelText(/actualizar tasas de interés/i);
        fireEvent.click(refreshBtn);

        await waitFor(() => {
            expect(apiService.getRates).toHaveBeenCalledTimes(2);
        });
    });

    it('muestra la fuente de datos "BCRA / ArgentinaDatos"', async () => {
        render(<InterestRates />);
        await waitFor(() => {
            expect(screen.getByText(/BCRA.*ArgentinaDatos/i)).toBeTruthy();
        });
    });

    it('muestra TEM y TEA en cada card', async () => {
        render(<InterestRates />);
        await waitFor(() => screen.getByText('BADLAR'));

        // BADLAR TEM = 2.83, TEA = 40.50
        expect(screen.getByText('2.83%')).toBeTruthy();
        expect(screen.getByText('40.50%')).toBeTruthy();
    });
});
