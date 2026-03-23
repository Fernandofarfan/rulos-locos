import React, { useState, useMemo } from 'react';
import { Receipt, Info } from 'lucide-react';


type InstrumentType = 'plazo_fijo' | 'cedear' | 'accion_local' | 'fci_renta_fija' | 'fci_renta_variable' | 'cripto';

interface Instrument {
    id: InstrumentType;
    label: string;
    emoji: string;
    taxRate: number;        // % sobre ganancia
    exento: boolean;        // exención total
    cedularRate?: number;   // tasa cedular especial
    notes: string;
}

const INSTRUMENTS: Instrument[] = [
    { id: 'plazo_fijo', label: 'Plazo Fijo', emoji: '🏦', taxRate: 0, exento: true, notes: 'Exento de impuesto a las ganancias (personas físicas). Ley 27.430.' },
    { id: 'cedear', label: 'CEDEARs', emoji: '📊', taxRate: 15, exento: false, cedularRate: 15, notes: 'Impuesto cedular 15% sobre ganancia en USD. Si resultado es negativo se puede compensar.' },
    { id: 'accion_local', label: 'Acciones BYMA', emoji: '📈', taxRate: 0, exento: true, notes: 'Exento para personas físicas sobre la ganancia de capital. Solo dividendos tributan.' },
    { id: 'fci_renta_fija', label: 'FCI Renta Fija', emoji: '💼', taxRate: 0, exento: true, notes: 'Ganancias de capital exentas. Solo renta (cupones/intereses incluidos en la cuotaparte).' },
    { id: 'fci_renta_variable', label: 'FCI Renta Variable', emoji: '🚀', taxRate: 0, exento: true, notes: 'Exento de Ganancias para personas físicas.' },
    { id: 'cripto', label: 'Criptomonedas', emoji: '₿', taxRate: 15, exento: false, cedularRate: 15, notes: 'Ganancias de capital en cripto tributan 15%. Operaciones en moneda extranjera.' },
];

export const TaxCalculator: React.FC = () => {
    const [instrument, setInstrument] = useState<InstrumentType>('cedear');
    const [invested, setInvested] = useState('1000000');
    const [returned, setReturned] = useState('1300000');

    const selectedInstr = INSTRUMENTS.find(i => i.id === instrument)!;
    const investedNum = parseFloat(invested.replace(/\D/g, '')) || 0;
    const returnedNum = parseFloat(returned.replace(/\D/g, '')) || 0;

    const { gain, tax, netGain, netReturn } = useMemo(() => {
        const gain = returnedNum - investedNum;
        const tax = selectedInstr.exento || gain <= 0
            ? 0
            : gain * (selectedInstr.cedularRate ?? selectedInstr.taxRate) / 100;
        const netGain = gain - tax;
        const netReturn = investedNum + netGain;
        return { gain, tax, netGain, netReturn };
    }, [investedNum, returnedNum, selectedInstr]);

    const pctGross = investedNum > 0 ? ((gain / investedNum) * 100).toFixed(1) : '0';
    const pctNet = investedNum > 0 ? ((netGain / investedNum) * 100).toFixed(1) : '0';

    const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

    const numInput = (value: string, setter: (v: string) => void) => (
        <input
            type="text"
            value={new Intl.NumberFormat('es-AR').format(parseFloat(value) || 0)}
            onChange={e => setter(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-rose-400/40 transition-colors"
        />
    );

    return (
        <div className="glass-panel no-lift p-5">
            <div className="flex items-center gap-2 mb-4">
                <Receipt size={14} className="text-rose-400" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Calculadora Impuesto a las Ganancias</h3>
            </div>

            {/* Instrument selector */}
            <div className="grid grid-cols-3 gap-1.5 mb-4">
                {INSTRUMENTS.map(i => (
                    <button
                        key={i.id}
                        onClick={() => setInstrument(i.id)}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${instrument === i.id ? 'bg-rose-400/10 border-rose-400/30 text-rose-300' : 'border-white/5 bg-white/3 text-slate-500 hover:text-white'}`}
                    >
                        {i.emoji} {i.label}
                    </button>
                ))}
            </div>

            {/* Info about selected instrument */}
            <div className={`text-[10px] p-2.5 rounded-lg mb-4 border flex items-start gap-2 ${selectedInstr.exento ? 'bg-emerald-400/5 border-emerald-400/15 text-emerald-400' : 'bg-rose-400/5 border-rose-400/15 text-rose-300'}`}>
                <Info size={11} className="flex-shrink-0 mt-0.5" />
                <span>{selectedInstr.notes}</span>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Capital invertido (ARS)</label>
                    {numInput(invested, setInvested)}
                </div>
                <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Monto de retorno (ARS)</label>
                    {numInput(returned, setReturned)}
                </div>
            </div>

            {/* Results */}
            <div className="space-y-2">
                {[
                    { label: 'Ganancia bruta', value: gain, extra: `+${pctGross}%`, color: gain >= 0 ? 'text-emerald-400' : 'text-rose-400' },
                    { label: `Impuesto (${selectedInstr.exento ? 'EXENTO' : `${selectedInstr.cedularRate ?? selectedInstr.taxRate}%`})`, value: -tax, extra: selectedInstr.exento ? '✓ exento' : '', color: tax > 0 ? 'text-rose-400' : 'text-emerald-400' },
                    { label: 'Ganancia neta', value: netGain, extra: `+${pctNet}%`, color: netGain >= 0 ? 'text-emerald-400' : 'text-rose-400' },
                    { label: 'Retorno neto total', value: netReturn, extra: '', color: 'text-white' },
                ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <span className="text-xs text-slate-400">{row.label}</span>
                        <div className="flex items-center gap-2">
                            {row.extra && <span className="text-[9px] text-slate-600">{row.extra}</span>}
                            <span className={`text-sm font-bold font-mono ${row.color}`}>{fmt(row.value)}</span>
                        </div>
                    </div>
                ))}
            </div>

            <p className="text-[9px] text-slate-700 mt-3 italic">Basado en normativa vigente. Consultá a un contador para tu situación impositiva.</p>
        </div>
    );
};
