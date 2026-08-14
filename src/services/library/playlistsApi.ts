import { apiRequest } from '../api';

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

export interface CreatePlaylistInput {
  title: string;
  description?: string;
  trackIds?: string[];
}

/**
 * Cambios sobre una playlist.
 *
 * `trackIds` sustituye la lista entera en el orden que se manda, así que sirve
 * igual para añadir, quitar y reordenar: el cliente manda el resultado que
 * quiere, no la operación que hizo. Eso hace que dos ediciones seguidas no
 * puedan cruzarse y dejar la lista a medias.
 */
export interface UpdatePlaylistInput {
  title?: string;
  description?: string;
  trackIds?: string[];
}

function list(): Promise<ApiPlaylist[]> {
  return apiRequest<ApiPlaylist[]>('/me/playlists');
}

function create(input: CreatePlaylistInput): Promise<ApiPlaylist> {
  return apiRequest<ApiPlaylist>('/me/playlists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
}

function update(playlistId: string, patch: UpdatePlaylistInput): Promise<ApiPlaylist> {
  return apiRequest<ApiPlaylist>(`/me/playlists/${encodeURIComponent(playlistId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  });
}

function remove(playlistId: string): Promise<void> {
  return apiRequest<void>(`/me/playlists/${encodeURIComponent(playlistId)}`, { method: 'DELETE' });
}

export const playlistsApi = { list, create, update, remove } as const;
