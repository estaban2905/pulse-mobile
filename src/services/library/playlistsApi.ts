import { createPlaylistsApi } from '@pulse/core';
import { apiRequest } from '../api';

export const playlistsApi = createPlaylistsApi(apiRequest);

export type { ApiPlaylist, CreatePlaylistInput, UpdatePlaylistInput } from '@pulse/core';
