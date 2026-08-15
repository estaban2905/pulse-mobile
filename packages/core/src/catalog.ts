/**
 * Lo que devuelve `GET /catalog`.
 *
 * Son los tipos del contrato, no los de las pantallas. Cada cliente sigue
 * teniendo los suyos —la web añade colores y popularidad, la app añade la ruta
 * del archivo descargado— y eso está bien: lo que no puede divergir es la forma
 * de lo que llega por el cable, porque de eso decide el servidor.
 */

export interface ApiArtist {
  id: string;
  slug?: string;
  name: string;
  photoUrl: string;
  bio?: string | null;
  genres: string[];
  /** Seguidores reales, contados sobre las cuentas que lo siguen. */
  followers?: number;
  plays?: number;
}

export interface ApiAlbum {
  id: string;
  slug?: string;
  title: string;
  artistId: string;
  year: number;
  genre?: string;
  coverUrl: string;
  accent: string;
}

export interface ApiTrack {
  id: string;
  slug?: string;
  title: string;
  artistId: string;
  albumId: string;
  duration: number;
  codec: 'MP3' | 'AAC' | 'FLAC';
  genre?: string;
  explicit?: boolean;
  plays?: number;
  streamUrl: string;
  /** Portada efectiva; ausente en cachés de catálogo anteriores a que existiera. */
  coverUrl?: string;
}

export interface ApiGenre {
  id: string;
  slug: string;
  name: string;
  color: string;
}

export interface ApiMood {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** Nombre de icono de Lucide. La app lo traduce al suyo. */
  icon: string;
  color: string;
  trackIds: string[];
}

/** Playlist de Pulse, sin dueño. Las del usuario llegan por `/me/playlists`. */
export interface ApiEditorialPlaylist {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  trackIds: string[];
}

export interface ApiCatalog {
  artists: ApiArtist[];
  albums: ApiAlbum[];
  tracks: ApiTrack[];
  genres: ApiGenre[];
  moods: ApiMood[];
  playlists: ApiEditorialPlaylist[];
}

/** Una línea de letra. `time` es 0 en todas cuando la letra no está sincronizada. */
export interface LyricLine {
  time: number;
  text: string;
}
