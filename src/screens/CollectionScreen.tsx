import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  MediaCard,
  Screen,
  ScreenHeader,
  Section,
  TrackActionsModal,
  TrackRow
} from '../components';
import { useCatalog } from '../contexts/CatalogContext';
import { useLibrary } from '../contexts/LibraryContext';
import { usePlayer } from '../contexts/PlayerContext';
import { genreColors, moods } from '../data/discovery';
import { colors, radii, spacing, typography } from '../theme';
import { goBackOrReplace } from '../navigation/goBack';
import type { Track } from '../types/api';
import { formatDuration } from '../utils/format';

function singleParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function clean(value: string): string {
  try {
    return decodeURIComponent(value).replace(/-/g, ' ').trim();
  } catch {
    return value.replace(/-/g, ' ').trim();
  }
}

export function CollectionScreen() {
  const params = useLocalSearchParams<{
    kind?: string | string[];
    type?: string | string[];
    id?: string | string[];
  }>();
  const rawKind = singleParam(params.kind ?? params.type);
  const rawId = singleParam(params.id);
  const kind = (rawKind || (['favorites', 'favourites', 'new'].includes(rawId) ? rawId : 'mood')).toLowerCase();
  const id = rawKind ? rawId : (['favorites', 'favourites', 'new'].includes(rawId) ? '' : rawId);
  const { catalog, loading, error, refresh, getTrack, getArtist } = useCatalog();
  const library = useLibrary();
  const player = usePlayer();
  const [actionTrack, setActionTrack] = useState<Track | null>(null);

  const config = useMemo(() => {
    const isFavorites = kind === 'favorites' || kind === 'favourites' || kind === 'favorite';
    if (isFavorites) {
      return {
        title: 'Canciones favoritas',
        subtitle: 'Tu selección personal',
        accent: colors.accentStrong,
        trackIds: library.favoriteTrackIds,
        newReleases: false
      };
    }
    if (kind === 'genre') {
      const requested = clean(id).toLocaleLowerCase('es');
      const canonicalGenre = Object.keys(genreColors).find((genre) => genre.toLocaleLowerCase('es') === requested) ?? clean(id);
      const trackIds = catalog?.tracks.filter((track) => {
        const artist = getArtist(track.artistId);
        return artist?.genres.some((genre) => genre.toLocaleLowerCase('es') === canonicalGenre.toLocaleLowerCase('es'));
      }).map((track) => track.id) ?? [];
      return {
        title: canonicalGenre || 'Género',
        subtitle: 'Canciones y artistas del género',
        accent: genreColors[canonicalGenre] ?? colors.accentStrong,
        trackIds,
        newReleases: false
      };
    }
    if (kind === 'new') {
      return {
        title: 'Nuevos lanzamientos',
        subtitle: 'Lo más reciente del catálogo',
        accent: colors.accentStrong,
        trackIds: [] as string[],
        newReleases: true
      };
    }
    const mood = moods.find((item) => item.id === id);
    return {
      title: mood?.name ?? 'Colección',
      subtitle: mood?.description ?? 'Música seleccionada para este momento',
      accent: mood?.color ?? colors.accentStrong,
      trackIds: mood?.trackIds ?? [],
      newReleases: false
    };
  }, [catalog?.tracks, getArtist, id, kind, library.favoriteTrackIds]);

  const tracks = config.trackIds.map((trackId) => getTrack(trackId)).filter((track): track is Track => Boolean(track));
  const queue = tracks.map((track) => track.id);
  const albums = useMemo(
    () => [...(catalog?.albums ?? [])].sort((left, right) => right.year - left.year),
    [catalog?.albums]
  );
  const duration = tracks.reduce((sum, track) => sum + track.duration, 0);

  if (loading) return <Screen><LoadingState label="Cargando colección…" /></Screen>;
  if (error) return <Screen><ErrorState message={error} onRetry={() => void refresh()} /></Screen>;

  const play = () => player.playTracks(queue, 0, config.title);
  const playShuffled = () => {
    if (!player.shuffle) player.toggleShuffle();
    player.playTracks(queue, 0, config.title);
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <ScreenHeader title="Colección" onBack={() => goBackOrReplace('/search')} />
      <View style={[styles.hero, { backgroundColor: `${config.accent}32`, borderColor: `${config.accent}66` }]}>
        <Text style={styles.eyebrow}>{kind === 'genre' ? 'GÉNERO' : kind === 'mood' ? 'PARA TU MOMENTO' : 'TU MÚSICA'}</Text>
        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.subtitle}>{config.subtitle}</Text>
        {!config.newReleases && tracks.length ? (
          <Text style={styles.meta}>{tracks.length} canciones · {formatDuration(duration)}</Text>
        ) : null}
        {!config.newReleases && tracks.length ? (
          <View style={styles.actions}>
            <IconButton name="shuffle" active={player.shuffle} filled onPress={playShuffled} accessibilityLabel="Reproducir aleatoriamente" />
            <IconButton name="play" filled size={52} onPress={play} accessibilityLabel="Reproducir colección" />
          </View>
        ) : null}
      </View>

      {config.newReleases ? (
        <Section title="Últimos lanzamientos" horizontal>
          {albums.map((album) => {
            const artist = getArtist(album.artistId);
            return (
              <MediaCard
                key={album.id}
                image={album.coverUrl}
                title={album.title}
                subtitle={`${artist?.name ?? ''} · ${album.year}`}
                onPress={() => router.push(`/album/${album.id}`)}
              />
            );
          })}
        </Section>
      ) : tracks.length ? (
        <View style={styles.trackList}>
          {tracks.map((track, position) => (
            <TrackRow
              key={track.id}
              track={track}
              queue={queue}
              position={position}
              contextLabel={config.title}
              showAlbum
              onMore={() => setActionTrack(track)}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon={kind.startsWith('fav') ? 'heart-outline' : 'musical-notes-outline'}
          title="Todavía no hay nada aquí"
          description={kind.startsWith('fav') ? 'Toca el corazón de una canción para guardarla aquí.' : 'Explora el catálogo para encontrar más música.'}
          actionLabel="Explorar"
          onAction={() => router.push('/search')}
        />
      )}

      <TrackActionsModal track={actionTrack} visible={Boolean(actionTrack)} onClose={() => setActionTrack(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 132 },
  hero: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.xl,
    borderRadius: radii.xl,
    borderWidth: 1
  },
  eyebrow: { ...typography.eyebrow, color: colors.accent },
  title: { ...typography.title, color: colors.text, marginTop: spacing.sm },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm },
  meta: { ...typography.caption, color: colors.textDim, marginTop: spacing.md },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.xl },
  trackList: { paddingHorizontal: spacing.md }
});

export default CollectionScreen;
