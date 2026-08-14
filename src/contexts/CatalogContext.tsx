import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCatalog } from '../services/api';
import type {
  Album,
  Artist,
  Catalog,
  EditorialPlaylist,
  Genre,
  Mood,
  Track
} from '../types/api';

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

  /** Contenido editorial servido por el API. Vacío mientras no haya catálogo. */
  genres: Genre[];
  moods: Mood[];
  editorialPlaylists: EditorialPlaylist[];
  getEditorialPlaylist: (id: string) => EditorialPlaylist | undefined;
  getMood: (id: string) => Mood | undefined;
  getGenre: (idOrSlugOrName: string) => Genre | undefined;
}

const CatalogContext = createContext<CatalogValue | null>(null);
const CATALOG_STORAGE_KEY = 'pulse-mobile:catalog:v1';

function isCatalog(value: unknown): value is Catalog {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Catalog>;
  return Array.isArray(candidate.artists) && Array.isArray(candidate.albums) && Array.isArray(candidate.tracks);
}

/**
 * Rellena lo que una caché vieja no puede traer.
 *
 * Las versiones anteriores guardaban solo artistas, álbumes y pistas, porque el
 * contenido editorial estaba escrito en el código. Sin estos huecos, la primera
 * pantalla que recorriera `genres` sobre una caché de antes reventaría antes de
 * que llegara la respuesta del servidor.
 */
function normalizeCatalog(value: Catalog): Catalog {
  return {
    ...value,
    genres: value.genres ?? [],
    moods: value.moods ?? [],
    playlists: value.playlists ?? []
  };
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
      const nextCatalog = normalizeCatalog(await getCatalog(signal));
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
            setCatalog(normalizeCatalog(parsed));
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
    albumsForArtist: (artistId) => catalog?.albums.filter((album) => album.artistId === artistId) ?? [],
    genres: catalog?.genres ?? [],
    moods: catalog?.moods ?? [],
    editorialPlaylists: catalog?.playlists ?? [],
    getEditorialPlaylist: (id) => catalog?.playlists.find((playlist) => playlist.id === id),
    getMood: (id) => catalog?.moods.find((mood) => mood.id === id || mood.slug === id),
    // Se busca por `slug` y también por nombre: las pistas guardan el nombre
    // del género, y los enlaces antiguos llevaban ese nombre en la ruta.
    getGenre: (idOrSlugOrName) => {
      const needle = idOrSlugOrName.toLocaleLowerCase('es');
      return catalog?.genres.find(
        (genre) =>
          genre.id === idOrSlugOrName ||
          genre.slug.toLocaleLowerCase('es') === needle ||
          genre.name.toLocaleLowerCase('es') === needle
      );
    }
  }), [albumMap, artistMap, catalog, error, load, loading, trackMap]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogValue {
  const value = useContext(CatalogContext);
  if (!value) throw new Error('useCatalog debe usarse dentro de CatalogProvider.');
  return value;
}
