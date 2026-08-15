export interface Artist {
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

export interface Album {
  id: string;
  slug?: string;
  title: string;
  artistId: string;
  year: number;
  genre?: string;
  coverUrl: string;
  accent: string;
}

export interface Track {
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
  /** Effective track artwork from newer APIs; absent in older catalog caches. */
  coverUrl?: string;
}

/**
 * Contenido editorial. Vive en la base de datos, no en el cliente.
 *
 * Estaba escrito a mano en `data/discovery.ts`, con sus propios colores y una
 * lista de dieciséis canciones: añadir un género obligaba a publicar una
 * versión nueva de la app, y lo que se veía no tenía por qué parecerse a lo que
 * había en el catálogo.
 */
export interface Genre {
  id: string;
  slug: string;
  name: string;
  color: string;
}

export interface Mood {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** Nombre de icono de Lucide, que es lo que usa la web. */
  icon: string;
  color: string;
  trackIds: string[];
}

/** Una línea de letra. `time` es 0 en todas cuando la letra no está sincronizada. */
export interface LyricLine {
  time: number;
  text: string;
}

/** Playlist de Pulse, no del usuario: las suyas viven en `LibraryContext`. */
export interface EditorialPlaylist {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  trackIds: string[];
}

export interface Catalog {
  artists: Artist[];
  albums: Album[];
  tracks: Track[];
  genres: Genre[];
  moods: Mood[];
  playlists: EditorialPlaylist[];
}
