import React, { useState, useCallback } from 'react';
import { FileDown, X, Printer } from 'lucide-react';
import { apiService } from '../services/api';

interface ReportData {
    rate?: any;
    dolares?: any;
    economics?: any;
    rates?: any;
    timestamp: string;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-6 print:mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-700 pb-1 mb-3 print:text-slate-700 print:border-slate-300">
            {title}
        </h3>
        {children}
    </div>
);

const KPI: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
    <div className="text-center p-3 bg-slate-50 dark:bg-white/5 rounded-lg print:bg-slate-50 print:border print:border-slate-200">
        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1 print:text-slate-500">{label}</div>
        <div className="text-lg font-black text-slate-900 dark:text-white print:text-slate-900">{value}</div>
        {sub && <div className="text-[9px] text-slate-500 mt-0.5 print:text-slate-400">{sub}</div>}
    </div>
);

export const PDFExport: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        const [rateRes, arbRes, ecoRes, ratesRes] = await Promise.allSettled([
            apiService.getRate(),
            apiService.getArbitrage(),
            apiService.getEconomics(),
            apiService.getRates(),
        ]);
        setData({
            rate: rateRes.status === 'fulfilled' ? rateRes.value : null,
            dolares: arbRes.status === 'fulfilled' ? (arbRes.value as any)?.dolares : null,
            economics: ecoRes.status === 'fulfilled' ? ecoRes.value : null,
            rates: ratesRes.status === 'fulfilled' ? ratesRes.value : null,
            timestamp: new Date().toLocaleString('es-AR'),
        });
        setLoading(false);
    }, []);

    const handleOpen = async () => {
        setOpen(true);
        await fetchReport();
    };

    const handlePrint = () => {
        window.print();
    };

    const d = data?.dolares;
    const eco = data?.economics;
    const rates = data?.rates;

    return (
        <>
            {/* Trigger button — fixed bottom right */}
            <button
                onClick={handleOpen}
                disabled={loading}
                aria-label={loading ? 'Preparando reporte…' : 'Exportar Reporte PDF'}
                className="fixed bottom-20 left-6 z-50 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-70 disabled:cursor-wait text-white font-bold px-4 py-3 rounded-2xl shadow-2xl shadow-blue-500/30 transition-all hover:scale-105 active:scale-95 border border-white/20"
            >
                {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <FileDown size={18} />
                )}
                <span className="text-sm hidden sm:inline">{loading ? 'Cargando…' : 'Reporte PDF'}</span>
            </button>

            {/* Modal */}
            {open && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-start justify-center p-4 pt-8 overflow-y-auto">
                    {/* Print-only styles */}
                    <style>{`
                        @media print {
                            body > * { display: none !important; }
                            #pdf-report-container { display: block !important; }
                            #pdf-report-container .no-print { display: none !important; }
                            @page { margin: 1.5cm; size: A4; }
                        }
                    `}</style>

                    <div
                        id="pdf-report-container"
                        className="bg-white dark:bg-[#0b0e14] w-full max-w-3xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden"
                    >
                        {/* Modal header (hidden in print) */}
                        <div className="no-print flex items-center justify-between p-5 border-b border-white/10 bg-white/[0.02]">
                            <div className="flex items-center gap-2">
                                <FileDown size={18} className="text-blue-400" />
                                <span className="font-bold text-white">Vista Previa del Reporte</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handlePrint}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-colors"
                                >
                                    <Printer size={16} />
                                    Imprimir / Guardar PDF
                                </button>
                                <button onClick={() => setOpen(false)} className="p-2 hover:bg-white/10 rounded-xl text-slate-400">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Report Content */}
                        <div className="p-8 print:p-6 space-y-2">
                            {/* Report Header */}
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-white/10 print:border-slate-300">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-2xl">⚡</span>
                                        <h1 className="text-xl font-black text-slate-900 dark:text-white print:text-slate-900">Rulos Locos Pro</h1>
                                    </div>
                                    <p className="text-xs text-slate-500 print:text-slate-500">Reporte Macroeconómico Argentina</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-bold text-slate-500 print:text-slate-500 uppercase tracking-wider">Generado el</div>
                                    <div className="text-sm font-mono text-slate-700 dark:text-slate-300 print:text-slate-700">{data?.timestamp}</div>
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center py-20">
                                    <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                                </div>
                            ) : (
                                <>
                                    {/* Tipo de Cambio */}
                                    <Section title="Tipo de Cambio">
                                        <div className="grid grid-cols-4 gap-2">
                                            <KPI label="Dólar Blue" value={`$${d?.blue?.venta?.toFixed(0) ?? '---'}`} sub="Venta" />
                                            <KPI label="Dólar MEP" value={`$${d?.mep?.venta?.toFixed(0) ?? '---'}`} sub="Venta" />
                                            <KPI label="Dólar CCL" value={`$${d?.ccl?.venta?.toFixed(0) ?? '---'}`} sub="Venta" />
                                            <KPI label="Dólar Oficial" value={`$${d?.oficial?.venta?.toFixed(0) ?? '---'}`} sub="Venta" />
                                        </div>
                                        {d?.oficial?.venta && d?.blue?.venta && (
                                            <p className="text-xs text-slate-500 mt-2 print:text-slate-500">
                                                Brecha Blue/Oficial: <strong>{(((d.blue.venta / d.oficial.venta) - 1) * 100).toFixed(1)}%</strong>
                                                {' · '}Brecha MEP/Oficial: <strong>{(((d.mep?.venta / d.oficial.venta) - 1) * 100).toFixed(1)}%</strong>
                                            </p>
                                        )}
                                    </Section>

                                    {/* Macro */}
                                    <Section title="Indicadores Macroeconómicos">
                                        <div className="grid grid-cols-3 gap-2">
                                            <KPI label="Inflación Mensual" value={eco?.macro?.inflacion?.mensual != null ? `${eco.macro.inflacion.mensual}%` : '---'} />
                                            <KPI label="Inflación Interanual" value={eco?.macro?.inflacion?.interanual != null ? `${eco.macro.inflacion.interanual}%` : '---'} />
                                            <KPI label="Riesgo País" value={eco?.macro?.risk != null ? `${eco.macro.risk} pb` : '---'} sub="J.P. Morgan EMBI" />
                                        </div>
                                    </Section>

                                    {/* Tasas */}
                                    {rates && (
                                        <Section title="Tasas de Interés">
                                            <div className="grid grid-cols-4 gap-2">
                                                <KPI label="BADLAR TNA" value={rates.badlar?.tna != null ? `${rates.badlar.tna.toFixed(1)}%` : '---'} />
                                                <KPI label="BADLAR TEM" value={rates.badlar?.tem != null ? `${rates.badlar.tem.toFixed(2)}%` : '---'} />
                                                <KPI label="Plazo Fijo TNA" value={rates.plazoFijo?.tna != null ? `${rates.plazoFijo.tna.toFixed(1)}%` : '---'} />
                                                <KPI label="Tasa Real" value={rates.realRate != null ? `${rates.realRate.toFixed(1)}%` : '---'} sub="BADLAR − Inf. interanual" />
                                            </div>
                                        </Section>
                                    )}

                                    {/* Mercado Global */}
                                    {eco?.global?.length > 0 && (
                                        <Section title="Mercado Internacional">
                                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                                {eco.global.slice(0, 6).map((g: any) => (
                                                    <KPI
                                                        key={g.symbol}
                                                        label={g.symbol?.replace('-USD', '').replace('^', '').replace('=F', '')}
                                                        value={g.price?.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                                        sub={g.change != null ? `${g.change > 0 ? '+' : ''}${g.change?.toFixed(2)}%` : undefined}
                                                    />
                                                ))}
                                            </div>
                                        </Section>
                                    )}

                                    {/* Disclaimer */}
                                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 print:border-slate-300">
                                        <p className="text-[10px] text-slate-400 print:text-slate-400 italic">
                                            Este reporte fue generado automáticamente por Rulos Locos Pro. Los datos provienen de fuentes públicas (ArgentinaDatos, BCRA, DolarAPI, CryptoYa). No constituye asesoramiento financiero. Los valores son referenciales al momento de la generación.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
