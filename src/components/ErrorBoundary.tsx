import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    // Navigate home by changing path directly to avoid router state issues on crash
    window.location.href = import.meta.env.BASE_URL || '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="container" style={{ maxWidth: '550px', marginTop: '6rem' }}>
          <div className="card error" style={{ textAlign: 'center', padding: '3rem' }}>
            <h1 style={{ fontSize: '2.5rem', color: 'var(--error-color)', borderBottom: 'none', padding: 0 }}>
              ⚠️ Algo salió mal
            </h1>
            <p style={{ margin: '1.5rem 0 2rem 0', fontSize: '1.05rem', lineHeight: '1.6' }}>
              Se ha producido un error inesperado al renderizar esta pantalla. Por favor, intenta recargar la página o volver a la pantalla de inicio.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
              <button
                onClick={this.handleReload}
                className="btn btn-primary"
                type="button"
              >
                Recargar Página
              </button>
              <button
                onClick={this.handleGoHome}
                className="btn btn-secondary"
                type="button"
              >
                Volver a la Página de Inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
