import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { socketService } from "../services/socket/SocketService";

export interface ProcessingState {
  play: boolean;
  pause: boolean;
  stop: boolean;
  next: boolean;
  previous: boolean;
  volume: boolean;
  mute: boolean;
  fullscreen: boolean;
  search: boolean;
  addToPlaylist: boolean;
  removeFromPlaylist: boolean;
  seek: boolean;
  repeat: boolean;
  skipAd: boolean;
  clearPlaylist: boolean;
  shufflePlaylist: boolean;
  openVideo: boolean;
  playPlaylistItem: boolean;
}

const initialProcessing: ProcessingState = {
  play: false,
  pause: false,
  stop: false,
  next: false,
  previous: false,
  volume: false,
  mute: false,
  fullscreen: false,
  search: false,
  addToPlaylist: false,
  removeFromPlaylist: false,
  clearPlaylist: false,
  shufflePlaylist: false,
  repeat: false,
  skipAd: false,
  seek: false,
  openVideo: false,
  playPlaylistItem: false,
};

interface LoadingContextValue {
  processing: ProcessingState;
  setProcessing: (key: keyof ProcessingState, value: boolean) => void;
  globalLoading: boolean;
  setGlobalLoading: (value: boolean) => void;
  initialLoading: boolean;
  setInitialLoading: (value: boolean) => void;
  removingItemId: string | null;
  setRemovingItemId: (id: string | null) => void;
  addingToPlaylist: boolean;
  setAddingToPlaylist: (value: boolean) => void;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [processing, setProcessingState] = useState<ProcessingState>(initialProcessing);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [addingToPlaylist, setAddingToPlaylistState] = useState(false);

  // Derives globalLoading from "is any processing flag true" - same coupling
  // the old Zustand setProcessing reducer had.
  const setProcessing = useCallback((key: keyof ProcessingState, value: boolean) => {
    setProcessingState((prev) => {
      const next = { ...prev, [key]: value };
      setGlobalLoading(Object.values(next).some(Boolean));
      return next;
    });
  }, []);

  // addingToPlaylist also writes globalLoading directly - a second,
  // independent path onto the same field, preserved verbatim from the old store.
  const setAddingToPlaylist = useCallback((value: boolean) => {
    setAddingToPlaylistState(value);
    setGlobalLoading(value);
  }, []);

  // Disable initial loading ~1s after every socket connect (matches the
  // previous SocketService-owned behavior) - no cleanup, this provider lives
  // for the app's whole lifetime.
  useEffect(() => {
    return socketService.onConnect(() => {
      setTimeout(() => setInitialLoading(false), 1000);
    });
  }, []);

  const value = useMemo<LoadingContextValue>(() => ({
    processing,
    setProcessing,
    globalLoading,
    setGlobalLoading,
    initialLoading,
    setInitialLoading,
    removingItemId,
    setRemovingItemId,
    addingToPlaylist,
    setAddingToPlaylist,
  }), [processing, setProcessing, globalLoading, initialLoading, removingItemId, addingToPlaylist, setAddingToPlaylist]);

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- Provider + hook colocation is the standard React Context pattern
export function useLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return ctx;
}
