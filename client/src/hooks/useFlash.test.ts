/**
 * Tests para el hook useFlash
 * Verifica que retorna la clase correcta al cambiar el valor
 * y que la limpia tras el delay configurado.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFlash } from './useFlash';

describe('useFlash', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('retorna string vacío en el render inicial', () => {
        const { result } = renderHook(() => useFlash(1200));
        expect(result.current).toBe('');
    });

    it('retorna la clase positiva cuando el valor aumenta', () => {
        const { result, rerender } = renderHook(
            ({ val }) => useFlash(val, 'text-green-500', 'text-red-500', 1000),
            { initialProps: { val: 1200 } }
        );

        act(() => {
            rerender({ val: 1250 });
        });

        expect(result.current).toBe('text-green-500');
    });

    it('retorna la clase negativa cuando el valor disminuye', () => {
        const { result, rerender } = renderHook(
            ({ val }) => useFlash(val, 'text-green-500', 'text-red-500', 1000),
            { initialProps: { val: 1200 } }
        );

        act(() => {
            rerender({ val: 1150 });
        });

        expect(result.current).toBe('text-red-500');
    });

    it('limpia la clase después del tiempo de duración', () => {
        const duration = 1000;
        const { result, rerender } = renderHook(
            ({ val }) => useFlash(val, 'text-green-500', 'text-red-500', duration),
            { initialProps: { val: 1200 } }
        );

        act(() => {
            rerender({ val: 1300 });
        });
        expect(result.current).toBe('text-green-500');

        act(() => {
            vi.advanceTimersByTime(duration + 50);
        });
        expect(result.current).toBe('');
    });

    it('no cambia la clase si el valor no cambia', () => {
        const { result, rerender } = renderHook(
            ({ val }) => useFlash(val, 'text-green-500', 'text-red-500', 1000),
            { initialProps: { val: 1200 } }
        );

        act(() => {
            rerender({ val: 1200 }); // mismo valor
        });

        expect(result.current).toBe('');
    });

    it('funciona con valores string', () => {
        const { result, rerender } = renderHook(
            ({ val }) => useFlash(val),
            { initialProps: { val: '100' } }
        );

        act(() => {
            rerender({ val: '200' }); // string numéricamente mayor
        });

        // '200' > '100' como número → positivo
        expect(result.current).not.toBe('');
    });

    it('usa las clases por defecto si no se pasan', () => {
        const { result, rerender } = renderHook(
            ({ val }) => useFlash(val),
            { initialProps: { val: 50 } }
        );

        act(() => {
            rerender({ val: 100 });
        });

        expect(result.current).toContain('text-green-500');
    });

    it('usa duración personalizada', () => {
        const shortDuration = 200;
        const { result, rerender } = renderHook(
            ({ val }) => useFlash(val, 'go', 'down', shortDuration),
            { initialProps: { val: 1 } }
        );

        act(() => { rerender({ val: 2 }); });
        expect(result.current).toBe('go');

        act(() => { vi.advanceTimersByTime(199); });
        expect(result.current).toBe('go'); // todavía activo

        act(() => { vi.advanceTimersByTime(2); }); // total 201ms
        expect(result.current).toBe('');
    });

    it('no deja timers colgados al desmontar', () => {
        const { result, rerender, unmount } = renderHook(
            ({ val }) => useFlash(val, 'go', 'down', 5000),
            { initialProps: { val: 1 } }
        );

        act(() => { rerender({ val: 2 }); });
        expect(result.current).toBe('go');

        // Desmontar antes de que expire el timer → no debe lanzar errores
        unmount();
        act(() => { vi.advanceTimersByTime(10000); });
        // El test pasa si no hay advertencias de "Cannot update state on unmounted component"
    });
});
