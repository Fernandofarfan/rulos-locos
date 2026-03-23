import React from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { TrendingUp, Calendar, AlertCircle } from 'lucide-react';

export const FuturosRofex: React.FC = () => {
    // El backend ya tiene un endpoint /api/economics/rofex mapeado en useDashboardData, vamos a usarlo
    const { economics, loading } = useDashboardData();
    const rofex = (economics as any)?.rofex;

    if (loading) {
        return <div className="animate-pulse bg-white/5 h-64 rounded-2xl w-full" />;
    }

    if (!rofex || rofex.length === 0) {
        return null;
    }

    // Sort contracts by date conceptually (usually they come sorted from BYMA)
    const contractsToDisplay = rofex.slice(0, 8); // Display first 8 months

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 group">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-orange-500/10 rounded-xl border border-orange-500/20">
                        <TrendingUp size={18} className="text-orange-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">Dólar Futuro</h3>
                        <p className="text-xs text-slate-400">Curva de Devaluación Esperada (Matba ROFEX)</p>
                    </div>
                </div>
            </div>

            <div className="bg-orange-500/5 border border-orange-500/10 p-3 rounded-xl mb-4 flex items-start gap-3">
                <AlertCircle size={16} className="text-orange-400 shrink-0 mt-0.5" />
                <p className="text-xs text-orange-200/70 leading-relaxed">
                    Los contratos de futuro indican el precio al que el mercado institucional e importadores estiman que cerrará el Dólar Oficial (Mayorista) a fin de cada mes.
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-[10px] uppercase text-slate-500 bg-black/20">
                        <tr>
                            <th className="px-4 py-3 font-bold rounded-l-lg">Vencimiento</th>
                            <th className="px-4 py-3 font-bold text-right">Precio Cierre</th>
                            <th className="px-4 py-3 font-bold text-right">TNA Implícita</th>
                            <th className="px-4 py-3 font-bold text-right rounded-r-lg">Monto Op.</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                        {contractsToDisplay.map((contract: any, i: number) => {
                            // En Rofex el ticker suele ser "DLR/MM24" o similar. Extraemos el mes/año.
                            // Para mostrar "TNA" deberíamos calcularla, pero si el endpoint no la provee, la omitimos o mostramos N/A
                            // Asumimos contract forma: { ticker: string, price: number, volume?: number, date?: string }
                            const tna = (contract as any).impliciTna || (contract as any).tna || null;
                            const volume = (contract as any).volume || 0;

                            return (
                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-3 font-bold flex items-center gap-2">
                                        <Calendar size={12} className="text-slate-500" />
                                        {(contract as any).ticker || (contract as any).name || `Mes ${i + 1}`}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-orange-400">
                                        ${Number(contract.price || (contract as any).close || 0).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {tna ? (
                                            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                                                {Number(tna).toFixed(1)}%
                                            </span>
                                        ) : (
                                            <span className="text-slate-600">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-400">
                                        {volume > 0 ? (volume / 1000).toFixed(1) + 'k' : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
