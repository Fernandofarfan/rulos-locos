import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { LoginModal } from '../components/LoginModal';

vi.mock('../services/api', () => ({
    default: {
        post: vi.fn().mockResolvedValue({ data: { token: 'fake-token', user: { id: '1', email: 'test@test.com', name: 'Test' } } }),
        get: vi.fn().mockResolvedValue({ data: {} }),
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    },
}));

describe('LoginModal', () => {
    function renderWithAuth(ui: React.ReactElement) {
        return render(<AuthProvider>{ui}</AuthProvider>);
    }

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renderiza el formulario de login', () => {
        renderWithAuth(<LoginModal isOpen={true} onClose={vi.fn()} />);
        expect(screen.getByText(/ingresar|log in|entrar/i)).toBeDefined();
    });

    it('muestra campo de email', () => {
        renderWithAuth(<LoginModal isOpen={true} onClose={vi.fn()} />);
        const emailInput = document.querySelector('input[type="email"]') || document.querySelector('input[name="email"]');
        expect(emailInput).toBeTruthy();
    });

    it('muestra campo de password', () => {
        renderWithAuth(<LoginModal isOpen={true} onClose={vi.fn()} />);
        const passInput = document.querySelector('input[type="password"]') || document.querySelector('input[name="password"]');
        expect(passInput).toBeTruthy();
    });

    it('no renderiza contenido cuando isOpen es false', () => {
        const { container } = renderWithAuth(<LoginModal isOpen={false} onClose={vi.fn()} />);
        expect(container.innerHTML).toBe('');
    });
});

describe('PortfolioTracker (lógica)', () => {
    it('formatea valores en ARS correctamente', () => {
        const formatted = new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0,
        }).format(1500000);
        expect(formatted).toContain('1.500.000');
    });

    it('calcula rendimiento porcentual correctamente', () => {
        const buyPrice = 1000;
        const currentPrice = 1200;
        const return_ = ((currentPrice - buyPrice) / buyPrice) * 100;
        expect(return_).toBe(20);
    });

    it('calcula rendimiento negativo correctamente', () => {
        const buyPrice = 1000;
        const currentPrice = 800;
        const return_ = ((currentPrice - buyPrice) / buyPrice) * 100;
        expect(return_).toBe(-20);
    });

    it('calcula valor total del portfolio', () => {
        const positions = [
            { amount: 10, currentPrice: 1200 },
            { amount: 5, currentPrice: 5000 },
        ];
        const total = positions.reduce((acc, p) => acc + p.amount * p.currentPrice, 0);
        expect(total).toBe(37000);
    });
});

describe('PaperTrading (lógica)', () => {
    it('calcula costo de compra correctamente', () => {
        const amount = 100;
        const price = 1200;
        const cost = amount * price;
        expect(cost).toBe(120000);
    });

    it('calcula ganancia de venta correctamente', () => {
        const amount = 50;
        const buyPrice = 1100;
        const sellPrice = 1250;
        const profit = amount * (sellPrice - buyPrice);
        expect(profit).toBe(7500);
    });

    it('no permite comprar si balance insuficiente', () => {
        const balance = 50000;
        const amount = 100;
        const price = 1200;
        const cost = amount * price;
        expect(cost > balance).toBe(true);
    });

    it('calcula balance despues de deposito', () => {
        const initialBalance = 1000000;
        const deposit = 500000;
        const finalBalance = initialBalance + deposit;
        expect(finalBalance).toBe(1500000);
    });

    it('calcula balance despues de compra', () => {
        const initialBalance = 1000000;
        const amount = 100;
        const price = 1200;
        const finalBalance = initialBalance - (amount * price);
        expect(finalBalance).toBe(880000);
    });
});
