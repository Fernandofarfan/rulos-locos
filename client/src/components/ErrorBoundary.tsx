import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#0b0e14] text-white p-8 flex flex-col items-center justify-center font-mono">
                    <div className="max-w-3xl w-full bg-red-900/20 border border-red-500/50 rounded-xl p-8 shadow-2xl">
                        <h1 className="text-3xl font-bold text-red-500 mb-4">Algo salió mal (Runtime Error)</h1>

                        <div className="bg-black/50 p-4 rounded-lg border border-white/10 mb-6 overflow-auto">
                            <h2 className="text-xl font-bold text-white mb-2">{this.state.error?.toString()}</h2>
                            {this.state.errorInfo && (
                                <pre className="text-xs text-slate-400 whitespace-pre-wrap">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            )}
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                        >
                            Recargar Página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
