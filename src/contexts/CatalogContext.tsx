import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCatalog } from '../services/api';
import type { Album, Artist, Catalog, Track } from '../types/api';

interface CatalogValue {
  catalog: Catalog | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getTrack: (id: string) => Track | undefined;
  getAlbum: (id: string) => Album | undefined;
  getArtist: (id: string) => Artist | undefined;
  tracksForAlbum: (albumId: string) => Track[];
  tracksForArtist: (artistId: string) => Track[];
  albumsForArtist: (artistId: string) => Album[];
}

const CatalogContext = createContext<CatalogValue | null>(null);
const CATALOG_STORAGE_KEY = 'pulse-mobile:catalog:v1';

function isCatalog(value: unknown): value is Catalog {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Catalog>;
  return Array.isArray(candidate.artists) && Array.isArray(candidate.albums) && Array.isArray(candidate.tracks);
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal, preserveCurrent = false) => {
    if (signal?.aborted) return;
    if (!preserveCurrent) setLoading(true);
    setError(null);
    try {
      const nextCatalog = await getCatalog(signal);
      if (signal?.aborted) return;
      setCatalog(nextCatalog);
      void AsyncStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(nextCatalog)).catch(() => undefined);
    } catch (reason) {
      if (!signal?.aborted && !preserveCurrent) {
        setError(reason instanceof Error ? reason.message : 'No se pudo cargar el catálogo.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      let restoredFromCache = false;
      try {
        const cached = await AsyncStorage.getItem(CATALOG_STORAGE_KEY);
        if (!controller.signal.aborted && cached) {
          const parsed: unknown = JSON.parse(cached);
          if (isCatalog(parsed)) {
            setCatalog(parsed);
            setLoading(false);
            restoredFromCache = true;
          }
        }
      } catch {
        // La caché es una optimización: la red sigue siendo la fuente de verdad.
      }

      if (!controller.signal.aborted) await load(controller.signal, restoredFromCache);
    })();
    return () => controller.abort();
  }, [load]);

  const trackMap = useMemo(() => new Map(catalog?.tracks.map((item) => [item.id, item]) ?? []), [catalog]);
  const albumMap = useMemo(() => new Map(catalog?.albums.map((item) => [item.id, item]) ?? []), [catalog]);
  const artistMap = useMemo(() => new Map(catalog?.artists.map((item) => [item.id, item]) ?? []), [catalog]);

  const value = useMemo<CatalogValue>(() => ({
    catalog,
    loading,
    error,
    refresh: () => load(),
    getTrack: (id) => trackMap.get(id),
    getAlbum: (id) => albumMap.get(id),
    getArtist: (id) => artistMap.get(id),
    tracksForAlbum: (albumId) => catalog?.tracks.filter((track) => track.albumId === albumId) ?? [],
    tracksForArtist: (artistId) => catalog?.tracks.filter((track) => track.artistId === artistId) ?? [],
    albumsForArtist: (artistId) => catalog?.albums.filter((album) => album.artistId === artistId) ?? []
  }), [albumMap, artistMap, catalog, error, load, loading, trackMap]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogValue {
  const value = useContext(CatalogContext);
  if (!value) throw new Error('useCatalog debe usarse dentro de CatalogProvider.');
  return value;
}
