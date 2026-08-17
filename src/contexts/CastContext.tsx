import React, { createContext, useContext } from 'react';

/**
 * Contexto simplificado para TV.
 *
 * La versión simple usa tvApi (código de 6 dígitos) y NowPlayingReporter,
 * no Google Cast. Este contexto solo existe para no romper imports.
 */

interface CastValue {
  isAvailable: false;
  isConnected: false;
  deviceName: null;
  error: null;
  loadTrack: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seek: () => Promise<void>;
  setVolume: () => Promise<void>;
  showCastDialog: () => Promise<void>;
}

const fallbackValue: CastValue = {
  isAvailable: false,
  isConnected: false,
  deviceName: null,
  error: null,
  loadTrack: async () => {},
  play: async () => {},
  pause: async () => {},
  seek: async () => {},
  setVolume: async () => {},
  showCastDialog: async () => {}
};

const CastContext = createContext<CastValue>(fallbackValue);

export function CastProvider({ children }: { children: React.ReactNode }) {
  return <CastContext.Provider value={fallbackValue}>{children}</CastContext.Provider>;
}

export function useCast(): CastValue {
  return useContext(CastContext);
}

export function getNativeCastButton() {
  return null;
}