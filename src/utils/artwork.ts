import type { Album, Track } from '../types/api';

type TrackArtwork = Pick<Track, 'coverUrl'> | null | undefined;
type AlbumArtwork = Pick<Album, 'coverUrl'> | null | undefined;

/**
 * Prefers track artwork while remaining compatible with catalog snapshots
 * created before tracks exposed their own coverUrl.
 */
export function resolveTrackCoverUrl(track: TrackArtwork, album: AlbumArtwork): string | undefined {
  const trackCoverUrl = track?.coverUrl?.trim();
  if (trackCoverUrl) return trackCoverUrl;

  const albumCoverUrl = album?.coverUrl?.trim();
  return albumCoverUrl || undefined;
}
