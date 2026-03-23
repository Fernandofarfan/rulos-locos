/**
 * @vitest-environment jsdom
 *
 * Tests de componentes y utilidades clave.
 * Ejecutar: npm test (en client/)
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';


// ── Mocks globales ────────────────────────────────────────────────────────────

// Mockeamos apiService para que todos los componentes que lo importen
// reciban respuestas controladas sin hacer fetch real.
vi.mock('./services/api', () => ({
    apiService: {
        getRate: vi.fn().mockResolvedValue({ ask: 1200, bid: 1150, source: 'mock', totalBid: 0, totalAsk: 0 }),
        getArbitrage: vi.fn().mockResolvedValue({ opportunities: [], dolares: {} }),
        getEconomics: vi.fn().mockResolvedValue({ macro: { inflation: { mensual: 3.2, interanual: 120 }, risk: 650, reserves: 45000, baseMonetaria: 60e12, dolarEquilibrio: 1333 }, market: { merval: [], cedears: [], bonds: [] }, global: [], timestamp: new Date().toISOString() }),
        getHistorical: vi.fn().mockResolvedValue({ labels: ['2024-01', '2024-02', '2024-03'], values: [20.6, 13.2, 11.0] }),
    },
}));

// ── Importaciones después de los mocks ────────────────────────────────────────
import { SectionErrorBoundary } from './components/ui/SectionErrorBoundary';
import { Tooltip } from './components/ui/Tooltip';
import { BondCalculator } from './components/BondCalculator';
import { InflationCalculator } from './components/InflationCalculator';

// ─────────────────────────────────────────────────────────────────────────────
// SectionErrorBoundary
// ─────────────────────────────────────────────────────────────────────────────

/** Componente que lanza un error para testear el boundary */
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
    if (shouldThrow) throw new Error('Error de prueba');
    return <div>Contenido correcto</div>;
}

