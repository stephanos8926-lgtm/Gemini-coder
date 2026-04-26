import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { ForgeGuard } from '../../packages/nexus/guard/ForgeGuard';

const guard = ForgeGuard.init('ErrorBoundary');

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
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
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    guard.protect(() => {
        throw error;
    }, { method: 'ErrorBoundary', name: this.props.name || 'Component', componentStack: errorInfo.componentStack });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isAppLevel = !this.props.name;

      return (
        <div className={`${isAppLevel ? 'min-h-screen' : 'h-full flex-1'} flex items-center justify-center bg-[#121212] p-4 overflow-hidden`}>
          <div className="max-w-md w-full bg-[#1e1e1e] border border-red-900/30 rounded-lg p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertCircle className="w-8 h-8 shrink-0" />
              <h1 className="text-xl font-semibold tracking-tight">
                {isAppLevel ? 'Something went wrong' : `${this.props.name} crashed`}
              </h1>
            </div>
            
            <div className="bg-black/20 rounded p-4 mb-6 font-mono text-sm text-red-400/80 break-words max-h-40 overflow-y-auto">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </div>

            <button
              onClick={() => {
                if (isAppLevel) {
                  window.location.reload();
                } else {
                  this.setState({ hasError: false, error: null });
                }
              }}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              {isAppLevel ? 'Reload Application' : 'Try Again'}
            </button>
            
            {isAppLevel && (
              <p className="mt-4 text-xs text-gray-500 text-center">
                If the problem persists, please check the developer console for more details.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
