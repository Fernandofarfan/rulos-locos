import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    /** Nombre de la sección para mostrar en el mensaje de error */
    sectionName?: string;
}

interface State {
    hasError: boolean;
    message: string;
}

/**
 * ErrorBoundary compacto para secciones individuales.
 * En lugar de romper toda la app, muestra un card de error inline con botón de reintento.
 */
export class SectionErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, message: '' };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, message: error.message ?? 'Error desconocido' };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error(`[SectionErrorBoundary] ${this.props.sectionName ?? 'Sección'}:`, error, info);
    }

    retry = () => this.setState({ hasError: false, message: '' });

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <div className="w-full my-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-6 flex items-start gap-4">
                <div className="p-2 bg-red-500/10 rounded-xl shrink-0">
                    <AlertTriangle size={18} className="text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white mb-1">
                        {this.props.sectionName
                            ? `Error en "${this.props.sectionName}"`
                            : 'Esta sección no pudo cargarse'}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono truncate mb-4">
                        {this.state.message}
                    </p>
                    <button
                        onClick={this.retry}
                        className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-all"
                    >
                        <RefreshCw size={12} />
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }
}
