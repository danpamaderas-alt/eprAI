import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-12 flex flex-col items-center justify-center text-center">
          <span className="text-5xl mb-4" aria-hidden="true">⚠️</span>
          <h2 className="text-lg font-black uppercase tracking-widest text-slate-400">Error en el dashboard</h2>
          <p className="text-sm text-slate-500 mt-2">{this.state.error?.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all"
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
