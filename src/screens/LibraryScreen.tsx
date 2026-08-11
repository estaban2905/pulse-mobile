import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import {
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  MediaCard,
  Screen,
  ScreenHeader,
  TrackRow
} from '../components';
import { useCatalog } from '../contexts/CatalogContext';
import { useLibrary } from '../contexts/LibraryContext';
import { colors, radii, spacing, typography } from '../theme';
import type { Track } from '../types/api';

type LibraryTab = 'favorites' | 'playlists' | 'albums' | 'artists' | 'downloads' | 'recent';

const tabs: Array<{ id: LibraryTab; label: string }> = [
  { id: 'favorites', label: 'Favoritas' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'albums', label: 'Álbumes' },
  { id: 'artists', label: 'Artistas' },
  { id: 'downloads', label: 'Descargadas' },
  { id: 'recent', label: 'Recientes' }
];

function tracksFromIds(ids: string[], tracks: Track[]): Track[] {
  const trackMap = new Map(tracks.map((track) => [track.id, track]));
  return ids.map((id) => trackMap.get(id)).filter((track): track is Track => Boolean(track));
}

export function LibraryScreen() {
  const { catalog, loading, error, refresh, getAlbum, getArtist, getTrack } = useCatalog();
  const library = useLibrary();
  const [tab, setTab] = useState<LibraryTab>('favorites');
  const [createOpen, setCreateOpen] = useState(false);
  const [playlistTitle, setPlaylistTitle] = useState('');
  const [playlistDescription, setPlaylistDescription] = useState('');

  const favoriteTracks = useMemo(
    () => tracksFromIds(library.favoriteTrackIds, catalog?.tracks ?? []),
    [catalog?.tracks, library.favoriteTrackIds]
  );

  const downloadedTracks = useMemo(
    () => tracksFromIds(Object.keys(library.downloadedTracks), catalog?.tracks ?? []),
    [catalog?.tracks, library.downloadedTracks]
  );

  const recentTracks = useMemo(() => {
    if (!catalog) return [];
    const seen = new Set<string>();
    return library.history
      .map((entry) => {
        if (seen.has(entry.trackId)) return undefined;
        seen.add(entry.trackId);
        return catalog.tracks.find((track) => track.id === entry.trackId);
      })
      .filter((track): track is Track => Boolean(track));
  }, [catalog, library.history]);

  const savedAlbums = useMemo(
    () => library.savedAlbumIds.map((id) => getAlbum(id)).filter((album) => Boolean(album)),
    [getAlbum, library.savedAlbumIds]
  );

  const followedArtists = useMemo(
    () => library.followedArtistIds.map((id) => getArtist(id)).filter((artist) => Boolean(artist)),
    [getArtist, library.followedArtistIds]
  );

  const closeCreate = () => {
    setCreateOpen(false);
    setPlaylistTitle('');
    setPlaylistDescription('');
  };

  const submitPlaylist = () => {
    const cleanTitle = playlistTitle.trim();
    if (!cleanTitle) return;
    const id = library.createPlaylist(cleanTitle, playlistDescription.trim());
    closeCreate();
    router.push({ pathname: '/playlist/[id]', params: { id } });
  };

  if (loading && !catalog) {
    return (
      <Screen scroll={false} contentContainerStyle={styles.centered}>
        <LoadingState message="Cargando tu biblioteca…" />
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

  const renderTrackList = (tracks: Track[], contextLabel: string, emptyDescription: string) => {
    if (!tracks.length) {
      return (
        <EmptyState
          icon="musical-notes-outline"
          title="Todavía no hay canciones"
          description={emptyDescription}
          actionLabel="Explorar música"
          onAction={() => router.push('/search')}
        />
      );
    }
    const queue = tracks.map((track) => track.id);
    return (
      <View style={styles.trackList}>
        {tracks.map((track, position) => (
          <TrackRow
            key={track.id}
            track={track}
            queue={queue}
            position={position}
            contextLabel={contextLabel}
            showAlbum
          />
        ))}
      </View>
    );
  };

  return (
    <>
      <Screen contentContainerStyle={styles.screen}>
        <ScreenHeader
          title="Tu biblioteca"
          subtitle={`${library.favoriteTrackIds.length} favoritas · ${library.playlists.length} playlists`}
          right={(
            <IconButton
              name="add"
              filled
              accessibilityLabel="Crear una playlist"
              onPress={() => setCreateOpen(true)}
            />
          )}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {tabs.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              selected={tab === item.id}
              onPress={() => setTab(item.id)}
            />
          ))}
        </ScrollView>

        {tab === 'favorites' ? (
          renderTrackList(
            favoriteTracks,
            'Canciones favoritas',
            'Toca el corazón de una canción para guardarla aquí.'
          )
        ) : null}

        {tab === 'playlists' ? (
          library.playlists.length > 0 ? (
            <View style={styles.cardGrid}>
              {library.playlists.map((playlist) => {
                const firstTrack = getTrack(playlist.trackIds[0] ?? '');
                const cover = firstTrack ? getAlbum(firstTrack.albumId)?.coverUrl : catalog.albums[0]?.coverUrl;
                return (
                  <MediaCard
                    key={playlist.id}
                    image={cover ?? ''}
                    title={playlist.title}
                    subtitle={`${playlist.trackIds.length} canciones`}
                    onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: playlist.id } })}
                  />
                );
              })}
            </View>
          ) : (
            <EmptyState
              icon="list-outline"
              title="Crea tu primera playlist"
              description="Organiza tus canciones para cada momento."
              actionLabel="Nueva playlist"
              onAction={() => setCreateOpen(true)}
            />
          )
        ) : null}

        {tab === 'albums' ? (
          savedAlbums.length > 0 ? (
            <View style={styles.cardGrid}>
              {savedAlbums.map((album) => album ? (
                <MediaCard
                  key={album.id}
                  image={album.coverUrl}
                  title={album.title}
                  subtitle={`${getArtist(album.artistId)?.name ?? 'Artista'} · ${album.year}`}
                  onPress={() => router.push({ pathname: '/album/[id]', params: { id: album.id } })}
                />
              ) : null)}
            </View>
          ) : (
            <EmptyState
              icon="albums-outline"
              title="No guardaste álbumes"
              description="Guarda tus álbumes preferidos para encontrarlos rápidamente."
              actionLabel="Buscar álbumes"
              onAction={() => router.push('/search')}
            />
          )
        ) : null}

        {tab === 'artists' ? (
          followedArtists.length > 0 ? (
            <View style={styles.cardGrid}>
              {followedArtists.map((artist) => artist ? (
                <MediaCard
                  key={artist.id}
                  image={artist.photoUrl}
                  title={artist.name}
                  subtitle={artist.genres[0]}
                  round
                  onPress={() => router.push({ pathname: '/artist/[id]', params: { id: artist.id } })}
                />
              ) : null)}
            </View>
          ) : (
            <EmptyState
              icon="people-outline"
              title="Aún no sigues artistas"
              description="Sigue artistas y sus lanzamientos aparecerán en tu biblioteca."
              actionLabel="Descubrir artistas"
              onAction={() => router.push('/search')}
            />
          )
        ) : null}

        {tab === 'downloads' ? (
          <>
            {renderTrackList(
              downloadedTracks,
              'Descargas',
              'Descarga canciones para escucharlas incluso sin conexión.'
            )}
            {downloadedTracks.length > 0 ? (
              <Pressable
                onPress={() => router.push('/downloads')}
                style={({ pressed }) => [styles.manageButton, pressed && styles.pressed]}
              >
                <Ionicons name="phone-portrait-outline" size={18} color={colors.accent} />
                <Text style={styles.manageButtonLabel}>Administrar descargas</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}

        {tab === 'recent' ? (
          renderTrackList(
            recentTracks,
            'Escuchado recientemente',
            'Las canciones que reproduzcas aparecerán aquí.'
          )
        ) : null}
      </Screen>

      <Modal
        animationType="fade"
        transparent
        visible={createOpen}
        onRequestClose={closeCreate}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalRoot}
        >
          <Pressable accessibilityLabel="Cerrar" onPress={closeCreate} style={styles.backdrop} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Nueva playlist</Text>
                <Text style={styles.modalSubtitle}>Ponle un nombre para comenzar.</Text>
              </View>
              <IconButton name="close" accessibilityLabel="Cerrar" onPress={closeCreate} />
            </View>
            <TextInput
              autoFocus
              accessibilityLabel="Nombre de la playlist"
              maxLength={60}
              onChangeText={setPlaylistTitle}
              placeholder="Nombre de la playlist"
              placeholderTextColor={colors.textDim}
              style={styles.input}
              value={playlistTitle}
            />
            <TextInput
              accessibilityLabel="Descripción de la playlist"
              maxLength={180}
              multiline
              onChangeText={setPlaylistDescription}
              placeholder="Descripción (opcional)"
              placeholderTextColor={colors.textDim}
              style={[styles.input, styles.descriptionInput]}
              textAlignVertical="top"
              value={playlistDescription}
            />
            <Pressable
              accessibilityRole="button"
              disabled={!playlistTitle.trim()}
              onPress={submitPlaylist}
              style={({ pressed }) => [
                styles.createButton,
                !playlistTitle.trim() && styles.disabled,
                pressed && styles.pressed
              ]}
            >
              <Text style={styles.createButtonLabel}>Crear playlist</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: spacing.xxxl, gap: spacing.lg },
  centered: { flex: 1, justifyContent: 'center' },
  chips: { gap: spacing.sm, paddingRight: spacing.xl },
  trackList: { gap: spacing.xs },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  manageButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: colors.border
  },
  manageButtonLabel: { color: colors.text, fontSize: 13, fontWeight: '700' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.72)'
  },
  modalCard: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 38 : spacing.xxl,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { ...typography.section, color: colors.text },
  modalSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  input: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 15
  },
  descriptionInput: { minHeight: 88 },
  createButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radii.round,
    backgroundColor: colors.accent
  },
  createButtonLabel: { color: colors.accentInk, fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.38 },
  pressed: { opacity: 0.72 }
});
