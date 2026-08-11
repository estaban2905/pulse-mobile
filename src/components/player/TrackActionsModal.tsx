import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCatalog } from '../../contexts/CatalogContext';
import { useLibrary } from '../../contexts/LibraryContext';
import { usePlayer } from '../../contexts/PlayerContext';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import type { Track } from '../../types/api';
import { resolveTrackCoverUrl } from '../../utils/artwork';
import type { IoniconName } from '../ui/IconButton';

interface TrackActionsModalProps {
  track: Track | null;
  visible: boolean;
  onClose: () => void;
}

interface ActionRowProps {
  icon: IoniconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  loading?: boolean;
}

function ActionRow({ icon, label, onPress, active = false, loading = false }: ActionRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, pressed && styles.actionPressed]}
    >
      <View style={[styles.actionIcon, active && styles.activeActionIcon]}>
        {loading
          ? <ActivityIndicator color={colors.accent} size="small" />
          : <Ionicons name={icon} color={active ? colors.accent : colors.text} size={21} />}
      </View>
      <Text style={[styles.actionLabel, active && styles.activeActionLabel]}>{label}</Text>
      <Ionicons name="chevron-forward" color={colors.textDim} size={17} />
    </Pressable>
  );
}

export function TrackActionsModal({ track, visible, onClose }: TrackActionsModalProps) {
  const insets = useSafeAreaInsets();
  const { getAlbum, getArtist } = useCatalog();
  const library = useLibrary();
  const player = usePlayer();
  const [workingDownload, setWorkingDownload] = useState(false);
  const [showPlaylists, setShowPlaylists] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShowPlaylists(false);
      setWorkingDownload(false);
    }
  }, [visible]);

  if (!track) return null;

  const album = getAlbum(track.albumId);
  const artist = getArtist(track.artistId);
  const coverUrl = resolveTrackCoverUrl(track, album);
  const favorite = library.isFavorite(track.id);
  const downloaded = Boolean(library.downloadedTracks[track.id]);
  const progress = library.downloadProgress[track.id];

  const toggleDownload = async () => {
    setWorkingDownload(true);
    try {
      if (downloaded) await library.removeDownload(track.id);
      else await library.downloadTrack(track);
    } catch (reason) {
      Alert.alert(
        'No se pudo completar la descarga',
        reason instanceof Error ? reason.message : 'Inténtalo nuevamente.'
      );
    } finally {
      setWorkingDownload(false);
    }
  };

  const share = async () => {
    try {
      await Share.share({
        title: track.title,
        message: `${track.title} — ${artist?.name ?? 'Pulse Music'}\n${track.streamUrl}`,
        url: track.streamUrl
      });
    } catch {
      Alert.alert('No se pudo compartir', 'Inténtalo nuevamente.');
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      navigationBarTranslucent
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Cerrar opciones" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={[styles.sheet, shadows.card, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.handle} />
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            <View style={styles.trackHeader}>
              <View style={styles.coverFrame}>
                {coverUrl ? (
                  <Image contentFit="cover" source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} transition={120} />
                ) : (
                  <Ionicons name="musical-note" color={colors.textDim} size={24} />
                )}
              </View>
              <View style={styles.trackCopy}>
                <Text numberOfLines={2} style={styles.trackTitle}>{track.title}</Text>
                <Text numberOfLines={1} style={styles.trackMeta}>
                  {artist?.name ?? 'Artista desconocido'}{album ? ` · ${album.title}` : ''}
                </Text>
              </View>
              <Pressable accessibilityLabel="Cerrar" hitSlop={8} onPress={onClose} style={styles.close}>
                <Ionicons name="close" color={colors.textMuted} size={23} />
              </Pressable>
            </View>

            <View style={styles.actions}>
              <ActionRow
                active={favorite}
                icon={favorite ? 'heart' : 'heart-outline'}
                label={favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                onPress={() => library.toggleFavorite(track.id)}
              />
              <ActionRow
                icon="return-down-forward-outline"
                label="Reproducir a continuación"
                onPress={() => {
                  if (player.current) player.playNext(track.id);
                  else player.playTrack(track.id, 'Reproduciendo a continuación');
                  onClose();
                }}
              />
              <ActionRow
                icon="list-outline"
                label="Agregar a la cola"
                onPress={() => {
                  player.addToQueue([track.id]);
                  onClose();
                }}
              />
              {library.playlists.length ? (
                <ActionRow
                  active={showPlaylists}
                  icon="add-circle-outline"
                  label="Agregar a una playlist"
                  onPress={() => setShowPlaylists((value) => !value)}
                />
              ) : null}

              {showPlaylists ? (
                <View style={styles.playlists}>
                  <Text style={styles.playlistEyebrow}>TUS PLAYLISTS</Text>
                  {library.playlists.map((playlist) => {
                    const alreadyAdded = playlist.trackIds.includes(track.id);
                    return (
                      <Pressable
                        accessibilityRole="button"
                        disabled={alreadyAdded}
                        key={playlist.id}
                        onPress={() => {
                          library.addTrackToPlaylist(playlist.id, track.id);
                          onClose();
                        }}
                        style={({ pressed }) => [styles.playlistRow, pressed && styles.actionPressed]}
                      >
                        <Ionicons
                          name={alreadyAdded ? 'checkmark-circle' : 'musical-notes-outline'}
                          color={alreadyAdded ? colors.success : colors.accent}
                          size={19}
                        />
                        <Text numberOfLines={1} style={styles.playlistTitle}>{playlist.title}</Text>
                        {alreadyAdded ? <Text style={styles.added}>Agregada</Text> : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              <ActionRow
                active={downloaded}
                icon={downloaded ? 'trash-outline' : 'arrow-down-circle-outline'}
                label={workingDownload && typeof progress === 'number'
                  ? `Descargando ${Math.round(progress * 100)}%`
                  : downloaded ? 'Quitar descarga' : 'Descargar'}
                loading={workingDownload}
                onPress={() => { void toggleDownload(); }}
              />
              <ActionRow icon="share-outline" label="Compartir" onPress={() => { void share(); }} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.64)'
  },
  sheet: {
    maxHeight: '88%',
    paddingHorizontal: spacing.lg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.surfaceRaised
  },
  handle: {
    width: 42,
    height: 4,
    alignSelf: 'center',
    borderRadius: 2,
    backgroundColor: colors.textDim,
    marginTop: spacing.sm,
    marginBottom: spacing.lg
  },
  trackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.lg
  },
  coverFrame: {
    width: 62,
    height: 62,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft
  },
  trackCopy: {
    minWidth: 0,
    flex: 1
  },
  trackTitle: {
    ...typography.section,
    color: colors.text,
    fontSize: 17
  },
  trackMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs
  },
  close: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.surfaceSoft
  },
  actions: {
    gap: 2
  },
  actionRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md
  },
  actionPressed: {
    opacity: 0.58,
    backgroundColor: colors.surfaceSoft
  },
  actionIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft
  },
  activeActionIcon: {
    backgroundColor: 'rgba(169, 152, 255, 0.12)'
  },
  actionLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700'
  },
  activeActionLabel: {
    color: colors.accent
  },
  playlists: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface
  },
  playlistEyebrow: {
    ...typography.eyebrow,
    color: colors.textDim,
    marginBottom: spacing.sm
  },
  playlistRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.sm
  },
  playlistTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700'
  },
  added: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '700'
  }
});
