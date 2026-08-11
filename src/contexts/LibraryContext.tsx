import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { downloadTrackFile, removeTrackFile } from '../services/downloads';
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

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) setState({ ...initialState, ...(JSON.parse(stored) as Partial<LibraryState>) });
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const toggleInList = useCallback((key: 'favoriteTrackIds' | 'savedAlbumIds' | 'followedArtistIds', id: string) => {
    setState((current) => ({
      ...current,
      [key]: current[key].includes(id) ? current[key].filter((item) => item !== id) : [...current[key], id]
    }));
  }, []);

  const logPlay = useCallback((trackId: string) => {
    setState((current) => ({
      ...current,
      history: [{ id: `${trackId}-${Date.now()}`, trackId, playedAt: new Date().toISOString() }, ...current.history].slice(0, 150)
    }));
  }, []);

  const createPlaylist = useCallback((title: string, description = '') => {
    const now = new Date().toISOString();
    const id = `playlist-${Date.now()}`;
    setState((current) => ({
      ...current,
      playlists: [...current.playlists, { id, title: title.trim() || 'Nueva playlist', description, trackIds: [], createdAt: now, updatedAt: now }]
    }));
    return id;
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
    removeHistoryEntry: (entryId) => setState((current) => ({ ...current, history: current.history.filter((item) => item.id !== entryId) })),
    clearHistory: () => setState((current) => ({ ...current, history: [] })),
    addRecentSearch: (term) => {
      const clean = term.trim();
      if (!clean) return;
      setState((current) => ({ ...current, recentSearches: [clean, ...current.recentSearches.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 8) }));
    },
    removeRecentSearch: (term) => setState((current) => ({ ...current, recentSearches: current.recentSearches.filter((item) => item !== term) })),
    clearRecentSearches: () => setState((current) => ({ ...current, recentSearches: [] })),
    createPlaylist,
    updatePlaylist: (id, updates) => setState((current) => ({
      ...current,
      playlists: current.playlists.map((playlist) => playlist.id === id ? { ...playlist, ...updates, updatedAt: new Date().toISOString() } : playlist)
    })),
    deletePlaylist: (id) => setState((current) => ({ ...current, playlists: current.playlists.filter((playlist) => playlist.id !== id) })),
    addTrackToPlaylist: (playlistId, trackId) => setState((current) => ({
      ...current,
      playlists: current.playlists.map((playlist) => playlist.id === playlistId && !playlist.trackIds.includes(trackId)
        ? { ...playlist, trackIds: [...playlist.trackIds, trackId], updatedAt: new Date().toISOString() }
        : playlist)
    })),
    removeTrackFromPlaylist: (playlistId, trackId) => setState((current) => ({
      ...current,
      playlists: current.playlists.map((playlist) => playlist.id === playlistId
        ? { ...playlist, trackIds: playlist.trackIds.filter((id) => id !== trackId), updatedAt: new Date().toISOString() }
        : playlist)
    })),
    reorderPlaylistTrack: (playlistId, from, to) => setState((current) => ({
      ...current,
      playlists: current.playlists.map((playlist) => {
        if (playlist.id !== playlistId || from < 0 || to < 0 || from >= playlist.trackIds.length || to >= playlist.trackIds.length) return playlist;
        const trackIds = [...playlist.trackIds];
        const [moved] = trackIds.splice(from, 1);
        trackIds.splice(to, 0, moved);
        return { ...playlist, trackIds, updatedAt: new Date().toISOString() };
      })
    })),
    downloadTrack,
    removeDownload,
    clearDownloads,
    updateProfile: (updates) => setState((current) => ({ ...current, profile: { ...current.profile, ...updates } })),
    markNotificationRead: (id) => setState((current) => ({ ...current, notifications: current.notifications.map((item) => item.id === id ? { ...item, read: true } : item) })),
    markAllNotificationsRead: () => setState((current) => ({ ...current, notifications: current.notifications.map((item) => ({ ...item, read: true })) }))
  }), [clearDownloads, createPlaylist, downloadError, downloadProgress, downloadTrack, hydrated, logPlay, removeDownload, state, toggleInList]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryValue {
  const value = useContext(LibraryContext);
  if (!value) throw new Error('useLibrary debe usarse dentro de LibraryProvider.');
  return value;
}
