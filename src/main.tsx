import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Protective wrapper against polyfills trying to overwrite an un-settable fetch
if (typeof window !== 'undefined') {
  const desc = Object.getOwnPropertyDescriptor(window, 'fetch');
  if (desc && desc.get && !desc.set && desc.configurable) {
    Object.defineProperty(window, 'fetch', {
      get: desc.get,
      set: () => {},
      configurable: true,
      enumerable: desc.enumerable
    });
  } else if (desc && desc.get && !desc.set && !desc.configurable) {
    // If we can't configure it, we might be unable to stop the crash from eruda or polyfills
    console.warn('Window.fetch is non-configurable with only a getter. Expect errors from fetch polyfills.');
  }
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FirebaseProvider } from './contexts/FirebaseContext';
import { initEruda } from './utils/ErudaManager';

// Initialize Eruda based on environment
// initEruda();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <FirebaseProvider>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </FirebaseProvider>
    </ErrorBoundary>
  </StrictMode>,
);
