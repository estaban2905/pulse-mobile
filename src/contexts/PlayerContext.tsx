import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useCatalog } from './CatalogContext';
import { useLibrary } from './LibraryContext';
import { useSettings } from './SettingsContext';
import type { Track } from '../types/api';
import type { RepeatMode } from '../types/app';
import { resolveTrackCoverUrl } from '../utils/artwork';

interface PlayerValue {
  queue: string[];
  index: number;
  current: Track | null;
  contextLabel: string;
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  error: string | null;
  sleepEndsAt: number | null;
  playTracks: (trackIds: string[], startIndex?: number, label?: string) => void;
  playTrack: (trackId: string, label?: string) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setVolume: (value: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (trackIds: string[]) => void;
  playNext: (trackId: string) => void;
  removeFromQueue: (position: number) => void;
  moveInQueue: (from: number, to: number) => void;
  clearUpcoming: () => void;
  setSleepTimer: (minutes: number | null) => void;
}

const PlayerContext = createContext<PlayerValue | null>(null);
const PLAYER_STORAGE_KEY = 'pulse-mobile:player:v1';

interface StoredPlayerState {
  queue: string[];
  index: number;
  contextLabel: string;
  position: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
}

function shuffled(items: string[]): string[] {
  const result = [...items];
  for (let itemIndex = result.length - 1; itemIndex > 0; itemIndex -= 1) {
    const nextIndex = Math.floor(Math.random() * (itemIndex + 1));
    [result[itemIndex], result[nextIndex]] = [result[nextIndex], result[itemIndex]];
  }
  return result;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { catalog, getTrack, getAlbum, getArtist } = useCatalog();
  const { downloadedTracks, logPlay } = useLibrary();
  const { settings } = useSettings();
  const audio = useAudioPlayer(null, { updateInterval: 400 });
  const status = useAudioPlayerStatus(audio);
  const [queue, setQueue] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [contextLabel, setContextLabel] = useState('Pulse Music');
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [volume, setVolumeState] = useState(0.8);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [loadRevision, setLoadRevision] = useState(0);
  const [sleepEndsAt, setSleepEndsAt] = useState<number | null>(null);
  const shouldAutoplay = useRef(false);
  const lastLogged = useRef<string | null>(null);
  const restored = useRef(false);
  const pendingSeek = useRef<number | null>(null);
  const storedState = useRef<StoredPlayerState | null>(null);

  const current = getTrack(queue[index] ?? '') ?? null;
  const currentSource = current ? (downloadedTracks[current.id] ?? current.streamUrl) : null;
  const currentAlbum = current ? getAlbum(current.albumId) : undefined;
  const currentArtist = current ? getArtist(current.artistId) : undefined;
  const currentArtworkUrl = resolveTrackCoverUrl(current, currentAlbum);

  useEffect(() => {
    if (!catalog || restored.current) return;
    restored.current = true;
    void AsyncStorage.getItem(PLAYER_STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as Partial<StoredPlayerState>;
        const validQueue = (saved.queue ?? []).filter((id) => Boolean(getTrack(id)));
        if (!validQueue.length) return;
        shouldAutoplay.current = false;
        pendingSeek.current = Math.max(0, saved.position ?? 0);
        setQueue(validQueue);
        setIndex(Math.min(Math.max(0, saved.index ?? 0), validQueue.length - 1));
        setContextLabel(saved.contextLabel || 'Pulse Music');
        setVolumeState(Math.max(0, Math.min(1, saved.volume ?? 0.8)));
        setShuffle(Boolean(saved.shuffle));
        setRepeat(saved.repeat === 'all' || saved.repeat === 'one' ? saved.repeat : 'off');
      } catch {
        void AsyncStorage.removeItem(PLAYER_STORAGE_KEY);
      }
    }).catch(() => undefined);
  }, [catalog, getTrack]);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix'
    }).catch((reason: unknown) => {
      setAudioError(reason instanceof Error ? reason.message : 'No se pudo configurar el audio.');
    });
  }, []);

  useEffect(() => () => audio.setActiveForLockScreen(false), [audio]);

  useEffect(() => { audio.volume = volume; }, [audio, volume]);
  useEffect(() => { audio.loop = repeat === 'one'; }, [audio, repeat]);
  useEffect(() => {
    if (status.isLoaded && pendingSeek.current !== null) {
      const nextPosition = pendingSeek.current;
      pendingSeek.current = null;
      void audio.seekTo(nextPosition);
    }
  }, [audio, status.isLoaded]);

  useEffect(() => {
    storedState.current = {
      queue,
      index,
      contextLabel,
      position: status.currentTime ?? 0,
      volume,
      shuffle,
      repeat
    };
  }, [contextLabel, index, queue, repeat, shuffle, status.currentTime, volume]);

  useEffect(() => {
    const save = () => {
      if (restored.current && storedState.current) {
        void AsyncStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(storedState.current));
      }
    };
    const timer = setInterval(save, 5_000);
    return () => {
      clearInterval(timer);
      save();
    };
  }, []);

  useEffect(() => {
    if (!current || !currentSource) return;
    setAudioError(null);
    audio.replace(currentSource);
    if (shouldAutoplay.current) audio.play();
  }, [audio, current?.id, currentSource, loadRevision]);

  useEffect(() => {
    if (!current) return;
    audio.setActiveForLockScreen(true, {
      title: current.title,
      artist: currentArtist?.name,
      albumTitle: currentAlbum?.title,
      artworkUrl: currentArtworkUrl
    }, { showSeekBackward: true, showSeekForward: true });
  }, [
    audio,
    current?.id,
    current?.title,
    currentAlbum?.title,
    currentArtist?.name,
    currentArtworkUrl
  ]);

  useEffect(() => {
    if (current && status.playing && lastLogged.current !== current.id && !settings.privateSession) {
      lastLogged.current = current.id;
      logPlay(current.id);
    }
  }, [current, logPlay, settings.privateSession, status.playing]);

  const next = useCallback(() => {
    if (!queue.length) return;
    if (index < queue.length - 1) {
      shouldAutoplay.current = true;
      setIndex((value) => value + 1);
      return;
    }
    if (repeat === 'all' || settings.autoplay) {
      shouldAutoplay.current = true;
      setIndex(0);
      setLoadRevision((value) => value + 1);
      return;
    }
    shouldAutoplay.current = false;
    audio.pause();
  }, [audio, index, queue.length, repeat, settings.autoplay]);

  useEffect(() => {
    if (!status.didJustFinish) return;
    if (repeat !== 'one') next();
  }, [next, repeat, status.didJustFinish]);

  useEffect(() => {
    if (!sleepEndsAt) return;
    const remaining = sleepEndsAt - Date.now();
    if (remaining <= 0) {
      shouldAutoplay.current = false;
      audio.pause();
      setSleepEndsAt(null);
      return;
    }
    const timer = setTimeout(() => {
      shouldAutoplay.current = false;
      audio.pause();
      setSleepEndsAt(null);
    }, remaining);
    return () => clearTimeout(timer);
  }, [audio, sleepEndsAt]);

  const playTracks = useCallback((trackIds: string[], startIndex = 0, label = 'Reproduciendo') => {
    const valid = trackIds.filter((id) => Boolean(getTrack(id)));
    if (!valid.length) return;
    const safeIndex = Math.min(Math.max(0, startIndex), valid.length - 1);
    const selectedId = valid[safeIndex];
    const ordered = shuffle ? [selectedId, ...shuffled(valid.filter((id) => id !== selectedId))] : valid;
    shouldAutoplay.current = true;
    lastLogged.current = null;
    setQueue(ordered);
    setIndex(shuffle ? 0 : safeIndex);
    setContextLabel(label);
    setLoadRevision((value) => value + 1);
  }, [getTrack, shuffle]);

  const previous = useCallback(() => {
    if (!queue.length) return;

    if (index > 0) {
      shouldAutoplay.current = status.playing;
      setIndex((value) => Math.max(0, value - 1));
      return;
    }

    if (repeat === 'all' && queue.length > 1) {
      shouldAutoplay.current = status.playing;
      setIndex(queue.length - 1);
      return;
    }

    void audio.seekTo(0);
  }, [audio, index, queue.length, repeat, status.playing]);

  const value = useMemo<PlayerValue>(() => ({
    queue,
    index,
    current,
    contextLabel,
    isPlaying: status.playing,
    isBuffering: status.isBuffering,
    position: status.currentTime ?? 0,
    duration: status.duration || current?.duration || 0,
    volume,
    shuffle,
    repeat,
    error: status.error ?? audioError,
    sleepEndsAt,
    playTracks,
    playTrack: (trackId, label = 'Reproduciendo') => playTracks([trackId], 0, label),
    toggle: () => {
      if (!current) {
        const ids = catalog?.tracks.map((track) => track.id) ?? [];
        playTracks(ids, 0, 'Tu colección local');
      } else if (status.playing) {
        shouldAutoplay.current = false;
        audio.pause();
      } else {
        shouldAutoplay.current = true;
        audio.play();
      }
    },
    next,
    previous,
    seek: (seconds) => {
      const target = Math.max(0, Math.min(seconds, status.duration || current?.duration || 0));
      void audio.seekTo(target);
    },
    setVolume: (value) => {
      const target = Math.max(0, Math.min(1, value));
      setVolumeState(target);
    },
    toggleShuffle: () => setShuffle((value) => !value),
    cycleRepeat: () => setRepeat((value) => value === 'off' ? 'all' : value === 'all' ? 'one' : 'off'),
    addToQueue: (trackIds) => setQueue((currentQueue) => [...currentQueue, ...trackIds.filter((id) => !currentQueue.includes(id) && Boolean(getTrack(id)))]),
    playNext: (trackId) => setQueue((currentQueue) => {
      const nextQueue = currentQueue.filter((id) => id !== trackId);
      nextQueue.splice(index + 1, 0, trackId);
      return nextQueue;
    }),
    removeFromQueue: (position) => {
      if (position === index) return;
      setQueue((currentQueue) => currentQueue.filter((_, itemIndex) => itemIndex !== position));
      if (position < index) setIndex((value) => Math.max(0, value - 1));
    },
    moveInQueue: (from, to) => {
      if (from === index || to === index || from < 0 || to < 0 || from >= queue.length || to >= queue.length) return;
      setQueue((currentQueue) => {
        const currentId = currentQueue[index];
        const nextQueue = [...currentQueue];
        const [moved] = nextQueue.splice(from, 1);
        nextQueue.splice(to, 0, moved);
        setIndex(nextQueue.indexOf(currentId));
        return nextQueue;
      });
    },
    clearUpcoming: () => setQueue((currentQueue) => currentQueue.slice(0, index + 1)),
    setSleepTimer: (minutes) => setSleepEndsAt(minutes ? Date.now() + minutes * 60_000 : null)
  }), [audio, audioError, catalog?.tracks, contextLabel, current, getTrack, index, next, playTracks, previous, queue, repeat, shuffle, sleepEndsAt, status]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerValue {
  const value = useContext(PlayerContext);
  if (!value) throw new Error('usePlayer debe usarse dentro de PlayerProvider.');
  return value;
}