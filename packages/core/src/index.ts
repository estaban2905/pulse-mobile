/**
 * Pulse Core — lo que Web y Mobile hacen igual.
 *
 * Todo lo que sale de aquí es o un tipo o una fábrica: nada guarda estado
 * global, porque el estado global es lo que obliga a que exista un único
 * cliente HTTP y un único almacenamiento, que es justo lo que no se puede
 * suponer con un navegador y un teléfono a la vez.
 */

export type { Transport, TransportOptions } from './transport';
export { statusOf, isAbort, JSON_HEADERS } from './transport';

export type { KeyValueStore } from './storage';
export { memoryStore } from './storage';

export type {
  ApiAlbum,
  ApiArtist,
  ApiCatalog,
  ApiEditorialPlaylist,
  ApiGenre,
  ApiMood,
  ApiTrack,
  LyricLine
} from './catalog';

export type {
  ApiHistoryEntry,
  ApiLibrary,
  ApiPreferences,
  LibraryApi,
  LibraryCollection
} from './libraryApi';
export { createLibraryApi } from './libraryApi';

export type {
  ApiPlaylist,
  CreatePlaylistInput,
  PlaylistsApi,
  UpdatePlaylistInput
} from './playlistsApi';
export { createPlaylistsApi } from './playlistsApi';

export type { LibrarySync, LocalLibrary } from './librarySync';
export { createLibrarySync, mergeIds } from './librarySync';

export type { LyricsApi, LyricsResult, LyricsStatus } from './lyricsApi';
export { createLyricsApi } from './lyricsApi';
