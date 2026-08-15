import { JSON_HEADERS, type Transport } from './transport';

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

export interface LibraryApi {
  fetch(): Promise<ApiLibrary>;
  setMembership(collection: LibraryCollection, id: string, member: boolean): Promise<unknown>;
  logPlay(trackId: string): Promise<ApiHistoryEntry>;
  removeHistoryEntry(entryId: string): Promise<void>;
  clearHistory(): Promise<void>;
  getPreferences(): Promise<ApiPreferences>;
  updatePreferences(patch: Partial<ApiPreferences>): Promise<ApiPreferences>;
}

export function createLibraryApi(request: Transport): LibraryApi {
  return {
    fetch: () => request<ApiLibrary>('/me/library'),

    /**
     * Añade o quita un elemento de una colección.
     *
     * Un solo verbo para las tres porque el servidor las trata igual: `PUT`
     * deja la fila puesta y `DELETE` la deja quitada, sin importar cómo estaban
     * antes. Eso hace que reintentar sea inofensivo, que es justo lo que
     * necesita un cliente que pierde la cobertura a media pulsación.
     */
    setMembership: (collection, id, member) =>
      request(`/me/${path[collection]}/${encodeURIComponent(id)}`, {
        method: member ? 'PUT' : 'DELETE'
      }),

    logPlay: (trackId) =>
      request<ApiHistoryEntry>('/me/history', {
        method: 'POST',
        headers: { ...JSON_HEADERS },
        body: JSON.stringify({ trackId })
      }),

    removeHistoryEntry: (entryId) =>
      request<void>(`/me/history/${encodeURIComponent(entryId)}`, { method: 'DELETE' }),

    clearHistory: () => request<void>('/me/history', { method: 'DELETE' }),

    /** Preferencias efectivas: una cuenta sin nada guardado recibe las de fábrica. */
    getPreferences: () => request<ApiPreferences>('/me/preferences'),

    /** Cambia preferencias sueltas. `favouriteGenres` sustituye la lista entera. */
    updatePreferences: (patch) =>
      request<ApiPreferences>('/me/preferences', {
        method: 'PATCH',
        headers: { ...JSON_HEADERS },
        body: JSON.stringify(patch)
      })
  };
}
