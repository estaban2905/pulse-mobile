import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCatalog } from '../../contexts/CatalogContext';
import { useLibrary } from '../../contexts/LibraryContext';
import { usePlayer } from '../../contexts/PlayerContext';
import { colors, radii, spacing } from '../../theme';
import type { Track } from '../../types/api';
import { formatTime } from '../../utils/format';
import { IconButton } from '../ui/IconButton';

interface TrackRowProps {
  track: Track;
  queue?: string[];
  position?: number;
  contextLabel?: string;
  showAlbum?: boolean;
  onMore?: () => void;
  trailing?: React.ReactNode;
}

export function TrackRow({
  track,
  queue,
  position,
  contextLabel = 'Reproduciendo',
  showAlbum = false,
  onMore,
  trailing
}: TrackRowProps) {
  const { getAlbum, getArtist } = useCatalog();
  const { downloadedTracks } = useLibrary();
  const player = usePlayer();
  const album = getAlbum(track.albumId);
  const artist = getArtist(track.artistId);
  const active = player.current?.id === track.id;

  const play = () => {
    if (active) {
      player.toggle();
      return;
    }
    if (queue?.length) {
      const queuePosition = position ?? queue.indexOf(track.id);
      if (queuePosition >= 0) {
        player.playTracks(queue, queuePosition, contextLabel);
        return;
      }
    }
    player.playTrack(track.id, contextLabel);
  };

  return (
    <View style={[styles.row, active && styles.activeRow]}>
      <Pressable
        accessibilityLabel={`${active && player.isPlaying ? 'Pausar' : 'Reproducir'} ${track.title}`}
        accessibilityRole="button"
        onPress={play}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <View style={styles.coverFrame}>
          {album?.coverUrl ? (
            <Image contentFit="cover" source={{ uri: album.coverUrl }} style={StyleSheet.absoluteFill} transition={140} />
          ) : (
            <Ionicons name="musical-note" color={colors.textDim} size={20} />
          )}
          {active ? (
            <View style={styles.playingOverlay}>
              <Ionicons
                name={player.isPlaying ? 'volume-high' : 'pause'}
                color={colors.white}
                size={18}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.copy}>
          <Text numberOfLines={1} style={[styles.title, active && styles.activeTitle]}>{track.title}</Text>
          <View style={styles.metaRow}>
            {downloadedTracks[track.id] ? <Ionicons name="arrow-down-circle" color={colors.success} size={13} /> : null}
            <Text numberOfLines={1} style={styles.meta}>
              {artist?.name ?? 'Artista desconocido'}{showAlbum && album ? ` · ${album.title}` : ''}
            </Text>
          </View>
        </View>
      </Pressable>

      {trailing !== undefined ? trailing : (
        <View style={styles.trailing}>
          <Text style={styles.duration}>{formatTime(track.duration)}</Text>
          {onMore ? (
            <IconButton
              accessibilityLabel={`Más opciones para ${track.title}`}
              color={colors.textMuted}
              iconSize={19}
              name="ellipsis-horizontal"
              onPress={onMore}
              size={36}
            />
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  activeRow: {
    backgroundColor: 'rgba(169, 152, 255, 0.07)'
  },
  main: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
  },
  pressed: {
    opacity: 0.66
  },
  coverFrame: {
    width: 50,
    height: 50,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised
  },
  playingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.54)'
  },
  copy: {
    flex: 1,
    minWidth: 0
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700'
  },
  activeTitle: {
    color: colors.accent
  },
  metaRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4
  },
  meta: {
    flexShrink: 1,
    color: colors.textMuted,
    fontSize: 12
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  duration: {
    color: colors.textDim,
    fontSize: 11,
    fontVariant: ['tabular-nums']
  }
});
