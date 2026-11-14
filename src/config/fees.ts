import { z } from 'zod';

// Valores de referencia, no tarifas garantizadas. Los porcentajes se expresan en puntos porcentuales.
export const referenceFees = {
    brokerBuyPct: 0.48, // https://www.galicia.ar/personas/inversiones/dolar-mep
    brokerSellPct: 0.48, // https://www.galicia.ar/personas/inversiones/dolar-mep
    marketRightsPct: 0.01, // https://www.galicia.ar/personas/inversiones/dolar-mep
    bankTransferPct: 0, // https://balanz.com/comisiones/
    exchangeTradePct: 0.1, // https://www.binance.com/en/support/faq/what-is-binance-spot-trading-fee-and-how-to-calculate-e85d6e703b874674840122196b89780a
    p2pPct: 0, // https://p2p.binance.com/en-GB/
    withdrawalUsdt: 1, // https://support.poloniex.com/hc/en-us/articles/13684222956055-Poloniex-Will-Adjust-the-TRON-TRX-Network-Withdrawal-Fees
    taxPct: 0, // https://www.galicia.ar/personas/inversiones/dolar-mep
} as const;

const percent = z.number().finite().min(0).max(100);
export const feeOverrideSchema = z.object({
    brokerBuyPct: percent, brokerSellPct: percent, marketRightsPct: percent,
    bankTransferPct: percent, exchangeTradePct: percent, p2pPct: percent,
    withdrawalUsdt: z.number().finite().min(0).max(1000), taxPct: percent,
}).strict().partial();

export type FeeOverride = z.infer<typeof feeOverrideSchema>;
export type Fees = { [K in keyof typeof referenceFees]: number };

export function parseFeeOverride(value: string | undefined): FeeOverride {
    if (!value) return {};
    if (value.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Comisiones inválidas');
    try {
        const fees = feeOverrideSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
        if ((fees.brokerSellPct ?? referenceFees.brokerSellPct) + (fees.marketRightsPct ?? referenceFees.marketRightsPct) > 100) {
            throw new Error('Comisiones inválidas');
        }
        return fees;
    } catch {
        throw new Error('Comisiones inválidas');
    }
}