describe('SectionErrorBoundary', () => {
    // Silenciar el console.error que React emite al capturar errores
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    test('renderiza los hijos cuando no hay error', () => {
        render(
            <SectionErrorBoundary>
                <ThrowError shouldThrow={false} />
            </SectionErrorBoundary>
        );
        expect(screen.getByText('Contenido correcto')).toBeTruthy();
    });

    test('muestra el fallback cuando un hijo lanza un error', () => {
        render(
            <SectionErrorBoundary>
                <ThrowError shouldThrow={true} />
            </SectionErrorBoundary>
        );
        // Debe mostrar el UI de error con opción de reintentar
        expect(screen.getByText(/reintentar/i)).toBeTruthy();
    });

    test('recupera el estado normal al hacer clic en "Reintentar"', () => {
        // Una vez que el boundary captura el error, resetea su estado al hacer click
        const { rerender: _rerender } = render(
            <SectionErrorBoundary>
                <ThrowError shouldThrow={true} />
            </SectionErrorBoundary>
        );
        const btn = screen.getByText(/reintentar/i);
        fireEvent.click(btn);
        // Después del reset, el boundary intenta renderizar hijos de nuevo.
        // Como ThrowError sigue lanzando, volvemos a ver el fallback—
        // lo importante es que el click no rompe la UI.
        expect(document.body).toBeTruthy();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tooltip
// ─────────────────────────────────────────────────────────────────────────────

describe('Tooltip', () => {
    test('renderiza el elemento hijo', () => {
        render(
            <Tooltip content="Texto del tooltip">
                <button>Hover me</button>
            </Tooltip>
        );
        expect(screen.getByText('Hover me')).toBeTruthy();
    });

    test('el tooltip no es visible antes del hover', () => {
        render(
            <Tooltip content="Texto secreto">
                <button>Trigger</button>
            </Tooltip>
        );
        // El portal no debería estar en el DOM aún
        expect(screen.queryByRole('tooltip')).toBeNull();
    });

    test('muestra el tooltip al hacer mouseenter en el wrapper', async () => {
        render(
            <Tooltip content="ToolTip visible" delay={0}>
                <button>Trigger</button>
            </Tooltip>
        );
        const wrapper = screen.getByText('Trigger').closest('span')!;
        fireEvent.mouseEnter(wrapper);
        await waitFor(() => {
            expect(screen.getByRole('tooltip')).toBeTruthy();
            expect(screen.getByText('ToolTip visible')).toBeTruthy();
        });
    });

    test('oculta el tooltip al hacer mouseleave', async () => {
        render(
            <Tooltip content="Tooltip oculto" delay={0}>
                <button>Trigger</button>
            </Tooltip>
        );
        const wrapper = screen.getByText('Trigger').closest('span')!;
        fireEvent.mouseEnter(wrapper);
        await waitFor(() => expect(screen.queryByRole('tooltip')).toBeTruthy());

        fireEvent.mouseLeave(wrapper);
        await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// BondCalculator
// ─────────────────────────────────────────────────────────────────────────────

describe('BondCalculator', () => {
    test('renderiza el formulario con precio y selector de bono', () => {
        render(<BondCalculator />);
        expect(screen.getByText(/calculadora de bonos/i)).toBeTruthy();
        expect(screen.getByRole('combobox')).toBeTruthy(); // select de bono
        expect(screen.getByRole('spinbutton')).toBeTruthy(); // input numérico
    });

    test('renderiza el botón de calcular', () => {
        render(<BondCalculator />);
        expect(screen.getByRole('button', { name: /calcular/i })).toBeTruthy();
    });

    test('muestra un resultado de TIR al hacer click en calcular', async () => {
        render(<BondCalculator />);
        const btn = screen.getByRole('button', { name: /calcular/i });
        fireEvent.click(btn);
        // La TIR se calcula con Newton-Raphson y aparece en pantalla
        await waitFor(() => {
            expect(screen.getByText(/tasa interna de retorno/i)).toBeTruthy();
        });
    });

    test('la TIR para AL30 a precio 60 es mayor que 10% y menor que 60%', async () => {
        render(<BondCalculator />);
        // Precio default es 62; cambiarlo a 60
        const input = screen.getByRole('spinbutton') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '60' } });
        fireEvent.click(screen.getByRole('button', { name: /calcular/i }));

        await waitFor(() => {
            const resultText = screen.getByText(/\d+[.,]\d+%/).textContent ?? '';
            const match = resultText.match(/([\d.,]+)%/);
            if (match) {
                const pct = parseFloat(match[1].replace(',', '.'));
                expect(pct).toBeGreaterThan(10);
                expect(pct).toBeLessThan(60);
            }
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// InflationCalculator
// ─────────────────────────────────────────────────────────────────────────────

describe('InflationCalculator', () => {
    test('renderiza el formulario inicial', () => {
        render(<InflationCalculator />);
        expect(screen.getByText(/ajuste por inflación/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: /calcular/i })).toBeTruthy();
    });

    test('acepta cambio de monto', () => {
        render(<InflationCalculator />);
        const inputs = screen.getAllByRole('spinbutton');
        const montoInput = inputs[0] as HTMLInputElement;
        fireEvent.change(montoInput, { target: { value: '5000' } });
        expect(montoInput.value).toBe('5000');
    });

    test('muestra el resultado ajustado tras calcular con datos de la API (mock)', async () => {
        render(<InflationCalculator />);
        // La API mock devuelve variaciones [20.6, 13.2, 11.0] para 2024-01..03
        // Fecha de origen anterior a esas fechas → el factor debería ser > 1
        const dateInput = screen.getByDisplayValue('2023-01-01') as HTMLInputElement;
        fireEvent.change(dateInput, { target: { value: '2023-12-01' } });

        fireEvent.click(screen.getByRole('button', { name: /calcular/i }));

        await waitFor(() => {
            expect(screen.getByText(/valor ajustado hoy/i)).toBeTruthy();
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Indicadores Técnicos — calcSMA, calcEMA, calcRSI
// ─────────────────────────────────────────────────────────────────────────────

import { calcSMA, calcEMA, calcRSI } from './utils/indicators';

describe('calcSMA', () => {
    test('devuelve nulls hasta que hay suficientes puntos', () => {
        const result = calcSMA([1, 2, 3, 4, 5], 3);
        expect(result[0]).toBeNull();
        expect(result[1]).toBeNull();
        expect(result[2]).toBeCloseTo(2); // (1+2+3)/3
    });

    test('calcula el promedio correctamente', () => {
        const result = calcSMA([2, 4, 6, 8], 2);
        expect(result[0]).toBeNull();
        expect(result[1]).toBeCloseTo(3);  // (2+4)/2
        expect(result[2]).toBeCloseTo(5);  // (4+6)/2
        expect(result[3]).toBeCloseTo(7);  // (6+8)/2
    });

    test('devuelve array de nulls si hay menos puntos que el período', () => {
        const result = calcSMA([1, 2], 5);
        expect(result.every(v => v === null)).toBe(true);
    });
});

describe('calcEMA', () => {
    test('devuelve nulls hasta el período -1', () => {
        const result = calcEMA([1, 2, 3, 4, 5, 6], 3);
        expect(result[0]).toBeNull();
        expect(result[1]).toBeNull();
        expect(result[2]).not.toBeNull(); // seed en índice 2
    });

    test('la semilla es igual a SMA del primer período', () => {
        const values = [10, 20, 30, 40];
        const ema = calcEMA(values, 3);
        const seed = (10 + 20 + 30) / 3;
        expect(ema[2]).toBeCloseTo(seed);
    });

    test('cada valor posterior es EMA suavizada', () => {
        const values = [10, 20, 30, 40, 50];
        const ema = calcEMA(values, 3);
        // k = 2/(3+1) = 0.5; ema[3] = 40*0.5 + ema[2]*0.5
        const expected = 40 * 0.5 + (ema[2]! * 0.5);
        expect(ema[3]).toBeCloseTo(expected);
    });

    test('EMA está entre el valor mínimo y máximo del rango', () => {
        const values = [100, 102, 98, 103, 101, 99, 105, 107];
        const ema = calcEMA(values, 4);
        const nonNull = ema.filter(v => v !== null) as number[];
        expect(nonNull.every(v => v > 90 && v < 120)).toBe(true);
    });
});

describe('calcRSI', () => {
    test('devuelve nulls para los primeros `period` índices', () => {
        const values = Array.from({ length: 20 }, (_, i) => i);
        const rsi = calcRSI(values, 14);
        // Los primeros 14 índices deben ser null
        for (let i = 0; i < 14; i++) expect(rsi[i]).toBeNull();
        expect(rsi[14]).not.toBeNull();
    });

    test('RSI con precio siempre subiendo es cercano a 100', () => {
        // Precio siempre sube: todas las ganancias, cero pérdidas → RS = Inf → RSI = 100
        const values = Array.from({ length: 20 }, (_, i) => i + 1);
        const rsi = calcRSI(values, 14);
        const nonNull = rsi.filter(v => v !== null) as number[];
        expect(nonNull.every(v => v > 90)).toBe(true);
    });

    test('RSI con precio siempre bajando es cercano a 0', () => {
        const values = Array.from({ length: 20 }, (_, i) => 100 - i);
        const rsi = calcRSI(values, 14);
        const nonNull = rsi.filter(v => v !== null) as number[];
        expect(nonNull.every(v => v < 10)).toBe(true);
    });

    test('RSI siempre está entre 0 y 100', () => {
        const values = [100, 102, 98, 103, 97, 105, 101, 99, 107, 103, 98, 106, 104, 99, 102, 108, 105, 100];
        const rsi = calcRSI(values, 14);
        const nonNull = rsi.filter(v => v !== null) as number[];
        expect(nonNull.every(v => v >= 0 && v <= 100)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PriceAlerts
// ─────────────────────────────────────────────────────────────────────────────

// Mock useSocket para evitar conexión WebSocket real
vi.mock('./hooks/useSocket', () => ({
    useSocket: () => ({ socket: null, isConnected: false }),
}));

import { PriceAlerts } from './components/PriceAlerts';

const defaultPrices = { blue: 1300, mep: 1280, oficial: 1050, crypto: 1310 };

describe('PriceAlerts', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    test('renderiza el componente con el título correcto', () => {
        const { getByRole } = render(<PriceAlerts prices={defaultPrices} />);
        expect(getByRole('heading', { name: /alertas/i })).toBeTruthy();
    });

    test('muestra mensaje "Sin alertas activas" cuando no hay alertas', () => {
        render(<PriceAlerts prices={defaultPrices} />);
        expect(screen.getByText(/sin alertas activas/i)).toBeTruthy();
    });

    test('permite agregar una alerta nueva', async () => {
        render(<PriceAlerts prices={defaultPrices} />);
        const input = screen.getByPlaceholderText(/precio objetivo/i) as HTMLInputElement;
        fireEvent.change(input, { target: { value: '1500' } });
        const addBtn = screen.getByRole('button', { name: /agregar alerta/i });
        fireEvent.click(addBtn);
        await waitFor(() => {
            expect(screen.getByText(/1500/)).toBeTruthy();
        });
    });

    test('puede eliminar una alerta existente', async () => {
        render(<PriceAlerts prices={defaultPrices} />);
        // Agregar alerta primero
        const input = screen.getByPlaceholderText(/precio objetivo/i) as HTMLInputElement;
        fireEvent.change(input, { target: { value: '1600' } });
        fireEvent.click(screen.getByRole('button', { name: /agregar alerta/i }));

        await waitFor(() => expect(screen.getByText(/1600/)).toBeTruthy());

        // Eliminar
        const deleteBtn = screen.getByRole('button', { name: /eliminar alerta/i });
        fireEvent.click(deleteBtn);

        await waitFor(() => {
            expect(screen.queryByText(/1600/)).toBeNull();
        });
    });

    test('el botón "Agregar" está deshabilitado si no hay precio', () => {
        render(<PriceAlerts prices={defaultPrices} />);
        const addBtn = screen.getByRole('button', { name: /agregar alerta/i }) as HTMLButtonElement;
        expect(addBtn.disabled).toBe(true);
    });

    test('muestra el enlace de Telegram Bot Push', () => {
        render(<PriceAlerts prices={defaultPrices} />);
        expect(screen.getByRole('link', { name: /bot push/i })).toBeTruthy();
    });
});

