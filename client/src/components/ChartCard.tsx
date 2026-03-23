import React, { useState, useEffect } from 'react';
import { Maximize2, X, Activity, Download, CandlestickChart as CandleIcon, TrendingUp, BarChart2, Layers, Activity as ActivityIcon, BarChart3, Bot, Sparkles } from 'lucide-react';
import { apiService } from '../services/api';
import CandlestickChart from './CandlestickChart';
import { ErrorCard } from './ui/ErrorCard';
import { Tooltip } from './ui/Tooltip';

interface ChartCardProps {
    title: string;
    indicator: string;
    color?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, indicator, color = '#3b82f6' }) => {
    const [data, setData] = useState<any>(null);
    const [range, setRange] = useState('1Y');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dolarType, setDolarType] = useState('blue');
    const [isExpanded, setIsExpanded] = useState(false);
    const [showCandles, setShowCandles] = useState(false);
    const [showEMA, setShowEMA] = useState(false);
    const [showBollinger, setShowBollinger] = useState(false);
    const [showRSI, setShowRSI] = useState(false);
    const [showMACD, setShowMACD] = useState(false);
    const [showVolume, setShowVolume] = useState(false);
    const [chartInsight, setChartInsight] = useState('');
    const [loadingInsight, setLoadingInsight] = useState(false);
    const [showInsightModal, setShowInsightModal] = useState(false);

    const ranges = ['1M', '3M', '6M', '1Y', 'ALL'];

    const fetchChartData = async () => {
        setLoading(true);
        try {
            const actualIndicator = indicator === 'blue' ? dolarType : indicator;
            const historical = await apiService.getHistorical(actualIndicator, range);
            setData(historical);
        } catch (err: any) {
            console.error('Error fetching chart:', err);
            setError(err.message || 'Error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChartData();
    }, [indicator, range, dolarType]);

    // Slice data based on range
    const getSlicedData = () => {
        if (!data?.values?.length) return { labels: [], values: [] };
        const total = data.values.length;
        const isMonthly = indicator === 'inflation';
        const sliceMap: Record<string, number> = {
            '1M': isMonthly ? 6 : 30,
            '3M': isMonthly ? 12 : 90,
            '6M': isMonthly ? 24 : 180,
            '1Y': isMonthly ? 48 : 365,
            'ALL': total,
        };
        const count = sliceMap[range] ?? total;
        const start = Math.max(0, total - count);
        return {
            labels: data.labels.slice(start),
            values: data.values.slice(start),
        };
    };

    const { labels, values } = getSlicedData();

    const isDollarChart = ['blue', 'mep', 'ccl', 'oficial'].includes(indicator) || ['blue', 'mep', 'ccl', 'oficial'].includes(dolarType);

    const syntheticVolumes = values.map((val: number, i: number) => {
        const prev = i > 0 ? values[i - 1] : val;
        const diff = Math.abs(val - prev);
        const baseVol = indicator === 'blue' || isDollarChart ? 1000000 : 10000;
        return baseVol + (diff * (baseVol * 0.05)) + (Math.abs(Math.sin(i)) * (baseVol * 0.2));
    });

    // CSV Export
    const downloadCSV = () => {
        if (!data?.labels?.length) return;
        const { labels: l, values: v } = getSlicedData();
        const csvContent = 'data:text/csv;charset=utf-8,Fecha,Valor\n'
            + l.map((label: string, i: number) => `${label},${v[i]}`).join('\n');
        const link = document.createElement('a');
        link.href = encodeURI(csvContent);
        link.download = `${title.replace(/\s+/g, '_').toLowerCase()}_data.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const fetchChartInsight = async () => {
        if (loadingInsight) return;
        setShowInsightModal(true);
        if (chartInsight) return; // already fetched

        setLoadingInsight(true);
        try {
            const res = await apiService.post('/ai/chart-insight', {
                labels: labels,
                values: values,
                assetName: indicator === 'blue' ? dolarType : title
            });
            setChartInsight((res as any).insight);
        } catch (error) {
            setChartInsight('No se pudo analizar el gráfico en este momento. Verifique su conexión y la API key configurada.');
        } finally {
            setLoadingInsight(false);
        }
    };

    // Display latest value
    const latestValue = values.length
        ? indicator === 'inflation'
            ? `${values[values.length - 1]}%`
            : indicator === 'risk'
                ? `${Math.round(values[values.length - 1])} pts`
                : `$ ${values[values.length - 1]}`
        : '---';


    return (
        <>
            <div className="glass-panel no-lift p-6 flex flex-col h-[350px] relative overflow-hidden group">
                {/* Header */}
                <div className="flex items-start justify-between mb-4 relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded-lg" style={{ background: `${color}20` }}>
                                <Activity size={14} style={{ color }} />
                            </div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                                {title}
                            </h3>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <div className="text-3xl font-black text-white tracking-tight">
                                {error
                                    ? <ErrorCard type="network" variant="inline" onRetry={fetchChartData} />
                                    : loading ? '---' : latestValue
                                }
                            </div>
                            {indicator === 'blue' && (
                                <select
                                    value={dolarType}
                                    onChange={(e) => setDolarType(e.target.value)}
                                    className="bg-white/5 text-[10px] text-slate-400 p-1 rounded-lg border border-white/5 outline-none focus:border-accent-primary/50 focus:text-white transition-colors uppercase font-bold tracking-wider cursor-pointer hover:bg-white/10"
                                >
                                    <option value="blue">Blue</option>
                                    <option value="mep">MEP</option>
                                    <option value="ccl">CCL</option>
                                    <option value="oficial">Oficial</option>
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        {isDollarChart && (
                            <Tooltip content={showCandles ? 'Cambiar a Área' : 'Cambiar a Velas'}>
                                <button
                                    onClick={() => setShowCandles(!showCandles)}
                                    className={`p-2 rounded-xl transition-colors ${showCandles ? 'bg-accent-secondary/20 text-accent-secondary' : 'hover:bg-white/5 text-slate-500 hover:text-white'}`}
                                >
                                    <CandleIcon size={16} />
                                </button>
                            </Tooltip>
                        )}
                        <Tooltip content={showVolume ? 'Ocultar Volumen' : 'Mostrar Volumen'}>
                            <button
                                onClick={() => setShowVolume(!showVolume)}
                                className={`p-2 rounded-xl transition-colors ${showVolume ? 'bg-teal-500/20 text-teal-400' : 'hover:bg-white/5 text-slate-500 hover:text-white'}`}
                            >
                                <BarChart3 size={16} />
                            </button>
                        </Tooltip>
                        <Tooltip content={showEMA ? 'Ocultar EMA(20)' : 'Mostrar EMA(20)'}>
                            <button
                                onClick={() => setShowEMA(!showEMA)}
                                aria-label={showEMA ? 'Ocultar EMA 20' : 'Mostrar EMA 20'}
                                className={`p-2 rounded-xl transition-colors ${showEMA ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-white/5 text-slate-500 hover:text-white'}`}
                            >
                                <TrendingUp size={16} />
                            </button>
                        </Tooltip>
                        <Tooltip content={showBollinger ? 'Ocultar Bollinger' : 'Mostrar Bollinger'}>
                            <button
                                onClick={() => setShowBollinger(!showBollinger)}
                                aria-label={showBollinger ? 'Ocultar Bollinger' : 'Mostrar Bollinger'}
                                className={`p-2 rounded-xl transition-colors ${showBollinger ? 'bg-sky-500/20 text-sky-400' : 'hover:bg-white/5 text-slate-500 hover:text-white'}`}
                            >
                                <Layers size={16} />
                            </button>
                        </Tooltip>
                        <Tooltip content={showRSI ? 'Ocultar RSI(14)' : 'Mostrar RSI(14)'}>
                            <button
                                onClick={() => setShowRSI(!showRSI)}
                                aria-label={showRSI ? 'Ocultar RSI 14' : 'Mostrar RSI 14'}
                                className={`p-2 rounded-xl transition-colors ${showRSI ? 'bg-violet-500/20 text-violet-400' : 'hover:bg-white/5 text-slate-500 hover:text-white'}`}
                            >
                                <BarChart2 size={16} />
                            </button>
                        </Tooltip>
                        <Tooltip content={showMACD ? 'Ocultar MACD' : 'Mostrar MACD'}>
                            <button
                                onClick={() => setShowMACD(!showMACD)}
                                aria-label={showMACD ? 'Ocultar MACD' : 'Mostrar MACD'}
                                className={`p-2 rounded-xl transition-colors ${showMACD ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-white/5 text-slate-500 hover:text-white'}`}
                            >
                                <ActivityIcon size={16} />
                            </button>
                        </Tooltip>
                        <Tooltip content="Analizar con IA (Gemini)">
                            <button
                                onClick={fetchChartInsight}
                                aria-label="Analizar con IA"
                                className={`p-2 rounded-xl transition-colors ${showInsightModal ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'hover:bg-indigo-500/10 text-indigo-300 border border-transparent hover:border-indigo-500/30'} flex items-center justify-center`}
                            >
                                <Bot size={16} />
                            </button>
                        </Tooltip>
                        <Tooltip content="Ampliar gráfico">
                            <button
                                onClick={() => setIsExpanded(true)}
                                aria-label="Ampliar gráfico"
                                className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-colors group-hover:bg-white/10"
                            >
                                <Maximize2 size={16} />
                            </button>
                        </Tooltip>
                    </div>
                </div>

                {/* Chart Area */}
                <div className="flex-1 relative overflow-hidden">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
                        </div>
                    ) : labels.length > 0 ? (
                        <CandlestickChart
                            labels={labels}
                            values={values}
                            color={color}
                            height={200}
                            indicator={dolarType !== 'blue' ? dolarType : indicator}
                            showCandles={showCandles}
                            showEMA={showEMA}
                            showBollinger={showBollinger}
                            showRSI={showRSI}
                            showMACD={showMACD}
                            showVolume={showVolume}
                            volumes={syntheticVolumes}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-600 text-xs">Sin datos</div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-2 pt-3 flex items-center justify-center relative z-20">
                    <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/5 backdrop-blur-md">
                        {ranges.map(r => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${range === r ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>

                {/* AI Insight Overlay */}
                {showInsightModal && !isExpanded && (
                    <div className="absolute inset-0 z-30 bg-slate-900/95 backdrop-blur-sm p-6 flex flex-col justify-center animate-fade-in border border-indigo-500/20 rounded-2xl">
                        <button onClick={() => setShowInsightModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                            <X size={20} />
                        </button>
                        <div className="flex items-center gap-2 mb-4">
                            <Bot className="text-indigo-400 animate-pulse" size={24} />
                            <h3 className="text-lg font-bold text-white">Análisis IA</h3>
                        </div>
                        {loadingInsight ? (
                            <div className="space-y-3">
                                <div className="h-4 bg-slate-800 rounded w-full animate-pulse"></div>
                                <div className="h-4 bg-slate-800 rounded w-5/6 animate-pulse"></div>
                                <div className="h-4 bg-slate-800 rounded w-4/6 animate-pulse"></div>
                            </div>
                        ) : (
                            <div className="text-sm text-slate-300 leading-relaxed overflow-y-auto max-h-full pr-2 custom-scrollbar">
                                {chartInsight}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Expanded Modal */}
            {isExpanded && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-6 animate-fade-in">
                    <div className="bg-[#0b0e14] w-full max-w-6xl h-[80vh] rounded-3xl border border-white/10 p-6 flex flex-col shadow-2xl relative overflow-hidden">
                        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none" style={{ background: `${color}08` }} />
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
                                    {title}
                                    <span className="text-xs bg-white/5 px-2 py-1 rounded-md text-slate-400 font-normal border border-white/5">Vista Detallada</span>
                                </h2>
                            </div>
                            <div className="flex items-center gap-2">
                                {isDollarChart && (
                                    <button
                                        onClick={() => setShowCandles(!showCandles)}
                                        className={`p-2 rounded-xl border transition-colors flex items-center gap-2 px-3 text-sm font-bold ${showCandles ? 'bg-accent-secondary/20 text-accent-secondary border-accent-secondary/30' : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <CandleIcon size={16} />
                                        {showCandles ? 'Área' : 'Velas'}
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowVolume(!showVolume)}
                                    className={`p-2 rounded-xl border transition-colors flex items-center gap-2 px-3 text-sm font-bold ${showVolume ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    <BarChart3 size={16} />
                                    Volumen
                                </button>
                                <button
                                    onClick={() => setShowEMA(!showEMA)}
                                    className={`p-2 rounded-xl border transition-colors flex items-center gap-2 px-3 text-sm font-bold ${showEMA ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    <TrendingUp size={16} />
                                    EMA(20)
                                </button>
                                <button
                                    onClick={() => setShowBollinger(!showBollinger)}
                                    className={`p-2 rounded-xl border transition-colors flex items-center gap-2 px-3 text-sm font-bold ${showBollinger ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    <Layers size={16} />
                                    BB(20)
                                </button>
                                <button
                                    onClick={() => setShowRSI(!showRSI)}
                                    className={`p-2 rounded-xl border transition-colors flex items-center gap-2 px-3 text-sm font-bold ${showRSI ? 'bg-violet-500/20 text-violet-400 border-violet-500/30' : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    <BarChart2 size={16} />
                                    RSI(14)
                                </button>
                                <button
                                    onClick={() => setShowMACD(!showMACD)}
                                    className={`p-2 rounded-xl border transition-colors flex items-center gap-2 px-3 text-sm font-bold ${showMACD ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    <ActivityIcon size={16} />
                                    MACD
                                </button>
                                <Tooltip content="Descargar CSV" placement="bottom">
                                    <button
                                        onClick={downloadCSV}
                                        className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors flex items-center gap-2 px-4 border border-white/5"
                                    >
                                        <Download size={18} />
                                        <span className="text-xs font-bold uppercase hidden md:inline">Exportar CSV</span>
                                    </button>
                                </Tooltip>
                                <Tooltip content="Analizar con IA" placement="bottom">
                                    <button
                                        onClick={fetchChartInsight}
                                        className="p-2 hover:bg-indigo-500/20 rounded-full text-indigo-400 transition-colors flex items-center gap-2 px-4 border border-indigo-500/20"
                                    >
                                        <Bot size={18} />
                                        <span className="text-xs font-bold uppercase hidden md:inline">IA</span>
                                    </button>
                                </Tooltip>
                                <button
                                    onClick={() => {
                                        setIsExpanded(false);
                                        setShowInsightModal(false);
                                    }}
                                    aria-label="Cerrar vista ampliada"
                                    className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 bg-white/[0.02] rounded-2xl p-4 border border-white/5 relative z-10 overflow-hidden">
                            {!loading && labels.length > 0 ? (
                                <CandlestickChart
                                    labels={labels}
                                    values={values}
                                    color={color}
                                    height={420}
                                    indicator={dolarType !== 'blue' ? dolarType : indicator}
                                    showCandles={showCandles}
                                    showEMA={showEMA}
                                    showBollinger={showBollinger}
                                    showRSI={showRSI}
                                    showMACD={showMACD}
                                    showVolume={showVolume}
                                    volumes={syntheticVolumes}
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-10 h-10 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
                                </div>
                            )}
                            {/* AI Insight Expanded Overlay */}
                            {showInsightModal && (
                                <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md p-8 flex flex-col items-center justify-center animate-fade-in rounded-2xl">
                                    <div className="max-w-3xl w-full">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-indigo-500/20 rounded-xl">
                                                    <Bot className="text-indigo-400" size={32} />
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-bold text-white">Análisis con Inteligencia Artificial</h3>
                                                    <p className="text-slate-400 text-sm">Rulo Bot está analizando {title}...</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setShowInsightModal(false)} className="text-slate-500 hover:text-white p-2">
                                                <X size={24} />
                                            </button>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
                                            {loadingInsight ? (
                                                <div className="flex flex-col items-center py-12">
                                                    <Sparkles size={40} className="text-indigo-400 animate-pulse mb-4" />
                                                    <p className="text-slate-400 animate-pulse text-lg">Procesando tendencias recientes...</p>
                                                </div>
                                            ) : (
                                                <div className="text-base text-slate-300 leading-loose prose prose-invert">
                                                    {chartInsight.split('\n').map((para, i) => (
                                                        <p key={i} className="mb-4">{para}</p>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
