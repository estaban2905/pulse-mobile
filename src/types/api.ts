export interface Artist {
  id: string;
  name: string;
  photoUrl: string;
  genres: string[];
}

export interface Album {
  id: string;
  title: string;
  artistId: string;
  year: number;
  coverUrl: string;
  accent: string;
}

export interface Track {
  id: string;
  title: string;
  artistId: string;
  albumId: string;
  duration: number;
  codec: 'MP3' | 'AAC' | 'FLAC';
  streamUrl: string;
}

export interface Catalog {
  artists: Artist[];
  albums: Album[];
  tracks: Track[];
}
