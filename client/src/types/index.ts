export interface PriceData {
    bid: number;
    ask: number;
    totalBid: number;
    totalAsk: number;
    source: string;
}

export interface ArbitrageOpportunity {
    type: string;
    description: string;
    buyIn: string;
    buyPrice: number;
    sellIn: string;
    sellPrice: number;
    rentabilidad: number;
    ganancia: number;
    riesgo: string;
}

/** Indicador de inflación retornado por el backend */
export interface InflationData {
    mensual: number;
    interanual: number;
    fecha?: string;
    /** Variación por categoría INDEC (alimentos, indumentaria, etc.) */
    categorias?: Record<string, number> | null;
}

/** Acción del Merval */
export interface StockItem {
    ticker: string;
    name: string;
    price: number;
    change: number;
    vol?: string;
}

/** CEDEAR cotizado en pesos */
export interface CedearItem {
    ticker: string;
    name: string;
    price: number;
    change: number;
    ccl?: number;
}

/** Bono soberano */
export interface BondItem {
    ticker: string;
    parity: number;
    irr?: number;
    change?: number;
}

/** Índice bursátil global (S&P500, Nasdaq, etc.) */
export interface GlobalIndex {
    ticker: string;
    name: string;
    price: number;
    change: number;
}

/** Snapshot completo del dashboard (respuesta de /api/economics/dashboard) */
export interface DashboardData {
    macro: {
        inflation: InflationData;
        /** Riesgo país en puntos básicos */
        risk: number;
        /** Reservas netas del BCRA en millones de USD */
        reserves: number;
        /** Base monetaria en pesos */
        baseMonetaria: number;
        /** Dólar de equilibrio calculado (Base / Reservas) */
        dolarEquilibrio: number;
    };
    market: {
        merval: StockItem[];
        cedears: CedearItem[];
        bonds: BondItem[];
    };
    /** Índices bursátiles globales (S&P500, Nasdaq, Dow Jones…) */
    global: GlobalIndex[];
    timestamp: string;
}

export interface SpreadHistoryPoint {
    time: string;
    value: number;
    timestamp: number;
}

