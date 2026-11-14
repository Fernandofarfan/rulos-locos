import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useArbitrageStream } from './useRealtime';

describe('shared polling', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('shares requests and pauses while hidden', async () => {
        vi.useFakeTimers();
        let hidden = false;
        vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ opportunities: [], dolares: {} }) });
        vi.stubGlobal('fetch', fetchMock);
        const first = vi.fn();
        const second = vi.fn();
        const a = renderHook(() => useArbitrageStream(first));
        const b = renderHook(() => useArbitrageStream(second));
        await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(first).toHaveBeenCalledTimes(1);
        expect(second).toHaveBeenCalledTimes(1);
        hidden = true;
        await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        hidden = false;
        await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
        expect(fetchMock).toHaveBeenCalledTimes(2);
        a.unmount();
        b.unmount();
    });
});
