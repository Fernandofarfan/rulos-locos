import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DataFreshness } from './DataFreshness';

describe('DataFreshness', () => {
    it('shows the source and age for fresh data', () => {
        render(<DataFreshness source="DolarAPI" updatedAt={Date.now() - 60_000} />);
        expect(screen.getByText(/Fuente: DolarAPI · actualizado hace 1 min/)).toBeInTheDocument();
        expect(screen.queryByText(/datos posiblemente desactualizados/)).not.toBeInTheDocument();
    });
    it('warns when data is stale or missing', () => {
        const { rerender } = render(<DataFreshness source="DolarAPI" updatedAt={Date.now() - 600_000} />);
        expect(screen.getByText(/datos posiblemente desactualizados/)).toBeInTheDocument();
        rerender(<DataFreshness source="DolarAPI" updatedAt={undefined} />);
        expect(screen.getByText(/sin fecha de actualización/)).toBeInTheDocument();
    });
});
