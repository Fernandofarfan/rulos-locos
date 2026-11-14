export function annualRealRate(tna: number, annualInflation: number): number {
    const effectiveRate = Math.pow(1 + tna / 1200, 12);
    return (effectiveRate / (1 + annualInflation / 100) - 1) * 100;
}
