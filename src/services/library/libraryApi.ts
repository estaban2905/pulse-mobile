import { apiRequest } from '../api';

/** Historial tal y como lo devuelve el servidor. */
export interface ApiHistoryEntry {
  id: string;
  trackId: string;
  playedAt: string;
  progress: number;
  completed: boolean;
}

export interface ApiPreferences {
  theme: string;
  language: string;
  streamQuality: string;
  downloadQuality: string;
  autoplay: boolean;
  crossfade: number;
  normalize: boolean;
  privateSession: boolean;
  favouriteGenres: string[];
}

export interface ApiLibrary {
  favourites: string[];
  savedAlbums: string[];
  followedArtists: string[];
  history: ApiHistoryEntry[];
  preferences: ApiPreferences | null;
}

/** Las tres colecciones que se sincronizan igual, con el mismo verbo. */
export type LibraryCollection = 'favourites' | 'albums' | 'artists';

const path: Record<LibraryCollection, string> = {
  favourites: 'favourites',
  albums: 'albums',
  artists: 'artists'
};

function fetchLibrary(): Promise<ApiLibrary> {
  return apiRequest<ApiLibrary>('/me/library');
}

/**
 * Añade o quita un elemento de una colección.
 *
 * Un solo verbo para las tres porque el servidor las trata igual: `PUT` deja la
 * fila puesta y `DELETE` la deja quitada, sin importar cómo estaban antes. Eso
 * hace que reintentar sea inofensivo, que es justo lo que necesita un cliente
 * que pierde la cobertura a media pulsación.
 */
function setMembership(collection: LibraryCollection, id: string, member: boolean): Promise<unknown> {
  return apiRequest(`/me/${path[collection]}/${encodeURIComponent(id)}`, {
    method: member ? 'PUT' : 'DELETE'
  });
}

function logPlay(trackId: string): Promise<ApiHistoryEntry> {
  return apiRequest<ApiHistoryEntry>('/me/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trackId })
  });
}

function removeHistoryEntry(entryId: string): Promise<void> {
  return apiRequest<void>(`/me/history/${encodeURIComponent(entryId)}`, { method: 'DELETE' });
}

function clearHistory(): Promise<void> {
  return apiRequest<void>('/me/history', { method: 'DELETE' });
}

/** Preferencias efectivas: una cuenta sin nada guardado recibe las de fábrica. */
function getPreferences(): Promise<ApiPreferences> {
  return apiRequest<ApiPreferences>('/me/preferences');
}

/** Cambia preferencias sueltas. `favouriteGenres` sustituye la lista entera. */
function updatePreferences(patch: Partial<ApiPreferences>): Promise<ApiPreferences> {
  return apiRequest<ApiPreferences>('/me/preferences', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  });
}

export const libraryApi = {
  fetch: fetchLibrary,
  setMembership,
  logPlay,
  removeHistoryEntry,
  clearHistory,
  getPreferences,
  updatePreferences
} as const;
