import { JSON_HEADERS, type Transport } from './transport';

/** Playlist propia tal y como la devuelve el servidor. */
export interface ApiPlaylist {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  isPublic: boolean;
  collaborative: boolean;
  updatedAt: string;
  trackIds: string[];
}

/**
 * Estos dos tipos siguen a `CreatePlaylistDto` y `UpdatePlaylistDto` del API,
 * campo por campo.
 *
 * Cuando estaban duplicados no seguían a nada: la copia de la web aceptaba
 * `coverUrl` e `isPublic` y la de la app no, así que desde el teléfono no se
 * podía poner portada a una playlist —no porque el servidor lo rechazara, sino
 * porque el tipo del cliente no dejaba mandarlo—.
 */
export interface CreatePlaylistInput {
  title: string;
  description?: string;
  /** URL absoluta o ruta `/media/covers/...`. */
  coverUrl?: string;
  /** En el orden en que deben quedar. */
  trackIds?: string[];
}

/**
 * Cambios sobre una playlist. Hay que mandar al menos uno.
 *
 * `trackIds` sustituye la lista entera en el orden que se manda, así que sirve
 * igual para añadir, quitar y reordenar: el cliente manda el resultado que
 * quiere, no la operación que hizo. Eso hace que dos ediciones seguidas no
 * puedan cruzarse y dejar la lista a medias.
 */
export interface UpdatePlaylistInput {
  title?: string;
  description?: string | null;
  /** `null` quita la portada. */
  coverUrl?: string | null;
  isPublic?: boolean;
  trackIds?: string[];
}

export interface PlaylistsApi {
  list(): Promise<ApiPlaylist[]>;
  create(input: CreatePlaylistInput): Promise<ApiPlaylist>;
  update(playlistId: string, patch: UpdatePlaylistInput): Promise<ApiPlaylist>;
  remove(playlistId: string): Promise<void>;
}

export function createPlaylistsApi(request: Transport): PlaylistsApi {
  const json = (method: string, body: unknown) => ({
    method,
    headers: { ...JSON_HEADERS },
    body: JSON.stringify(body)
  });

  return {
    list: () => request<ApiPlaylist[]>('/me/playlists'),
    create: (input) => request<ApiPlaylist>('/me/playlists', json('POST', input)),
    update: (playlistId, patch) =>
      request<ApiPlaylist>(`/me/playlists/${encodeURIComponent(playlistId)}`, json('PATCH', patch)),
    remove: (playlistId) =>
      request<void>(`/me/playlists/${encodeURIComponent(playlistId)}`, { method: 'DELETE' })
  };
}
