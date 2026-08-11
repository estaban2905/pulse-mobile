export type RepeatMode = 'off' | 'all' | 'one';

export interface HistoryEntry { id: string; trackId: string; playedAt: string; }

export interface UserPlaylist {
  id: string;
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
