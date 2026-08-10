import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { LoadingMessage } from '../components/FullPageLoading';

interface LoadingContextValue {
  isLoading: boolean;
  loadingType: LoadingMessage;
  loadingMessage: string;
  setLoading: (loading: boolean, type?: LoadingMessage, message?: string) => void;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<LoadingMessage>('loading');
  const [loadingMessage, setLoadingMessage] = useState('');

  const setLoading = useCallback((loading: boolean, type: LoadingMessage = 'loading', message = '') => {
    setIsLoading(loading);
    setLoadingType(type);
    setLoadingMessage(message);
  }, []);

  const value = useMemo<LoadingContextValue>(() => ({
    isLoading,
    loadingType,
    loadingMessage,
    setLoading,
  }), [isLoading, loadingType, loadingMessage, setLoading]);

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
}

export function useLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return ctx;
}
