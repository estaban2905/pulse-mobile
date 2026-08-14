export type RepeatMode = 'off' | 'all' | 'one';

export interface HistoryEntry { id: string; trackId: string; playedAt: string; }

export interface UserPlaylist {
  id: string;
  /**
   * UUID de la misma playlist en el servidor, cuando ya se subió.
   *
   * Va aparte y no sustituye a `id` porque el identificador local ya está en
   * uso —la pantalla abierta, la navegación— y cambiarlo por el del servidor
   * rompería el enlace que el usuario está viendo. Ausente en las creadas sin
   * conexión, que es justo lo que las marca como pendientes de subir.
   */
  remoteId?: string;
  title: string;
  description: string;
  trackIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Profile { name: string; email: string; plan: 'Demo' | 'Premium'; }

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  kind: 'release' | 'recommendation' | 'download';
}

export interface LibraryState {
  favoriteTrackIds: string[];
  savedAlbumIds: string[];
  followedArtistIds: string[];
  history: HistoryEntry[];
  playlists: UserPlaylist[];
  recentSearches: string[];
  downloadedTracks: Record<string, string>;
  profile: Profile;
  notifications: AppNotification[];
}

export interface AudioSettings {
  autoplay: boolean;
  normalizeVolume: boolean;
  allowExplicit: boolean;
  dataSaver: boolean;
  wifiOnlyDownloads: boolean;
  privateSession: boolean;
  playbackQuality: 'normal' | 'high' | 'very-high';
  downloadQuality: 'normal' | 'high' | 'very-high';
}
