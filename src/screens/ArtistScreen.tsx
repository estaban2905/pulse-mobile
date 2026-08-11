import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Chip,
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
import { colors, radii, spacing, typography } from '../theme';
import { goBackOrReplace } from '../navigation/goBack';
import type { Track } from '../types/api';

function singleParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export function ArtistScreen() {
  const params = useLocalSearchParams<{ id?: string | string[]; artistId?: string | string[] }>();
  const artistId = singleParam(params.id ?? params.artistId);
  const { catalog, loading, error, refresh, getArtist, tracksForArtist, albumsForArtist } = useCatalog();
  const library = useLibrary();
  const player = usePlayer();
  const [actionTrack, setActionTrack] = useState<Track | null>(null);

  const artist = getArtist(artistId);
  const tracks = useMemo(() => artist ? tracksForArtist(artist.id) : [], [artist, tracksForArtist]);
  const albums = useMemo(() => artist ? albumsForArtist(artist.id) : [], [albumsForArtist, artist]);
  const queue = tracks.map((track) => track.id);
  const similarArtists = useMemo(() => {
    if (!artist || !catalog) return [];
    return catalog.artists
      .filter((item) => item.id !== artist.id && item.genres.some((genre) => artist.genres.includes(genre)))
      .slice(0, 8);
  }, [artist, catalog]);

  if (loading) return <Screen><LoadingState label="Cargando artista…" /></Screen>;
  if (error) return <Screen><ErrorState message={error} onRetry={() => void refresh()} /></Screen>;
  if (!artist) {
    return (
      <Screen>
        <ScreenHeader title="Artista" onBack={() => goBackOrReplace('/')} />
        <EmptyState
          icon="person-outline"
          title="Artista no encontrado"
          description="Ese perfil no está disponible en el catálogo."
          actionLabel="Volver"
          onAction={() => goBackOrReplace('/')}
        />
      </Screen>
    );
  }

  const followed = library.isArtistFollowed(artist.id);
  const play = () => player.playTracks(queue, 0, artist.name);
  const playShuffled = () => {
    if (!player.shuffle) player.toggleShuffle();
    player.playTracks(queue, 0, artist.name);
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Image source={{ uri: artist.photoUrl }} contentFit="cover" style={styles.photo} transition={180} />
        <View style={styles.scrim} />
        <View style={styles.headerOverlay}>
          <ScreenHeader title="" onBack={() => goBackOrReplace('/')} />
        </View>
        <View style={styles.artistCopy}>
          <Text style={styles.title}>{artist.name}</Text>
          <Text style={styles.meta}>{tracks.length} canciones · {albums.length} lanzamientos</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: followed }}
          onPress={() => library.toggleFollowArtist(artist.id)}
          style={[styles.followButton, followed && styles.followingButton]}
        >
          <Text style={[styles.followText, followed && styles.followingText]}>{followed ? 'Siguiendo' : 'Seguir'}</Text>
        </Pressable>
        <View style={styles.actionSpacer} />
        <IconButton name="shuffle" active={player.shuffle} filled onPress={playShuffled} accessibilityLabel="Reproducir aleatoriamente" />
        <IconButton name="play" filled size={52} onPress={play} accessibilityLabel={`Reproducir ${artist.name}`} />
      </View>

      <View style={styles.genres}>
        {artist.genres.map((genre) => (
          <Chip key={genre} label={genre} onPress={() => router.push({ pathname: '/collection/[kind]/[id]', params: { kind: 'genre', id: genre } })} />
        ))}
      </View>

      <View style={styles.trackSection}>
        <Text style={styles.sectionTitle}>Canciones populares</Text>
        {tracks.length ? tracks.map((track, position) => (
          <TrackRow
            key={track.id}
            track={track}
            queue={queue}
            position={position}
            contextLabel={artist.name}
            showAlbum
            onMore={() => setActionTrack(track)}
          />
        )) : (
          <EmptyState icon="musical-notes-outline" title="Sin canciones" description="Todavía no hay canciones de este artista." />
        )}
      </View>

      {albums.length ? (
        <Section title="Discografía" horizontal>
          {albums.map((album) => (
            <MediaCard
              key={album.id}
              image={album.coverUrl}
              title={album.title}
              subtitle={String(album.year)}
              onPress={() => router.push(`/album/${album.id}`)}
            />
          ))}
        </Section>
      ) : null}

      {similarArtists.length ? (
        <Section title="Artistas similares" horizontal>
          {similarArtists.map((item) => (
            <MediaCard
              key={item.id}
              image={item.photoUrl}
              title={item.name}
              subtitle={item.genres[0]}
              round
              onPress={() => router.push(`/artist/${item.id}`)}
            />
          ))}
        </Section>
      ) : null}

      <TrackActionsModal track={actionTrack} visible={Boolean(actionTrack)} onClose={() => setActionTrack(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 0, paddingBottom: 132 },
  hero: { height: 330, position: 'relative', backgroundColor: colors.surface },
  photo: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.28)' },
  headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  artistCopy: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.xl },
  title: { ...typography.title, color: colors.white, fontSize: 36 },
  meta: { ...typography.caption, color: 'rgba(255,255,255,0.82)', marginTop: spacing.xs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
  followButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    borderRadius: radii.round,
    backgroundColor: colors.accent
  },
  followingButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  followText: { color: colors.accentInk, fontSize: 13, fontWeight: '800' },
  followingText: { color: colors.text },
  actionSpacer: { flex: 1 },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  trackSection: { paddingHorizontal: spacing.md, marginBottom: spacing.xl },
  sectionTitle: { ...typography.section, color: colors.text, paddingHorizontal: spacing.xs, marginBottom: spacing.sm }
});

export default ArtistScreen;
