import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { downloadTrackFile, removeTrackFile } from '../services/downloads';
import { libraryApi, type LibraryCollection } from '../services/library/libraryApi';
import { hasMigrated, mergeIds, migrateLocalLibrary } from '../services/library/librarySync';
import { playlistsApi, type ApiPlaylist, type UpdatePlaylistInput } from '../services/library/playlistsApi';
import { useAuth } from './AuthContext';
import type { Track } from '../types/api';
import type { AppNotification, LibraryState, Profile, UserPlaylist } from '../types/app';

const STORAGE_KEY = 'pulse-mobile:library:v1';

const initialNotifications: AppNotification[] = [{
  id: 'welcome',
  title: 'Bienvenido a Pulse',
  message: 'Tu catálogo local ya está listo para reproducirse.',
  createdAt: new Date().toISOString(),
  read: false,
  kind: 'recommendation'
}];

const initialState: LibraryState = {
  favoriteTrackIds: [],
  savedAlbumIds: [],
  followedArtistIds: [],
  history: [],
  playlists: [],
  recentSearches: [],
  downloadedTracks: {},
  profile: { name: 'Pulse Listener', email: 'demo@pulse.music', plan: 'Demo' },
  notifications: initialNotifications
};

interface LibraryValue extends LibraryState {
  hydrated: boolean;
  downloadProgress: Record<string, number>;
  downloadError: string | null;
  isFavorite: (trackId: string) => boolean;
  toggleFavorite: (trackId: string) => void;
  isAlbumSaved: (albumId: string) => boolean;
  toggleSavedAlbum: (albumId: string) => void;
  isArtistFollowed: (artistId: string) => boolean;
  toggleFollowArtist: (artistId: string) => void;
  logPlay: (trackId: string) => void;
  removeHistoryEntry: (entryId: string) => void;
  clearHistory: () => void;
  addRecentSearch: (term: string) => void;
  removeRecentSearch: (term: string) => void;
  clearRecentSearches: () => void;
  createPlaylist: (title: string, description?: string) => string;
  updatePlaylist: (id: string, updates: Partial<Pick<UserPlaylist, 'title' | 'description'>>) => void;
  deletePlaylist: (id: string) => void;
  addTrackToPlaylist: (playlistId: string, trackId: string) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  reorderPlaylistTrack: (playlistId: string, from: number, to: number) => void;
  downloadTrack: (track: Track) => Promise<void>;
  removeDownload: (trackId: string) => Promise<void>;
  clearDownloads: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

const LibraryContext = createContext<LibraryValue | null>(null);

/** Qué colección del servidor corresponde a cada lista de la pantalla. */
const collectionOf: Record<'favoriteTrackIds' | 'savedAlbumIds' | 'followedArtistIds', LibraryCollection> = {
  favoriteTrackIds: 'favourites',
  savedAlbumIds: 'albums',
  followedArtistIds: 'artists'
};

/** Una playlist del servidor, en la forma que usan las pantallas. */
function toLocalPlaylist(remote: ApiPlaylist): UserPlaylist {
  return {
    // `id` y `remoteId` coinciden: lo que llega del servidor ya está sincronizado.
    id: remote.id,
    remoteId: remote.id,
    title: remote.title,
    description: remote.description ?? '',
    trackIds: remote.trackIds,
    createdAt: remote.updatedAt,
    updatedAt: remote.updatedAt
  };
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const { status, user } = useAuth();

  /** Cierto cuando hay sesión y, por tanto, un servidor al que contarle todo. */
  const serverBacked = status === 'authenticated';

  // Los mutadores viven en callbacks estables y se llaman desde promesas que
  // terminan mucho después: leer el estado por `ref` evita quedarse con la
  // versión que había cuando se creó el callback.
  const stateRef = useRef(state);
  stateRef.current = state;
  const serverBackedRef = useRef(serverBacked);
  serverBackedRef.current = serverBacked;

  /**
   * Altas de playlist que todavía no han respondido.
   *
   * Quien crea una playlist puede editarla en el segundo siguiente, antes de
   * que el servidor haya dicho qué UUID le tocó. La promesa se guarda aquí para
   * que esa edición espere al alta en vez de perderse.
   */
  const pendingCreates = useRef(new Map<string, Promise<string | null>>());

  /**
   * De quién es lo que hay guardado. `null` significa "de nadie todavía": lo
   * que se acumuló antes de iniciar sesión por primera vez.
   *
   * Existe porque esto es un único almacén en un teléfono que puede pasar por
   * varias manos. Sin la marca, quien iniciara sesión después vería —y seguiría
   * escribiendo en— los favoritos, el historial y las playlists del anterior.
   */
  const ownerId = user?.id ?? null;

  useEffect(() => {
    // Hasta que la sesión no está resuelta no se sabe de quién sería lo que hay
    // en disco, y leerlo antes es justo lo que enseñaría la biblioteca de otro.
    if (status === 'checking') return;

    let cancelled = false;
    setHydrated(false);

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        const saved = stored
          ? (JSON.parse(stored) as Partial<LibraryState> & { ownerId?: string | null })
          : null;

        // Lo que no es de quien está usando la app ahora se descarta de la
        // pantalla —no del disco: sigue ahí por si vuelve su dueño, y la Fase 2
        // se lo llevará al servidor la primera vez que inicie sesión—. El
        // `initialState` no es opcional: sin él, cerrar sesión dejaría en
        // memoria la biblioteca de quien acaba de salir.
        if (!saved || (saved.ownerId ?? null) !== ownerId) {
          setState(initialState);
          return;
        }

        setState({ ...initialState, ...saved });
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [ownerId, status]);

  useEffect(() => {
    if (hydrated) void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, ownerId }));
  }, [hydrated, ownerId, state]);

  /**
   * Trae del servidor lo que ya sabe, y le sube lo que solo sabía el teléfono.
   *
   * Espera a `hydrated` a propósito: la migración tiene que ver la biblioteca
   * local completa, y si corriera antes vería una vacía y no subiría nada.
   */
  useEffect(() => {
    if (!hydrated || !serverBacked || !user) return;

    let cancelled = false;

    void (async () => {
      try {
        const remote = await libraryApi.fetch();
        if (cancelled) return;

        const local = {
          favourites: stateRef.current.favoriteTrackIds,
          savedAlbums: stateRef.current.savedAlbumIds,
          followedArtists: stateRef.current.followedArtistIds
        };

        // La marca de migrado puede mentir: si aquí hay biblioteca y allí no, o
        // se perdió la subida o alguien vació la cuenta. En ambos casos vuelve a
        // subirse, que es inofensivo, en vez de dar por buena una cuenta vacía.
        const localHasData =
          local.favourites.length > 0 || local.savedAlbums.length > 0 || local.followedArtists.length > 0;
        const remoteIsEmpty =
          remote.favourites.length === 0 &&
          remote.savedAlbums.length === 0 &&
          remote.followedArtists.length === 0;

        const firstTime = !(await hasMigrated(user.id)) || (localHasData && remoteIsEmpty);
        if (cancelled) return;

        if (firstTime) {
          // Si alguna subida falla, la cuenta NO queda marcada como migrada y se
          // reintenta en el próximo arranque. Marcarla igualmente haría que la
          // carga siguiente machacara lo local con un servidor a medias.
          await migrateLocalLibrary(user.id, local, remote);
          if (cancelled) return;
        }

        const remotePlaylists = await playlistsApi.list();
        if (cancelled) return;

        setState((current) => ({
          ...current,
          favoriteTrackIds: firstTime
            ? mergeIds(remote.favourites, current.favoriteTrackIds)
            : remote.favourites,
          savedAlbumIds: firstTime ? mergeIds(remote.savedAlbums, current.savedAlbumIds) : remote.savedAlbums,
          followedArtistIds: firstTime
            ? mergeIds(remote.followedArtists, current.followedArtistIds)
            : remote.followedArtists,
          history: remote.history.map((entry) => ({
            id: entry.id,
            trackId: entry.trackId,
            playedAt: entry.playedAt
          })),
          // Las playlists del servidor mandan sobre la copia del teléfono. Las
          // creadas sin conexión, que aún no tienen `remoteId`, se conservan
          // para que no se pierdan: subirlas es trabajo de otra pasada.
          playlists: [
            ...remotePlaylists.map(toLocalPlaylist),
            ...current.playlists.filter((playlist) => !playlist.remoteId)
          ]
        }));
      } catch {
        // Sin red se sigue con la copia local: la biblioteca es lo último que
        // debe desaparecer porque el servidor no conteste.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, serverBacked, user]);

  /**
   * Las tres colecciones cambian igual: el cambio se ve en pantalla al instante
   * y se manda al servidor detrás.
   *
   * El orden importa para que marcar un favorito se sienta inmediato. Si la
   * llamada falla, la copia local sigue siendo válida y el próximo arranque
   * traerá lo que el servidor tenga: no se pierde nada y no hay que deshacer
   * nada delante del usuario.
   */
  const toggleInList = useCallback((key: 'favoriteTrackIds' | 'savedAlbumIds' | 'followedArtistIds', id: string) => {
    const member = !stateRef.current[key].includes(id);

    setState((current) => ({
      ...current,
      [key]: current[key].includes(id) ? current[key].filter((item) => item !== id) : [...current[key], id]
    }));

    if (!serverBackedRef.current) return;
    void libraryApi.setMembership(collectionOf[key], id, member).catch(() => undefined);
  }, []);

  const logPlay = useCallback((trackId: string) => {
    const localId = `${trackId}-${Date.now()}`;
    setState((current) => ({
      ...current,
      history: [{ id: localId, trackId, playedAt: new Date().toISOString() }, ...current.history].slice(0, 150)
    }));

    // La entrada aparece con un identificador provisional y se cambia por el del
    // servidor cuando responde: sin eso, borrarla después solo la quitaría de
    // esta pantalla, porque el servidor no conoce ese identificador.
    if (!serverBackedRef.current) return;
    void libraryApi
      .logPlay(trackId)
      .then((entry) => {
        setState((current) => ({
          ...current,
          history: current.history.map((item) => (item.id === localId ? { ...item, id: entry.id } : item))
        }));
      })
      .catch(() => undefined);
  }, []);

  /** El UUID de una playlist, esperando al alta si todavía está en vuelo. */
  const resolveRemoteId = useCallback(async (localId: string): Promise<string | null> => {
    const known = stateRef.current.playlists.find((playlist) => playlist.id === localId)?.remoteId;
    if (known) return known;
    return (await pendingCreates.current.get(localId)) ?? null;
  }, []);

  /** Sustituye una playlist en pantalla y manda el mismo cambio al servidor. */
  const replacePlaylist = useCallback(
    (next: UserPlaylist, patch: UpdatePlaylistInput) => {
      setState((current) => ({
        ...current,
        playlists: current.playlists.map((playlist) => (playlist.id === next.id ? next : playlist))
      }));

      if (!serverBackedRef.current) return;
      void (async () => {
        const remoteId = await resolveRemoteId(next.id);
        if (!remoteId) return;
        await playlistsApi.update(remoteId, patch).catch(() => undefined);
      })();
    },
    [resolveRemoteId]
  );

  const createPlaylist = useCallback((title: string, description = '') => {
    const now = new Date().toISOString();
    const id = `playlist-${Date.now()}`;
    const cleanTitle = title.trim() || 'Nueva playlist';

    setState((current) => ({
      ...current,
      playlists: [...current.playlists, { id, title: cleanTitle, description, trackIds: [], createdAt: now, updatedAt: now }]
    }));

    // Se devuelve el identificador local en el acto para que quien la acaba de
    // crear pueda navegar a ella sin esperar al servidor. El UUID llega después
    // y se guarda en `remoteId`, sin tocar el `id` que ya está en uso.
    if (serverBackedRef.current) {
      const pending = playlistsApi
        .create({ title: cleanTitle, description: description || undefined })
        .then((remote) => {
          setState((current) => ({
            ...current,
            playlists: current.playlists.map((playlist) =>
              playlist.id === id ? { ...playlist, remoteId: remote.id } : playlist
            )
          }));
          return remote.id;
        })
        .catch(() => null)
        .finally(() => pendingCreates.current.delete(id));
      pendingCreates.current.set(id, pending);
    }

    return id;
  }, []);

  const updatePlaylist = useCallback(
    (id: string, updates: Partial<Pick<UserPlaylist, 'title' | 'description'>>) => {
      const target = stateRef.current.playlists.find((playlist) => playlist.id === id);
      if (!target) return;

      const title = updates.title === undefined ? target.title : updates.title.trim() || target.title;
      const description = updates.description === undefined ? target.description : updates.description;

      replacePlaylist(
        { ...target, title, description, updatedAt: new Date().toISOString() },
        { title, ...(updates.description === undefined ? {} : { description }) }
      );
    },
    [replacePlaylist]
  );

  const deletePlaylist = useCallback(
    (id: string) => {
      setState((current) => ({
        ...current,
        playlists: current.playlists.filter((playlist) => playlist.id !== id)
      }));

      if (!serverBackedRef.current) return;
      void (async () => {
        const remoteId = await resolveRemoteId(id);
        if (remoteId) await playlistsApi.remove(remoteId).catch(() => undefined);
      })();
    },
    [resolveRemoteId]
  );

  /**
   * Añadir, quitar y reordenar acaban en la misma llamada.
   *
   * El servidor sustituye la lista entera por la que se le manda, así que basta
   * con contarle el resultado. Mandar la operación en vez del resultado dejaría
   * la lista a medias si dos ediciones seguidas se cruzaran por la red.
   */
  const setPlaylistTracks = useCallback(
    (playlistId: string, nextTrackIds: string[]) => {
      const target = stateRef.current.playlists.find((playlist) => playlist.id === playlistId);
      if (!target) return;
      replacePlaylist(
        { ...target, trackIds: nextTrackIds, updatedAt: new Date().toISOString() },
        { trackIds: nextTrackIds }
      );
    },
    [replacePlaylist]
  );

  const addTrackToPlaylist = useCallback(
    (playlistId: string, trackId: string) => {
      const target = stateRef.current.playlists.find((playlist) => playlist.id === playlistId);
      if (!target || target.trackIds.includes(trackId)) return;
      setPlaylistTracks(playlistId, [...target.trackIds, trackId]);
    },
    [setPlaylistTracks]
  );

  const removeTrackFromPlaylist = useCallback(
    (playlistId: string, trackId: string) => {
      const target = stateRef.current.playlists.find((playlist) => playlist.id === playlistId);
      if (!target || !target.trackIds.includes(trackId)) return;
      setPlaylistTracks(playlistId, target.trackIds.filter((id) => id !== trackId));
    },
    [setPlaylistTracks]
  );

  const reorderPlaylistTrack = useCallback(
    (playlistId: string, from: number, to: number) => {
      const target = stateRef.current.playlists.find((playlist) => playlist.id === playlistId);
      if (!target || from === to) return;
      if (from < 0 || to < 0 || from >= target.trackIds.length || to >= target.trackIds.length) return;

      const trackIds = [...target.trackIds];
      const [moved] = trackIds.splice(from, 1);
      trackIds.splice(to, 0, moved);
      setPlaylistTracks(playlistId, trackIds);
    },
    [setPlaylistTracks]
  );

  const removeHistoryEntry = useCallback((entryId: string) => {
    setState((current) => ({ ...current, history: current.history.filter((item) => item.id !== entryId) }));

    // Una entrada que aún no ha recibido su UUID lleva un identificador que el
    // servidor no reconoce; el fallo se ignora porque la reproducción sí quedó
    // registrada allí y aparecerá en la próxima carga.
    if (!serverBackedRef.current) return;
    void libraryApi.removeHistoryEntry(entryId).catch(() => undefined);
  }, []);

  const clearHistory = useCallback(() => {
    setState((current) => ({ ...current, history: [] }));
    if (!serverBackedRef.current) return;
    void libraryApi.clearHistory().catch(() => undefined);
  }, []);

  const downloadTrack = useCallback(async (track: Track) => {
    setDownloadError(null);
    setDownloadProgress((current) => ({ ...current, [track.id]: 0 }));
    try {
      const uri = await downloadTrackFile(track, (progress) => {
        setDownloadProgress((current) => ({ ...current, [track.id]: progress }));
      });
      setState((current) => ({
        ...current,
        downloadedTracks: { ...current.downloadedTracks, [track.id]: uri },
        notifications: [{
          id: `download-${track.id}-${Date.now()}`,
          title: 'Descarga completa',
          message: `${track.title} está disponible sin conexión.`,
          createdAt: new Date().toISOString(),
          read: false,
          kind: 'download'
        }, ...current.notifications]
      }));
    } catch (reason) {
      setDownloadError(reason instanceof Error ? reason.message : 'No se pudo descargar la canción.');
      throw reason;
    } finally {
      setDownloadProgress((current) => {
        const nextProgress = { ...current };
        delete nextProgress[track.id];
        return nextProgress;
      });
    }
  }, []);

  const removeDownload = useCallback(async (trackId: string) => {
    const uri = state.downloadedTracks[trackId];
    if (uri) await removeTrackFile(uri);
    setState((current) => {
      const downloadedTracks = { ...current.downloadedTracks };
      delete downloadedTracks[trackId];
      return { ...current, downloadedTracks };
    });
  }, [state.downloadedTracks]);

  const clearDownloads = useCallback(async () => {
    await Promise.all(Object.values(state.downloadedTracks).map((uri) => removeTrackFile(uri)));
    setState((current) => ({ ...current, downloadedTracks: {} }));
  }, [state.downloadedTracks]);

  const value = useMemo<LibraryValue>(() => ({
    ...state,
    hydrated,
    downloadProgress,
    downloadError,
    isFavorite: (trackId) => state.favoriteTrackIds.includes(trackId),
    toggleFavorite: (trackId) => toggleInList('favoriteTrackIds', trackId),
    isAlbumSaved: (albumId) => state.savedAlbumIds.includes(albumId),
    toggleSavedAlbum: (albumId) => toggleInList('savedAlbumIds', albumId),
    isArtistFollowed: (artistId) => state.followedArtistIds.includes(artistId),
    toggleFollowArtist: (artistId) => toggleInList('followedArtistIds', artistId),
    logPlay,
    removeHistoryEntry,
    clearHistory,
    addRecentSearch: (term) => {
      const clean = term.trim();
      if (!clean) return;
      setState((current) => ({ ...current, recentSearches: [clean, ...current.recentSearches.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 8) }));
    },
    removeRecentSearch: (term) => setState((current) => ({ ...current, recentSearches: current.recentSearches.filter((item) => item !== term) })),
    clearRecentSearches: () => setState((current) => ({ ...current, recentSearches: [] })),
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    reorderPlaylistTrack,
    downloadTrack,
    removeDownload,
    clearDownloads,
    updateProfile: (updates) => setState((current) => ({ ...current, profile: { ...current.profile, ...updates } })),
    markNotificationRead: (id) => setState((current) => ({ ...current, notifications: current.notifications.map((item) => item.id === id ? { ...item, read: true } : item) })),
    markAllNotificationsRead: () => setState((current) => ({ ...current, notifications: current.notifications.map((item) => ({ ...item, read: true })) }))
  }), [
    addTrackToPlaylist,
    clearDownloads,
    clearHistory,
    createPlaylist,
    deletePlaylist,
    downloadError,
    downloadProgress,
    downloadTrack,
    hydrated,
    logPlay,
    removeDownload,
    removeHistoryEntry,
    removeTrackFromPlaylist,
    reorderPlaylistTrack,
    state,
    toggleInList,
    updatePlaylist
  ]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryValue {
  const value = useContext(LibraryContext);
  if (!value) throw new Error('useLibrary debe usarse dentro de LibraryProvider.');
  return value;
}
