import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Modal, Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  EmptyState,
  IconButton,
  PlayerControls,
  ProgressBar,
  Screen,
  ScreenHeader,
  TrackActionsModal
} from '../components';
import { useCatalog } from '../contexts/CatalogContext';
import { useLibrary } from '../contexts/LibraryContext';
import { usePlayer } from '../contexts/PlayerContext';
import { colors, radii, shadows, spacing, typography } from '../theme';
import { goBackOrReplace } from '../navigation/goBack';
import { resolveTrackCoverUrl } from '../utils/artwork';

const timerOptions: Array<{ label: string; minutes: number | null }> = [
  { label: '15 minutos', minutes: 15 },
  { label: '30 minutos', minutes: 30 },
  { label: '45 minutos', minutes: 45 },
  { label: '1 hora', minutes: 60 },
  { label: 'Desactivar', minutes: null }
];

export function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const player = usePlayer();
  const library = useLibrary();
  const { getAlbum, getArtist } = useCatalog();
  const [timerVisible, setTimerVisible] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);

  const track = player.current;
  const album = track ? getAlbum(track.albumId) : undefined;
  const artist = track ? getArtist(track.artistId) : undefined;
  const coverUrl = resolveTrackCoverUrl(track, album);
  const availableHeight = window.height - insets.top - insets.bottom;
  const artworkSize = Math.max(152, Math.min(390, window.width - spacing.xl * 4, availableHeight - 360));

  if (!track) {
    return (
      <Screen scroll={false}>
        <ScreenHeader title="Reproductor" onBack={() => goBackOrReplace('/')} />
        <EmptyState
          icon="musical-notes-outline"
          title="Nada reproduciéndose"
          description="Elige una canción y aquí aparecerán todos los controles."
          actionLabel="Reproducir catálogo"
          onAction={player.toggle}
        />
      </Screen>
    );
  }

  const remainingMinutes = Math.max(1, Math.ceil((player.duration - player.position) / 60));
  const timerLabel = player.sleepEndsAt
    ? `${Math.max(1, Math.ceil((player.sleepEndsAt - Date.now()) / 60_000))} min`
    : 'Temporizador';

  const shareTrack = async () => {
    await Share.share({
      title: track.title,
      message: `Estoy escuchando “${track.title}” de ${artist?.name ?? 'Pulse Music'} en Pulse Music.`
    });
  };

  return (
    <Screen scroll={false} contentContainerStyle={styles.screen}>
      <ScreenHeader
        eyebrow="REPRODUCIENDO DESDE"
        title={player.contextLabel}
        onBack={() => goBackOrReplace('/')}
        right={<IconButton name="ellipsis-horizontal" onPress={() => setActionsVisible(true)} accessibilityLabel="Más opciones" />}
      />

      <View style={styles.content}>
        <View style={[styles.artworkFrame, { maxHeight: artworkSize }]}>
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              contentFit="cover"
              style={[styles.artwork, { width: artworkSize, height: artworkSize }]}
              transition={180}
            />
          ) : (
            <View style={[styles.artwork, styles.artworkFallback, { width: artworkSize, height: artworkSize }]}>
              <Text style={styles.artworkGlyph}>♫</Text>
            </View>
          )}
        </View>

        <View style={styles.trackInfo}>
          <View style={styles.trackCopy}>
            <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
            <Pressable
              accessibilityRole="button"
              disabled={!artist}
              onPress={() => artist && router.push(`/artist/${artist.id}`)}
            >
              <Text style={styles.artist} numberOfLines={1}>{artist?.name ?? 'Artista desconocido'}</Text>
            </Pressable>
          </View>
          <IconButton
            name={library.isFavorite(track.id) ? 'heart' : 'heart-outline'}
            size={44}
            color={library.isFavorite(track.id) ? colors.accent : colors.textMuted}
            onPress={() => library.toggleFavorite(track.id)}
            accessibilityLabel={library.isFavorite(track.id) ? 'Quitar de favoritas' : 'Añadir a favoritas'}
          />
        </View>

        <ProgressBar />
        <PlayerControls />

        <View style={styles.utilityRow}>
          <View style={styles.utilityItem}>
            <IconButton
              name="moon-outline"
              active={Boolean(player.sleepEndsAt)}
              onPress={() => setTimerVisible(true)}
              accessibilityLabel="Configurar temporizador"
            />
            <Text style={[styles.utilityLabel, player.sleepEndsAt ? styles.utilityActive : undefined]}>{timerLabel}</Text>
          </View>
          <View style={styles.utilityItem}>
            <IconButton name="list-outline" onPress={() => router.push('/queue')} accessibilityLabel="Abrir cola" />
            <Text style={styles.utilityLabel}>{Math.max(0, player.queue.length - player.index - 1)} en cola</Text>
          </View>
          <View style={styles.utilityItem}>
            <IconButton name="share-outline" onPress={() => void shareTrack()} accessibilityLabel="Compartir canción" />
            <Text style={styles.utilityLabel}>Compartir</Text>
          </View>
        </View>

        {player.error ? <Text style={styles.error}>{player.error}</Text> : null}
      </View>

      <Modal
        animationType="fade"
        navigationBarTranslucent
        onRequestClose={() => setTimerVisible(false)}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible={timerVisible}
      >
        <Pressable style={styles.backdrop} onPress={() => setTimerVisible(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Temporizador</Text>
            <Text style={styles.sheetSubtitle}>Pausa la música automáticamente.</Text>
            {timerOptions.slice(0, 4).map((option) => (
              <Pressable
                key={option.label}
                style={styles.timerOption}
                onPress={() => {
                  player.setSleepTimer(option.minutes);
                  setTimerVisible(false);
                }}
              >
                <Text style={styles.timerText}>{option.label}</Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.timerOption}
              onPress={() => {
                player.setSleepTimer(remainingMinutes);
                setTimerVisible(false);
              }}
            >
              <Text style={styles.timerText}>Al terminar la canción</Text>
              <Text style={styles.timerDetail}>{remainingMinutes} min aprox.</Text>
            </Pressable>
            {player.sleepEndsAt ? (
              <Pressable
                style={[styles.timerOption, styles.timerDanger]}
                onPress={() => {
                  player.setSleepTimer(null);
                  setTimerVisible(false);
                }}
              >
                <Text style={styles.timerDangerText}>Desactivar temporizador</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <TrackActionsModal track={track} visible={actionsVisible} onClose={() => setActionsVisible(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingBottom: spacing.lg },
  content: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'space-between' },
  artworkFrame: { flex: 1, maxHeight: 390, justifyContent: 'center', alignItems: 'center', marginVertical: spacing.md },
  artwork: { borderRadius: radii.xl, backgroundColor: colors.surfaceSoft, ...shadows.card },
  artworkFallback: { alignItems: 'center', justifyContent: 'center' },
  artworkGlyph: { color: colors.accent, fontSize: 86 },
  trackInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  trackCopy: { flex: 1 },
  trackTitle: { color: colors.text, fontSize: 23, fontWeight: '800', letterSpacing: -0.4 },
  artist: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  utilityRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.md },
  utilityItem: { width: 90, alignItems: 'center' },
  utilityLabel: { ...typography.caption, color: colors.textDim, marginTop: spacing.xs, textAlign: 'center' },
  utilityActive: { color: colors.accent },
  error: { ...typography.caption, color: colors.danger, textAlign: 'center', marginTop: spacing.sm },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.68)' },
  sheet: { backgroundColor: colors.surfaceRaised, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, paddingTop: spacing.md },
  handle: { width: 42, height: 4, borderRadius: radii.round, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.xl },
  sheetTitle: { ...typography.section, color: colors.text },
  sheetSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md },
  timerOption: { minHeight: 50, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  timerText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  timerDetail: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  timerDanger: { borderBottomWidth: 0, marginTop: spacing.sm },
  timerDangerText: { color: colors.danger, fontSize: 15, fontWeight: '700' }
});

export default PlayerScreen;
