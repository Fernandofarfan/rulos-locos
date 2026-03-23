import api from './api';

export interface VirtualBalance {
    id: string;
    currency: string;
    amount: number;
    updatedAt: string;
}

export const paperTradingApi = {
    // Inicializa el bono de 1M de pesos
    initBalance: async (): Promise<VirtualBalance[]> => {
        const { data } = await api.get('/paper-trading/balance');
        return data;
    },

    // Compra / Vende simulando al instante
    trade: async (type: 'BUY' | 'SELL', asset: string, amount: number, price: number): Promise<VirtualBalance[]> => {
        const { data } = await api.post('/paper-trading/trade', { type, asset, amount, price });
        return data;
    }
};
