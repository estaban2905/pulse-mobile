import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { libraryApi, type ApiPreferences } from '../services/library/libraryApi';
import { useAuth } from './AuthContext';
import type { AudioSettings } from '../types/app';

const STORAGE_KEY = 'pulse-mobile:settings:v1';

/**
 * Ajustes que viajan con la cuenta, y con qué nombre los guarda el servidor.
 *
 * Deliberadamente **no** están las calidades. La web habla de
 * `low|normal|high|max` y esta app de `normal|high|very-high`: sincronizarlas
 * haría que cada cliente escribiera un valor que el otro no sabe representar, y
 * el último en guardar dejaría al otro con un ajuste que no puede ni dibujar.
 * Unificar ese vocabulario es un cambio aparte, y hasta entonces la calidad se
 * queda en el dispositivo.
 *
 * `allowExplicit`, `dataSaver` y `wifiOnlyDownloads` tampoco están, por otra
 * razón: no existe columna para ellos.
 */
const SYNCED: Partial<Record<keyof AudioSettings, keyof ApiPreferences>> = {
  autoplay: 'autoplay',
  normalizeVolume: 'normalize',
  privateSession: 'privateSession'
};

const defaults: AudioSettings = {
  autoplay: true,
  normalizeVolume: true,
  allowExplicit: true,
  dataSaver: false,
  wifiOnlyDownloads: false,
  privateSession: false,
  playbackQuality: 'high',
  downloadQuality: 'high'
};

interface SettingsValue {
  settings: AudioSettings;
  hydrated: boolean;
  setSetting: <Key extends keyof AudioSettings>(key: Key, value: AudioSettings[Key]) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState(defaults);
  const [hydrated, setHydrated] = useState(false);
  const { status, user } = useAuth();

  const serverBacked = status === 'authenticated';
  const serverBackedRef = useRef(serverBacked);
  serverBackedRef.current = serverBacked;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) setSettings({ ...defaults, ...(JSON.parse(stored) as Partial<AudioSettings>) });
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [hydrated, settings]);

  /**
   * Lo que la cuenta ya tenía manda sobre lo que había en este teléfono.
   *
   * Al revés —subir lo local al entrar— haría que abrir sesión en un móvil
   * recién instalado pisara con los valores de fábrica los ajustes que el
   * usuario eligió en la web.
   */
  useEffect(() => {
    if (!hydrated || !serverBacked || !user) return;

    let cancelled = false;

    void libraryApi
      .getPreferences()
      .then((remote) => {
        if (cancelled) return;
        setSettings((current) => ({
          ...current,
          autoplay: remote.autoplay,
          normalizeVolume: remote.normalize,
          privateSession: remote.privateSession
        }));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [hydrated, serverBacked, user]);

  const setSetting = useCallback(<Key extends keyof AudioSettings>(key: Key, value: AudioSettings[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }));

    const remoteKey = SYNCED[key];
    if (!remoteKey || !serverBackedRef.current) return;
    void libraryApi.updatePreferences({ [remoteKey]: value }).catch(() => undefined);
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaults);
    if (!serverBackedRef.current) return;
    void libraryApi
      .updatePreferences({
        autoplay: defaults.autoplay,
        normalize: defaults.normalizeVolume,
        privateSession: defaults.privateSession
      })
      .catch(() => undefined);
  }, []);

  const value = useMemo<SettingsValue>(() => ({
    settings,
    hydrated,
    setSetting,
    resetSettings
  }), [hydrated, resetSettings, setSetting, settings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings debe usarse dentro de SettingsProvider.');
  return value;
}
