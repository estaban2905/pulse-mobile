import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AudioSettings } from '../types/app';

const STORAGE_KEY = 'pulse-mobile:settings:v1';

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

  const setSetting = useCallback(<Key extends keyof AudioSettings>(key: Key, value: AudioSettings[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  }, []);

  const value = useMemo<SettingsValue>(() => ({
    settings,
    hydrated,
    setSetting,
    resetSettings: () => setSettings(defaults)
  }), [hydrated, setSetting, settings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings debe usarse dentro de SettingsProvider.');
  return value;
}
