import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import { colors, radii, spacing, typography } from '../theme';
import type { Track } from '../types/api';
import { formatDuration } from '../utils/format';

function singleParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export function AlbumScreen() {
  const params = useLocalSearchParams<{ id?: string | string[]; albumId?: string | string[] }>();
  const albumId = singleParam(params.id ?? params.albumId);
  const { loading, error, refresh, getAlbum, getArtist, tracksForAlbum, albumsForArtist } = useCatalog();
  const library = useLibrary();
  const player = usePlayer();
  const [actionTrack, setActionTrack] = useState<Track | null>(null);

  const album = getAlbum(albumId);
  const artist = album ? getArtist(album.artistId) : undefined;
  const tracks = useMemo(() => album ? tracksForAlbum(album.id) : [], [album, tracksForAlbum]);
  const moreAlbums = useMemo(
    () => album ? albumsForArtist(album.artistId).filter((item) => item.id !== album.id) : [],
    [album, albumsForArtist]
  );
  const queue = tracks.map((track) => track.id);
  const totalDuration = tracks.reduce((sum, track) => sum + track.duration, 0);
  const allDownloaded = tracks.length > 0 && tracks.every((track) => Boolean(library.downloadedTracks[track.id]));

  if (loading) return <Screen><LoadingState label="Cargando álbum…" /></Screen>;
  if (error) return <Screen><ErrorState message={error} onRetry={() => void refresh()} /></Screen>;
  if (!album) {
    return (
      <Screen>
        <ScreenHeader title="Álbum" onBack={() => router.back()} />
        <EmptyState
          icon="disc-outline"
          title="Álbum no encontrado"
          description="Puede que ya no esté disponible en el catálogo."
          actionLabel="Volver"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const play = () => player.playTracks(queue, 0, `Álbum · ${album.title}`);
  const playShuffled = () => {
    if (!player.shuffle) player.toggleShuffle();
    player.playTracks(queue, 0, `Álbum · ${album.title}`);
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <ScreenHeader
        title="Álbum"
        onBack={() => router.back()}
        right={(
          <IconButton
            name={library.isAlbumSaved(album.id) ? 'bookmark' : 'bookmark-outline'}
            color={library.isAlbumSaved(album.id) ? colors.accent : colors.text}
            onPress={() => library.toggleSavedAlbum(album.id)}
            accessibilityLabel={library.isAlbumSaved(album.id) ? 'Quitar álbum de la biblioteca' : 'Guardar álbum'}
          />
        )}
      />

      <View style={[styles.hero, { backgroundColor: `${album.accent}35` }]}>
        <Image source={{ uri: album.coverUrl }} contentFit="cover" style={styles.cover} transition={180} />
        <View style={styles.heroCopy}>
          <Text style={styles.title}>{album.title}</Text>
          {artist ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/artist/${artist.id}`)}
              style={styles.artistLink}
            >
              <Image source={{ uri: artist.photoUrl }} contentFit="cover" style={styles.avatar} />
              <Text style={styles.artistName}>{artist.name}</Text>
            </Pressable>
          ) : null}
          <Text style={styles.meta}>
            {album.year} · {tracks.length} {tracks.length === 1 ? 'canción' : 'canciones'} · {formatDuration(totalDuration)}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <IconButton
          name={allDownloaded ? 'checkmark-circle' : 'download-outline'}
          color={allDownloaded ? colors.success : colors.textMuted}
          onPress={() => void Promise.all(
            tracks
              .filter((track) => !library.downloadedTracks[track.id])
              .map((track) => library.downloadTrack(track).catch(() => undefined))
          )}
          accessibilityLabel={allDownloaded ? 'Álbum descargado' : 'Descargar álbum'}
        />
        <View style={styles.actionSpacer} />
        <IconButton name="shuffle" active={player.shuffle} filled onPress={playShuffled} accessibilityLabel="Reproducir aleatoriamente" />
        <IconButton name="play" filled size={52} onPress={play} accessibilityLabel="Reproducir álbum" />
      </View>

      <View style={styles.trackList}>
        {tracks.length ? tracks.map((track, position) => (
          <TrackRow
            key={track.id}
            track={track}
            queue={queue}
            position={position}
            contextLabel={`Álbum · ${album.title}`}
            onMore={() => setActionTrack(track)}
          />
        )) : (
          <EmptyState icon="musical-notes-outline" title="Sin canciones" description="Este álbum todavía no tiene canciones disponibles." />
        )}
      </View>

      {moreAlbums.length ? (
        <Section title={artist ? `Más de ${artist.name}` : 'Más álbumes'} horizontal>
          {moreAlbums.map((item) => (
            <MediaCard
              key={item.id}
              image={item.coverUrl}
              title={item.title}
              subtitle={String(item.year)}
              onPress={() => router.push(`/album/${item.id}`)}
            />
          ))}
        </Section>
      ) : null}

      <TrackActionsModal track={actionTrack} visible={Boolean(actionTrack)} onClose={() => setActionTrack(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 132 },
  hero: {
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    borderRadius: radii.xl,
    alignItems: 'center'
  },
  cover: { width: 220, height: 220, borderRadius: radii.lg, backgroundColor: colors.surfaceSoft },
  heroCopy: { width: '100%', marginTop: spacing.xl },
  title: { ...typography.title, color: colors.text },
  artistLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, alignSelf: 'flex-start' },
  avatar: { width: 28, height: 28, borderRadius: radii.round, backgroundColor: colors.surfaceSoft },
  artistName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  actionSpacer: { flex: 1 },
  trackList: { paddingHorizontal: spacing.md }
});

export default AlbumScreen;
