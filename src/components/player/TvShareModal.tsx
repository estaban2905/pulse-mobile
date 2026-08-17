import React from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayer } from '../../contexts/PlayerContext';
import { useCatalog } from '../../contexts/CatalogContext';
import { resolveTrackCoverUrl } from '../../utils/artwork';
import { colors, radii, shadows, spacing, typography } from '../../theme';

export function TvShareModal() {
  const { tvShareVisible, setTvShareVisible, current: track } = usePlayer();
  const { getAlbum, getArtist } = useCatalog();

  if (!tvShareVisible || !track) return null;

  const hide = () => setTvShareVisible(false);

  const insets = useSafeAreaInsets();
  const album = getAlbum(track.albumId);
  const artist = getArtist(track.artistId);
  const coverUrl = resolveTrackCoverUrl(track, album);

  return (
    <Pressable style={styles.backdrop} onPress={hide} accessibilityLabel="Cerrar">
      <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]} onPress={(e) => e.stopPropagation()}>
        <View style={styles.handle} />

        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            contentFit="cover"
            style={styles.artwork}
            transition={200}
          />
        ) : (
          <View style={[styles.artwork, styles.artworkFallback]}>
            <Text style={styles.artworkGlyph}>♪</Text>
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.title}>{track.title}</Text>
          <Text style={styles.artist}>{artist?.name ?? 'Artista desconocido'}</Text>

          <View style={styles.statusRow}>
            <Text style={styles.statusIcon}>📺</Text>
            <Text style={styles.statusText}>Escuchando en la TV</Text>
          </View>
        </View>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sheet: {
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: radii.round,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  artwork: {
    width: 220,
    height: 220,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceSoft,
    ...shadows.card,
  },
  artworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkGlyph: {
    color: colors.accent,
    fontSize: 72,
  },
  content: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
    maxWidth: 280,
  },
  artist: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(169,152,255,0.12)',
    borderRadius: radii.round,
  },
  statusIcon: {
    fontSize: 22,
  },
  statusText: {
    ...typography.body,
    color: colors.accent,
    fontWeight: '600',
  },
});