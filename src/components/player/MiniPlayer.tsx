import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCatalog } from '../../contexts/CatalogContext';
import { useLibrary } from '../../contexts/LibraryContext';
import { usePlayer } from '../../contexts/PlayerContext';
import { colors, radii, shadows, spacing } from '../../theme';
import { IconButton } from '../ui/IconButton';

interface MiniPlayerProps {
  onPress?: () => void;
  bottomOffset?: number;
}

export function MiniPlayer({ onPress, bottomOffset = 82 }: MiniPlayerProps) {
  const router = useRouter();
  const { getAlbum, getArtist } = useCatalog();
  const { isFavorite, toggleFavorite } = useLibrary();
  const player = usePlayer();
  const track = player.current;

  if (!track) return null;

  const album = getAlbum(track.albumId);
  const artist = getArtist(track.artistId);
  const progress = player.duration > 0
    ? Math.min(1, Math.max(0, player.position / player.duration))
    : 0;

  return (
    <View style={[styles.container, { bottom: bottomOffset }, shadows.card]}>
      <View style={styles.content}>
        <Pressable
          accessibilityLabel="Abrir reproductor"
          accessibilityRole="button"
          onPress={onPress ?? (() => router.push('/player'))}
          style={({ pressed }) => [styles.track, pressed && styles.pressed]}
        >
          <View style={styles.coverFrame}>
            {album?.coverUrl ? (
              <Image contentFit="cover" source={{ uri: album.coverUrl }} style={StyleSheet.absoluteFill} transition={120} />
            ) : (
              <Ionicons name="musical-note" color={colors.textDim} size={20} />
            )}
          </View>
          <View style={styles.copy}>
            <Text numberOfLines={1} style={styles.title}>{track.title}</Text>
            <Text numberOfLines={1} style={styles.artist}>{artist?.name ?? 'Artista desconocido'}</Text>
          </View>
        </Pressable>

        <IconButton
          accessibilityLabel={isFavorite(track.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          active={isFavorite(track.id)}
          color={isFavorite(track.id) ? colors.accent : colors.textMuted}
          iconSize={19}
          name={isFavorite(track.id) ? 'heart' : 'heart-outline'}
          onPress={() => toggleFavorite(track.id)}
          size={36}
        />
        {player.isBuffering ? (
          <View style={styles.loader}>
            <ActivityIndicator color={colors.text} size="small" />
          </View>
        ) : (
          <IconButton
            accessibilityLabel={player.isPlaying ? 'Pausar' : 'Reproducir'}
            iconSize={22}
            name={player.isPlaying ? 'pause' : 'play'}
            onPress={player.toggle}
            size={38}
          />
        )}
        <IconButton
          accessibilityLabel="Canción siguiente"
          iconSize={21}
          name="play-skip-forward"
          onPress={player.next}
          size={36}
        />
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progress, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 40,
    left: spacing.sm,
    right: spacing.sm,
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(29, 29, 37, 0.98)'
  },
  content: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm
  },
  track: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
  },
  pressed: {
    opacity: 0.7
  },
  coverFrame: {
    width: 46,
    height: 46,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft
  },
  copy: {
    minWidth: 0,
    flex: 1
  },
  title: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800'
  },
  artist: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 3
  },
  loader: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center'
  },
  progressTrack: {
    height: 2,
    backgroundColor: colors.surfaceSoft
  },
  progress: {
    height: '100%',
    backgroundColor: colors.accent
  }
});
