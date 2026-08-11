import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  Screen,
  ScreenHeader,
  Section,
  TrackActionsModal,
  TrackRow
} from '../components';
import { useCatalog } from '../contexts/CatalogContext';
import { useLibrary } from '../contexts/LibraryContext';
import { usePlayer } from '../contexts/PlayerContext';
import { editorialPlaylists } from '../data/discovery';
import { colors, radii, spacing, typography } from '../theme';
import type { Track } from '../types/api';
import { resolveTrackCoverUrl } from '../utils/artwork';
import { formatDuration } from '../utils/format';

function singleParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export function PlaylistScreen() {
  const params = useLocalSearchParams<{ id?: string | string[]; playlistId?: string | string[] }>();
  const playlistId = singleParam(params.id ?? params.playlistId);
  const { catalog, loading, error, refresh, getTrack, getAlbum } = useCatalog();
  const library = useLibrary();
  const player = usePlayer();
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [actionTrack, setActionTrack] = useState<Track | null>(null);

  const editorial = editorialPlaylists.find((item) => item.id === playlistId);
  const userPlaylist = library.playlists.find((item) => item.id === playlistId);
  const playlist = editorial ?? userPlaylist;
  const isEditable = Boolean(userPlaylist);
  const trackIds = playlist?.trackIds ?? [];
  const tracks = trackIds.map((id) => getTrack(id)).filter((track): track is Track => Boolean(track));
  const coverTrack = getTrack(editorial?.coverTrackId ?? trackIds[0] ?? '');
  const cover = coverTrack
    ? resolveTrackCoverUrl(coverTrack, getAlbum(coverTrack.albumId))
    : undefined;
  const totalDuration = tracks.reduce((sum, track) => sum + track.duration, 0);
  const suggestions = useMemo(() => {
    if (!catalog || !userPlaylist) return [];
    const existing = new Set(userPlaylist.trackIds);
    return catalog.tracks.filter((track) => !existing.has(track.id)).slice(0, 5);
  }, [catalog, userPlaylist]);

  useEffect(() => {
    if (!userPlaylist) return;
    setDraftTitle(userPlaylist.title);
    setDraftDescription(userPlaylist.description);
  }, [userPlaylist?.id, userPlaylist?.title, userPlaylist?.description]);

  if (loading) return <Screen><LoadingState label="Cargando playlist…" /></Screen>;
  if (error) return <Screen><ErrorState message={error} onRetry={() => void refresh()} /></Screen>;
  if (!playlist) {
    return (
      <Screen>
        <ScreenHeader title="Playlist" onBack={() => router.back()} />
        <EmptyState
          icon="list-outline"
          title="Playlist no encontrada"
          description="Puede que la playlist haya sido eliminada."
          actionLabel="Ir a tu biblioteca"
          onAction={() => router.replace('/library')}
        />
      </Screen>
    );
  }

  const saveChanges = () => {
    if (!userPlaylist) return;
    library.updatePlaylist(userPlaylist.id, { title: draftTitle.trim() || 'Nueva playlist', description: draftDescription.trim() });
    setEditing(false);
  };
  const removePlaylist = () => {
    if (!userPlaylist) return;
    Alert.alert('Eliminar playlist', `¿Quieres eliminar “${userPlaylist.title}”?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          library.deletePlaylist(userPlaylist.id);
          router.replace('/library');
        }
      }
    ]);
  };
  const copyEditorial = () => {
    if (!editorial) return;
    const id = library.createPlaylist(editorial.title, editorial.description);
    editorial.trackIds.forEach((trackId) => library.addTrackToPlaylist(id, trackId));
    Alert.alert('Playlist guardada', 'Se creó una copia editable en tu biblioteca.', [
      { text: 'Seguir aquí' },
      { text: 'Abrir copia', onPress: () => router.replace(`/playlist/${id}`) }
    ]);
  };
  const play = () => player.playTracks(trackIds, 0, playlist.title);
  const playShuffled = () => {
    if (!player.shuffle) player.toggleShuffle();
    player.playTracks(trackIds, 0, playlist.title);
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <ScreenHeader
        title={isEditable ? 'Tu playlist' : 'Playlist editorial'}
        onBack={() => router.back()}
        right={isEditable ? (
          <IconButton
            name={editing ? 'close' : 'pencil-outline'}
            onPress={() => setEditing((value) => !value)}
            accessibilityLabel={editing ? 'Cancelar edición' : 'Editar playlist'}
          />
        ) : (
          <IconButton name="bookmark-outline" onPress={copyEditorial} accessibilityLabel="Guardar una copia" />
        )}
      />

      <View style={styles.hero}>
        {cover ? (
          <Image source={{ uri: cover }} contentFit="cover" style={styles.cover} transition={180} />
        ) : (
          <View style={[styles.cover, styles.coverFallback]}><Text style={styles.coverGlyph}>♫</Text></View>
        )}
        {editing ? (
          <View style={styles.editor}>
            <TextInput
              value={draftTitle}
              onChangeText={setDraftTitle}
              placeholder="Nombre de la playlist"
              placeholderTextColor={colors.textDim}
              style={[styles.input, styles.titleInput]}
              maxLength={80}
              autoFocus
            />
            <TextInput
              value={draftDescription}
              onChangeText={setDraftDescription}
              placeholder="Descripción opcional"
              placeholderTextColor={colors.textDim}
              style={[styles.input, styles.descriptionInput]}
              maxLength={240}
              multiline
            />
            <View style={styles.editActions}>
              <Pressable onPress={removePlaylist} style={[styles.textButton, styles.dangerButton]}>
                <Text style={styles.dangerText}>Eliminar</Text>
              </Pressable>
              <Pressable onPress={saveChanges} style={[styles.textButton, styles.saveButton]}>
                <Text style={styles.saveText}>Guardar cambios</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.copy}>
            <Text style={styles.title}>{playlist.title}</Text>
            {playlist.description ? <Text style={styles.description}>{playlist.description}</Text> : null}
            <Text style={styles.meta}>
              {isEditable ? 'Tu biblioteca' : 'Pulse Music'} · {tracks.length} canciones · {formatDuration(totalDuration)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <IconButton
          name="download-outline"
          onPress={() => void Promise.all(
            tracks
              .filter((track) => !library.downloadedTracks[track.id])
              .map((track) => library.downloadTrack(track).catch(() => undefined))
          )}
          accessibilityLabel="Descargar playlist"
        />
        <View style={styles.actionSpacer} />
        <IconButton name="shuffle" active={player.shuffle} filled onPress={playShuffled} accessibilityLabel="Reproducir aleatoriamente" />
        <IconButton name="play" filled size={52} onPress={play} accessibilityLabel="Reproducir playlist" />
      </View>

      <View style={styles.trackList}>
        {tracks.length ? tracks.map((track, position) => (
          <TrackRow
            key={track.id}
            track={track}
            queue={trackIds}
            position={position}
            contextLabel={playlist.title}
            showAlbum
            onMore={() => setActionTrack(track)}
            trailing={userPlaylist ? (
              <View style={styles.rowActions}>
                <IconButton
                  name="chevron-up"
                  size={28}
                  iconSize={17}
                  color={colors.textDim}
                  disabled={position === 0}
                  onPress={() => library.reorderPlaylistTrack(userPlaylist.id, position, position - 1)}
                  accessibilityLabel={`Subir ${track.title}`}
                />
                <IconButton
                  name="chevron-down"
                  size={28}
                  iconSize={17}
                  color={colors.textDim}
                  disabled={position === tracks.length - 1}
                  onPress={() => library.reorderPlaylistTrack(userPlaylist.id, position, position + 1)}
                  accessibilityLabel={`Bajar ${track.title}`}
                />
                <IconButton
                  name="ellipsis-horizontal"
                  size={28}
                  iconSize={17}
                  color={colors.textMuted}
                  onPress={() => setActionTrack(track)}
                  accessibilityLabel={`Más opciones para ${track.title}`}
                />
                <IconButton
                  name="remove-circle-outline"
                  size={28}
                  iconSize={17}
                  color={colors.textMuted}
                  onPress={() => library.removeTrackFromPlaylist(userPlaylist.id, track.id)}
                  accessibilityLabel={`Quitar ${track.title}`}
                />
              </View>
            ) : undefined}
          />
        )) : (
          <EmptyState
            icon="musical-notes-outline"
            title="Esta playlist está vacía"
            description="Añade canciones desde las sugerencias."
            actionLabel="Explorar"
            onAction={() => router.push('/search')}
          />
        )}
      </View>

      {userPlaylist && suggestions.length ? (
        <Section title="Te sugerimos añadir" subtitle="Basado en el catálogo disponible">
          <View style={styles.suggestions}>
            {suggestions.map((track, position) => (
              <TrackRow
                key={track.id}
                track={track}
                queue={suggestions.map((item) => item.id)}
                position={position}
                contextLabel="Sugerencias"
                showAlbum
                trailing={(
                  <IconButton
                    name="add-circle-outline"
                    size={36}
                    color={colors.accent}
                    onPress={() => library.addTrackToPlaylist(userPlaylist.id, track.id)}
                    accessibilityLabel={`Añadir ${track.title}`}
                  />
                )}
              />
            ))}
          </View>
        </Section>
      ) : null}

      <TrackActionsModal track={actionTrack} visible={Boolean(actionTrack)} onClose={() => setActionTrack(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 132 },
  hero: { alignItems: 'center', paddingHorizontal: spacing.lg },
  cover: { width: 210, height: 210, borderRadius: radii.lg, backgroundColor: colors.surfaceSoft },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  coverGlyph: { color: colors.accent, fontSize: 72 },
  copy: { width: '100%', marginTop: spacing.xl },
  title: { ...typography.title, color: colors.text },
  description: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm },
  meta: { ...typography.caption, color: colors.textDim, marginTop: spacing.sm },
  editor: { width: '100%', marginTop: spacing.xl, gap: spacing.md },
  input: { color: colors.text, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md },
  titleInput: { fontSize: 20, fontWeight: '800' },
  descriptionInput: { ...typography.body, minHeight: 80, textAlignVertical: 'top' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  textButton: { borderRadius: radii.round, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  dangerButton: { borderWidth: 1, borderColor: colors.danger },
  dangerText: { color: colors.danger, fontWeight: '700' },
  saveButton: { backgroundColor: colors.accent },
  saveText: { color: colors.accentInk, fontWeight: '800' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  actionSpacer: { flex: 1 },
  trackList: { paddingHorizontal: spacing.md },
  suggestions: { marginHorizontal: -spacing.sm },
  rowActions: { flexDirection: 'row', alignItems: 'center' }
});

export default PlaylistScreen;
