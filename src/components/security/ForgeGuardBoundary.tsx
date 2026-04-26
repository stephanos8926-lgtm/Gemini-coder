import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ForgeGuard } from '../../../packages/nexus/guard/ForgeGuard';

const guard = ForgeGuard.init('ReactErrorBoundary');

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactElement;
}

export const ForgeGuardBoundary: React.FC<Props> = ({ children, fallback = <div>Something went wrong.</div> }) => {
  const handleError = (error: Error, info: { componentStack: string }) => {
    guard.protect(() => {
      throw error; // Let the guard catch it and log it
    }, { method: 'ErrorBoundary', componentStack: info.componentStack });
  };

  return (
    <ErrorBoundary FallbackComponent={() => fallback} onError={handleError}>
      {children}
    </ErrorBoundary>
  );
};
