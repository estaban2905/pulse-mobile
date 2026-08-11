import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ErrorState,
  IconButton,
  LoadingState,
  MediaCard,
  Screen,
  ScreenHeader,
  Section,
  TrackRow
} from '../components';
import { useCatalog } from '../contexts/CatalogContext';
import { useLibrary } from '../contexts/LibraryContext';
import { usePlayer } from '../contexts/PlayerContext';
import { editorialPlaylists, genreColors, moods } from '../data/discovery';
import { colors, PLAYER_OVERLAY_CLEARANCE, radii, spacing, typography } from '../theme';
import type { Track } from '../types/api';
import { resolveTrackCoverUrl } from '../utils/artwork';
import { greetingForHour } from '../utils/format';

interface QuickActionProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}

function QuickAction({ icon, label, onPress }: QuickActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={19} color={colors.accent} />
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

function uniqueHistoryTracks(history: Array<{ trackId: string }>, tracks: Track[]): Track[] {
  const byId = new Map(tracks.map((track) => [track.id, track]));
  const seen = new Set<string>();
  const result: Track[] = [];
  history.forEach(({ trackId }) => {
    if (seen.has(trackId)) return;
    const track = byId.get(trackId);
    if (!track) return;
    seen.add(trackId);
    result.push(track);
  });
  return result;
}

export function HomeScreen() {
  const { catalog, loading, error, refresh, getAlbum, getArtist, getTrack } = useCatalog();
  const { profile, history, favoriteTrackIds, followedArtistIds, notifications } = useLibrary();
  const player = usePlayer();

  const recentTracks = useMemo(
    () => uniqueHistoryTracks(history, catalog?.tracks ?? []).slice(0, 5),
    [catalog?.tracks, history]
  );

  const recommended = useMemo(() => {
    if (!catalog) return [];
    const excluded = new Set([...favoriteTrackIds, ...recentTracks.map((track) => track.id)]);
    const fresh = catalog.tracks.filter((track) => !excluded.has(track.id));
    return [...fresh, ...catalog.tracks.filter((track) => excluded.has(track.id))].slice(0, 6);
  }, [catalog, favoriteTrackIds, recentTracks]);

  const latestAlbums = useMemo(
    () => [...(catalog?.albums ?? [])].sort((left, right) => right.year - left.year).slice(0, 8),
    [catalog?.albums]
  );

  const featuredArtists = useMemo(() => {
    const artists = catalog?.artists ?? [];
    const followed = new Set(followedArtistIds);
    return [...artists].sort((left, right) => Number(followed.has(right.id)) - Number(followed.has(left.id))).slice(0, 8);
  }, [catalog?.artists, followedArtistIds]);

  if (loading && !catalog) {
    return (
      <Screen scroll={false} contentContainerStyle={styles.centered}>
        <LoadingState message="Cargando tu música…" />
      </Screen>
    );
  }

  if (error && !catalog) {
    return (
      <Screen scroll={false} contentContainerStyle={styles.centered}>
        <ErrorState message={error} onRetry={() => void refresh()} />
      </Screen>
    );
  }

  if (!catalog) return null;

  const unread = notifications.filter((notification) => !notification.read).length;
  const allTrackIds = catalog.tracks.map((track) => track.id);

  return (
    <Screen contentContainerStyle={styles.screen}>
      <ScreenHeader
        eyebrow={greetingForHour()}
        title={profile.name.split(' ')[0] || 'Pulse'}
        right={(
          <View style={styles.headerActions}>
            <View>
              <IconButton
                name="notifications-outline"
                accessibilityLabel="Abrir notificaciones"
                onPress={() => router.push('/notifications')}
              />
              {unread > 0 ? <View style={styles.notificationDot} /> : null}
            </View>
            <IconButton
              name="settings-outline"
              accessibilityLabel="Abrir configuración"
              onPress={() => router.push('/settings')}
            />
          </View>
        )}
      />

      <View style={styles.quickGrid}>
        <QuickAction
          icon="heart-outline"
          label="Favoritas"
          onPress={() => router.push({ pathname: '/collection/[kind]/[id]', params: { kind: 'favourites', id: 'all' } })}
        />
        <QuickAction icon="time-outline" label="Historial" onPress={() => router.push('/history')} />
        <QuickAction icon="download-outline" label="Descargas" onPress={() => router.push('/downloads')} />
      </View>

      {recentTracks.length > 0 ? (
        <Section title="Escuchado recientemente" actionLabel="Ver historial" onAction={() => router.push('/history')}>
          <View style={styles.trackList}>
            {recentTracks.map((track, position) => (
              <TrackRow
                key={track.id}
                track={track}
                queue={recentTracks.map((item) => item.id)}
                position={position}
                contextLabel="Escuchado recientemente"
                showAlbum
              />
            ))}
          </View>
        </Section>
      ) : null}

      <Section title="Hecho para ti" subtitle="Colecciones para empezar a escuchar" horizontal>
        {editorialPlaylists.map((playlist) => {
          const coverTrack = getTrack(playlist.coverTrackId);
          const cover = coverTrack
            ? resolveTrackCoverUrl(coverTrack, getAlbum(coverTrack.albumId))
            : undefined;
          return (
            <MediaCard
              key={playlist.id}
              image={cover ?? ''}
              title={playlist.title}
              subtitle={playlist.description}
              large
              onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: playlist.id } })}
            />
          );
        })}
      </Section>

      <Section title="Canciones recomendadas" subtitle="Una selección de tu catálogo">
        <View style={styles.trackList}>
          {recommended.map((track, position) => (
            <TrackRow
              key={track.id}
              track={track}
              queue={recommended.map((item) => item.id)}
              position={position}
              contextLabel="Canciones recomendadas"
            />
          ))}
        </View>
      </Section>

      <Section title="Álbumes populares" horizontal>
        {latestAlbums.map((album) => (
          <MediaCard
            key={album.id}
            image={album.coverUrl}
            title={album.title}
            subtitle={`${getArtist(album.artistId)?.name ?? 'Artista'} · ${album.year}`}
            onPress={() => router.push({ pathname: '/album/[id]', params: { id: album.id } })}
          />
        ))}
      </Section>

      <Section title="Artistas para ti" horizontal>
        {featuredArtists.map((artist) => (
          <MediaCard
            key={artist.id}
            image={artist.photoUrl}
            title={artist.name}
            subtitle={artist.genres[0]}
            round
            onPress={() => router.push({ pathname: '/artist/[id]', params: { id: artist.id } })}
          />
        ))}
      </Section>

      <Section title="Música para tu día" subtitle="Elige un ambiente">
        <View style={styles.collectionGrid}>
          {moods.map((mood) => (
            <Pressable
              key={mood.id}
              onPress={() => router.push({ pathname: '/collection/[kind]/[id]', params: { kind: 'mood', id: mood.id } })}
              style={({ pressed }) => [
                styles.collectionCard,
                { backgroundColor: `${mood.color}2B`, borderColor: `${mood.color}88` },
                pressed && styles.pressed
              ]}
            >
              <Text style={styles.collectionTitle}>{mood.name}</Text>
              <Text numberOfLines={2} style={styles.collectionDescription}>{mood.description}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title="Explorar géneros">
        <View style={styles.collectionGrid}>
          {Object.entries(genreColors).map(([genre, color]) => (
            <Pressable
              key={genre}
              onPress={() => router.push({ pathname: '/collection/[kind]/[id]', params: { kind: 'genre', id: genre } })}
              style={({ pressed }) => [styles.genreCard, { backgroundColor: color }, pressed && styles.pressed]}
            >
              <Text style={styles.genreTitle}>{genre}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Pressable
        accessibilityRole="button"
        onPress={() => player.playTracks(allTrackIds, 0, 'Tu colección local')}
        style={({ pressed }) => [styles.playAll, pressed && styles.pressed]}
      >
        <Ionicons name="play" size={20} color={colors.accentInk} />
        <Text style={styles.playAllLabel}>Reproducir toda la colección</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: PLAYER_OVERLAY_CLEARANCE, gap: spacing.xxl },
  centered: { flex: 1, justifyContent: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  notificationDot: {
    position: 'absolute',
    right: 7,
    top: 7,
    width: 7,
    height: 7,
    borderRadius: radii.round,
    backgroundColor: colors.accent,
    borderColor: colors.background,
    borderWidth: 1
  },
  quickGrid: { flexDirection: 'row', gap: spacing.sm },
  quickAction: {
    flex: 1,
    minHeight: 78,
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  quickActionLabel: { color: colors.text, fontSize: 12, fontWeight: '700' },
  trackList: { gap: spacing.xs },
  collectionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  collectionCard: {
    width: '47.8%',
    minHeight: 96,
    justifyContent: 'flex-end',
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1
  },
  collectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  collectionDescription: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  genreCard: {
    width: '47.8%',
    minHeight: 76,
    justifyContent: 'flex-end',
    padding: spacing.md,
    borderRadius: radii.lg
  },
  genreTitle: { color: colors.white, fontSize: 14, fontWeight: '800' },
  playAll: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.round,
    backgroundColor: colors.accent
  },
  playAllLabel: { color: colors.accentInk, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] }
});
