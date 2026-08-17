import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { NativeModules, Platform } from 'react-native';
import type { RemoteMediaClient } from 'react-native-google-cast';

interface CastTrackRequest {
  trackId: string;
  title: string;
  artist?: string;
  album?: string;
  streamUrl: string;
  coverUrl?: string;
  duration?: number;
  contentType: string;
  startTime: number;
  autoplay: boolean;
}

interface CastSnapshot {
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  volume: number;
}

interface CastValue extends CastSnapshot {
  isAvailable: boolean;
  isConnected: boolean;
  deviceName: string | null;
  error: string | null;
  playbackEndedRevision: number;
  loadTrack: (request: CastTrackRequest) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seek: (seconds: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  showCastDialog: () => Promise<void>;
  disconnect: () => Promise<void>;
}

type GoogleCastModule = typeof import('react-native-google-cast');

const nativeCastAvailable = Boolean(
  NativeModules.RNGCCastContext
  && NativeModules.RNGCSessionManager
  && NativeModules.RNGCRemoteMediaClient
);

const GoogleCast: GoogleCastModule | null = nativeCastAvailable
  ? require('react-native-google-cast') as GoogleCastModule
  : null;

const initialSnapshot: CastSnapshot = {
  isPlaying: false,
  isBuffering: false,
  position: 0,
  duration: 0,
  volume: 0.8
};

const fallbackValue: CastValue = {
  ...initialSnapshot,
  isAvailable: false,
  isConnected: false,
  deviceName: null,
  error: null,
  playbackEndedRevision: 0,
  loadTrack: async () => undefined,
  play: async () => undefined,
  pause: async () => undefined,
  seek: async () => undefined,
  setVolume: async () => undefined,
  showCastDialog: async () => undefined,
  disconnect: async () => undefined
};

const CastContext = createContext<CastValue>(fallbackValue);

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'No se pudo comunicar con la TV.';
}

function NativeCastProvider({ children }: { children: React.ReactNode }) {
  if (!GoogleCast) return <CastContext.Provider value={fallbackValue}>{children}</CastContext.Provider>;

  const client = GoogleCast.useRemoteMediaClient();
  const device = GoogleCast.useCastDevice();
  const mediaStatus = GoogleCast.useMediaStatus();
  const streamPosition = GoogleCast.useStreamPosition(0.5);
  const [snapshot, setSnapshot] = useState<CastSnapshot>(initialSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [playbackEndedRevision, setPlaybackEndedRevision] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void GoogleCast.CastContext.getPlayServicesState()
      .then((state) => {
        if (state && state !== GoogleCast.PlayServicesState.SUCCESS) {
          setError('Google Play Services no esta disponible o necesita actualizarse.');
        }
      })
      .catch((reason: unknown) => setError(errorMessage(reason)));
  }, []);

  useEffect(() => {
    if (!mediaStatus) return;
    setSnapshot((current) => ({
      ...current,
      isPlaying: mediaStatus.playerState === GoogleCast.MediaPlayerState.PLAYING,
      isBuffering:
        mediaStatus.playerState === GoogleCast.MediaPlayerState.BUFFERING
        || mediaStatus.playerState === GoogleCast.MediaPlayerState.LOADING,
      position: mediaStatus.streamPosition ?? current.position,
      duration: mediaStatus.mediaInfo?.streamDuration ?? current.duration,
      volume: mediaStatus.volume ?? current.volume
    }));
  }, [mediaStatus]);

  useEffect(() => {
    if (streamPosition === null) return;
    setSnapshot((current) => ({ ...current, position: streamPosition }));
  }, [streamPosition]);

  useEffect(() => {
    if (!client) return;
    const subscription = client.onMediaPlaybackEnded(() => {
      setSnapshot((current) => ({ ...current, isPlaying: false, isBuffering: false }));
      setPlaybackEndedRevision((revision) => revision + 1);
    });
    return () => subscription.remove();
  }, [client]);

  const run = useCallback(async (operation: (remote: RemoteMediaClient) => Promise<void>) => {
    if (!client) {
      setError('Selecciona una TV antes de enviar musica.');
      return;
    }
    try {
      setError(null);
      await operation(client);
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }, [client]);

  const loadTrack = useCallback(async (request: CastTrackRequest) => {
    if (!/^https?:\/\//i.test(request.streamUrl)) {
      setError('La TV necesita una URL HTTP o HTTPS accesible desde la red.');
      return;
    }

    setSnapshot((current) => ({
      ...current,
      isPlaying: request.autoplay,
      isBuffering: true,
      position: request.startTime,
      duration: request.duration ?? current.duration
    }));

    await run((remote) => remote.loadMedia({
      autoplay: request.autoplay,
      startTime: Math.max(0, request.startTime),
      mediaInfo: {
        contentId: request.trackId,
        contentUrl: request.streamUrl,
        contentType: request.contentType,
        streamDuration: request.duration,
        customData: { trackId: request.trackId },
        metadata: {
          type: 'musicTrack',
          title: request.title,
          artist: request.artist,
          albumTitle: request.album,
          images: request.coverUrl && /^https?:\/\//i.test(request.coverUrl)
            ? [{ url: request.coverUrl }]
            : undefined
        }
      }
    }));
  }, [run]);

  const disconnect = useCallback(async () => {
    if (!client) return;
    try {
      setError(null);
      await client.stop();
      setSnapshot((current) => ({ ...current, isPlaying: false, isBuffering: false }));
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }, [client]);

  const value = useMemo<CastValue>(() => ({
    ...snapshot,
    isAvailable: true,
    isConnected: Boolean(client),
    deviceName: device?.friendlyName ?? null,
    error,
    playbackEndedRevision,
    loadTrack,
    play: () => run((remote) => remote.play()),
    pause: () => run((remote) => remote.pause()),
    seek: (seconds) => run((remote) => remote.seek({ position: Math.max(0, seconds) })),
    setVolume: (volume) => run((remote) => remote.setStreamVolume(Math.max(0, Math.min(1, volume)))),
    showCastDialog: async () => {
      try {
        setError(null);
        const shown = await GoogleCast.CastContext.showCastDialog();
        if (!shown) setError('No se pudo abrir el selector de dispositivos.');
      } catch (reason) {
        setError(errorMessage(reason));
      }
    },
    disconnect
  }), [client, device?.friendlyName, error, loadTrack, playbackEndedRevision, run, snapshot, disconnect]);

  return <CastContext.Provider value={value}>{children}</CastContext.Provider>;
}

export function CastProvider({ children }: { children: React.ReactNode }) {
  if (!nativeCastAvailable) {
    return <CastContext.Provider value={fallbackValue}>{children}</CastContext.Provider>;
  }
  return <NativeCastProvider>{children}</NativeCastProvider>;
}

export function useCast(): CastValue {
  return useContext(CastContext);
}

export function getNativeCastButton() {
  return GoogleCast?.CastButton ?? null;
}