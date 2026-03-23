import React, { useEffect, useRef, memo } from 'react';
import { createChart, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import { calcEMA, calcRSI, calcBollingerBands, calcMACD, toChartData, normalizeDate } from '../utils/indicators';

interface CandlestickChartProps {
    labels: string[];
    values: number[];
    color: string;
    height?: number;
    indicator?: string;
    showCandles?: boolean;
    /** Mostrar EMA(20) superpuesta sobre el gráfico principal */
    showEMA?: boolean;
    /** Mostrar Bandas de Bollinger superpuestas */
    showBollinger?: boolean;
    /** Mostrar panel RSI(14) debajo del gráfico principal */
    /** Mostrar panel RSI(14) debajo del gráfico principal */
    showRSI?: boolean;
    /** Mostrar panel MACD debajo del gráfico principal */
    showMACD?: boolean;
    /** Array de volúmenes (si aplica) */
    volumes?: number[];
    /** Mostrar histograma de volumen */
    showVolume?: boolean;
}

const RSI_HEIGHT = 90;

// Opciones base compartidas para todos los gráficos lightweight-charts
function baseChartOptions(width: number, height: number) {
    return {
        width,
        height,
        layout: {
            background: { color: 'transparent' } as never,
            textColor: '#94a3b8',
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
        },
        grid: {
            vertLines: { color: 'rgba(255,255,255,0.03)' },
            horzLines: { color: 'rgba(255,255,255,0.03)' },
        },
        crosshair: {
            vertLine: { color: 'rgba(255,255,255,0.2)', width: 1 as never, style: 3 as never, labelBackgroundColor: '#1e2535' },
            horzLine: { color: 'rgba(255,255,255,0.2)', width: 1 as never, style: 3 as never, labelBackgroundColor: '#1e2535' },
        },
        rightPriceScale: { borderColor: 'rgba(255,255,255,0.05)', textColor: '#64748b', visible: true },
        timeScale: { borderColor: 'rgba(255,255,255,0.05)', timeVisible: false, fixLeftEdge: true, fixRightEdge: true },
        handleScroll: { mouseWheel: false, pressedMouseMove: false },
        handleScale: { mouseWheel: false, pinch: false },
    };
}

const CandlestickChart: React.FC<CandlestickChartProps> = ({
    labels,
    values,
    color,
    height = 200,
    indicator = '',
    showCandles = false,
    showEMA = false,
    showBollinger = false,
    showRSI = false,
    showMACD = false,
    volumes = [],
    showVolume = false,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rsiContainerRef = useRef<HTMLDivElement>(null);
    const macdContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const rsiChartRef = useRef<IChartApi | null>(null);
    const macdChartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<never> | null>(null);

    useEffect(() => {
        if (!containerRef.current || !labels?.length || !values?.length) return;

        // Limpiar gráficos anteriores
        chartRef.current?.remove();
        rsiChartRef.current?.remove();
        macdChartRef.current?.remove();
        chartRef.current = null;
        rsiChartRef.current = null;
        macdChartRef.current = null;
        seriesRef.current = null;

        const w = containerRef.current.clientWidth;

        // ── Gráfico principal ──────────────────────────────────────────────────
        const chart = createChart(containerRef.current, baseChartOptions(w, height));
        chartRef.current = chart;

        const isDollar = ['blue', 'mep', 'ccl', 'dolar'].includes(indicator);

        if (showCandles && isDollar) {
            const candleData = labels.map((date, i) => {
                const close = values[i];
                const open = i > 0 ? values[i - 1] : close;
                const diff = Math.abs(close - open);
                const wick = diff * 0.35 + close * 0.001;
                return {
                    time: normalizeDate(date) as never,
                    open: parseFloat(open.toFixed(2)),
                    high: parseFloat((Math.max(open, close) + wick).toFixed(2)),
                    low: parseFloat((Math.min(open, close) - wick).toFixed(2)),
                    close: parseFloat(close.toFixed(2)),
                };
            });
            const s = chart.addCandlestickSeries({
                upColor: '#10b981', downColor: '#ef4444',
                borderVisible: false,
                wickUpColor: '#10b981', wickDownColor: '#ef4444',
            });
            s.setData(candleData);
            seriesRef.current = s as never;
        } else {
            // Área / línea
            const prec = indicator === 'inflation' ? 2 : 0;
            const s = chart.addAreaSeries({
                lineColor: color,
                topColor: `${color}55`,
                bottomColor: `${color}00`,
                lineWidth: 2,
                crosshairMarkerVisible: true,
                crosshairMarkerRadius: 4,
                crosshairMarkerBorderColor: '#fff',
                crosshairMarkerBackgroundColor: color,
                priceFormat: { type: 'price', precision: prec, minMove: prec === 2 ? 0.01 : 1 },
            });
            s.setData(labels.map((date, i) => ({ time: normalizeDate(date) as never, value: parseFloat((values[i] || 0).toFixed(prec === 2 ? 4 : 2)) })));
            seriesRef.current = s as never;
        }

        // ── Volumen (Histograma en gráfico principal) ──────────────────────────
        if (showVolume && volumes.length > 0) {
            const volumeSeries = chart.addHistogramSeries({
                color: '#26a69a',
                priceFormat: { type: 'volume' },
                priceScaleId: '', // Set as an overlay
            });
            chart.priceScale('').applyOptions({
                scaleMargins: {
                    top: 0.8, // highest point of the series will be at 80% of the chart
                    bottom: 0,
                },
            });
            const volData = labels.map((date, i) => {
                const close = values[i];
                const open = i > 0 ? values[i - 1] : close;
                return {
                    time: normalizeDate(date) as never,
                    value: volumes[i] || 0,
                    color: close >= open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
                };
            });
            volumeSeries.setData(volData);
        }

        // ── EMA(20) superpuesta ────────────────────────────────────────────────
        if (showEMA && values.length >= 20) {
            const prec = indicator === 'inflation' ? 2 : 0;
            const emaData = toChartData(labels, calcEMA(values, 20), prec === 2 ? 4 : 2);
            const emaSeries = chart.addLineSeries({
                color: '#f59e0b',
                lineWidth: 2 as never,
                lineStyle: 0 as never,
                crosshairMarkerVisible: false,
                lastValueVisible: true,
                priceLineVisible: false,
                title: 'EMA(20)',
                priceFormat: { type: 'price', precision: prec, minMove: prec === 2 ? 0.01 : 1 },
            });
            emaSeries.setData(emaData as never);
        }

        // ── Bollinger Bands superpuesto ───────────────────────────────────────
        if (showBollinger && values.length >= 20) {
            const prec = indicator === 'inflation' ? 2 : 0;
            const bb = calcBollingerBands(values, 20, 2);

            const upperSeries = chart.addLineSeries({ color: 'rgba(56, 189, 248, 0.4)', lineWidth: 1 as never, crosshairMarkerVisible: false, priceLineVisible: false, lastValueVisible: false });
            const lowerSeries = chart.addLineSeries({ color: 'rgba(56, 189, 248, 0.4)', lineWidth: 1 as never, crosshairMarkerVisible: false, priceLineVisible: false, lastValueVisible: false });

            upperSeries.setData(toChartData(labels, bb.upper, prec === 2 ? 4 : 2) as never);
            lowerSeries.setData(toChartData(labels, bb.lower, prec === 2 ? 4 : 2) as never);
        }

        chart.timeScale().fitContent();

        // ── RSI(14) — panel separado ────────────────────────────────────────────
        if (showRSI && rsiContainerRef.current && values.length >= 15) {
            const rsiChart = createChart(rsiContainerRef.current, {
                ...baseChartOptions(w, RSI_HEIGHT),
                rightPriceScale: {
                    borderColor: 'rgba(255,255,255,0.05)',
                    textColor: '#64748b',
                    visible: true,
                    scaleMargins: { top: 0.1, bottom: 0.1 },
                },
            });
            rsiChartRef.current = rsiChart;

            const rsiData = toChartData(labels, calcRSI(values, 14), 1);
            const rsiSeries = rsiChart.addLineSeries({
                color: '#a78bfa',
                lineWidth: 2 as never,
                crosshairMarkerVisible: false,
                lastValueVisible: true,
                title: 'RSI(14)',
                priceFormat: { type: 'price', precision: 1, minMove: 0.1 },
            });
            rsiSeries.setData(rsiData as never);

            // Líneas de sobrecompra/sobreventa
            rsiSeries.createPriceLine({ price: 70, color: '#f8716188', lineWidth: 1 as never, lineStyle: 2 as never, axisLabelVisible: true, title: '70' });
            rsiSeries.createPriceLine({ price: 30, color: '#34d39988', lineWidth: 1 as never, lineStyle: 2 as never, axisLabelVisible: true, title: '30' });
            rsiSeries.createPriceLine({ price: 50, color: '#ffffff18', lineWidth: 1 as never, lineStyle: 3 as never, axisLabelVisible: false, title: '' });

            rsiChart.timeScale().fitContent();
        }

        // ── MACD — panel separado ───────────────────────────────────────────────
        if (showMACD && macdContainerRef.current && values.length >= 26) {
            const macdChart = createChart(macdContainerRef.current, {
                ...baseChartOptions(w, RSI_HEIGHT),
                rightPriceScale: { borderColor: 'rgba(255,255,255,0.05)', textColor: '#64748b', visible: true, scaleMargins: { top: 0.1, bottom: 0.1 } },
            });
            macdChartRef.current = macdChart;

            const macdOpts = calcMACD(values, 12, 26, 9);

            const macdSeries = macdChart.addLineSeries({ color: '#3b82f6', lineWidth: 2 as never, crosshairMarkerVisible: false, lastValueVisible: true, title: 'MACD' });
            macdSeries.setData(toChartData(labels, macdOpts.macd, 2) as never);

            const signalSeries = macdChart.addLineSeries({ color: '#f59e0b', lineWidth: 1 as never, crosshairMarkerVisible: false, lastValueVisible: false, title: 'Signal' });
            signalSeries.setData(toChartData(labels, macdOpts.signal, 2) as never);

            // Histograma
            const histSeries = macdChart.addHistogramSeries({
                color: '#ef4444', priceFormat: { type: 'price' }, priceLineVisible: false, lastValueVisible: false
            });
            const histData = toChartData(labels, macdOpts.histogram, 2).map((d) => ({
                ...d, color: d.value >= 0 ? '#10b98188' : '#ef444488'
            }));
            histSeries.setData(histData as never);

            macdChart.timeScale().fitContent();
        }

        // ── ResizeObserver ─────────────────────────────────────────────────────
        const ro = new ResizeObserver(() => {
            const newW = containerRef.current?.clientWidth ?? w;
            chartRef.current?.applyOptions({ width: newW });
            rsiChartRef.current?.applyOptions({ width: newW });
            macdChartRef.current?.applyOptions({ width: newW });
        });
        ro.observe(containerRef.current);

        return () => {
            ro.disconnect();
            chartRef.current?.remove();
            rsiChartRef.current?.remove();
            macdChartRef.current?.remove();
            chartRef.current = null;
            rsiChartRef.current = null;
            macdChartRef.current = null;
            seriesRef.current = null;
        };
    }, [labels, values, color, height, indicator, showCandles, showEMA, showBollinger, showRSI, showMACD, volumes, showVolume]);

    return (
        <div className="w-full">
            <div ref={containerRef} className="w-full" style={{ height }} />
            {showRSI && values.length >= 15 && (
                <div className="mt-1 border-t border-white/5 pt-1">
                    <div className="flex items-center gap-2 mb-0.5 px-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-violet-400">RSI(14)</span>
                        <span className="text-[8px] text-slate-600">· &gt;70 sobrecomprado · &lt;30 sobrevendido</span>
                    </div>
                    <div ref={rsiContainerRef} className="w-full" style={{ height: RSI_HEIGHT }} />
                </div>
            )}
            {showMACD && values.length >= 26 && (
                <div className="mt-1 border-t border-white/5 pt-1">
                    <div className="flex items-center gap-2 mb-0.5 px-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400">MACD(12,26,9)</span>
                    </div>
                    <div ref={macdContainerRef} className="w-full" style={{ height: RSI_HEIGHT }} />
                </div>
            )}
        </div>
    );
};

export default memo(CandlestickChart);
