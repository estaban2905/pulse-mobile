import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import {
  EmptyState,
  IconButton,
  PlayerControls,
  Screen,
  ScreenHeader,
  TrackActionsModal,
  TrackRow
} from '../components';
import { useCatalog } from '../contexts/CatalogContext';
import { usePlayer } from '../contexts/PlayerContext';
import { colors, radii, spacing, typography } from '../theme';
import type { Track } from '../types/api';

export function QueueScreen() {
  const { getTrack } = useCatalog();
  const player = usePlayer();
  const [actionTrack, setActionTrack] = useState<Track | null>(null);

  const items = player.queue
    .map((id, position) => ({ position, track: getTrack(id) }))
    .filter((item): item is { position: number; track: Track } => Boolean(item.track));
  const upcoming = items.filter((item) => item.position > player.index);

  const confirmClear = () => Alert.alert(
    'Limpiar próximas canciones',
    'La canción actual seguirá reproduciéndose.',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpiar', style: 'destructive', onPress: player.clearUpcoming }
    ]
  );

  return (
    <Screen contentContainerStyle={styles.content}>
      <ScreenHeader
        eyebrow={player.contextLabel.toUpperCase()}
        title="Cola de reproducción"
        subtitle={upcoming.length ? `${upcoming.length} canciones a continuación` : undefined}
        onBack={() => router.back()}
        right={upcoming.length ? (
          <IconButton name="trash-outline" color={colors.danger} onPress={confirmClear} accessibilityLabel="Limpiar próximas canciones" />
        ) : undefined}
      />

      {player.current ? (
        <View style={styles.nowPlaying}>
          <Text style={styles.eyebrow}>SONANDO AHORA</Text>
          <TrackRow
            track={player.current}
            queue={player.queue}
            position={player.index}
            contextLabel={player.contextLabel}
            showAlbum
            onMore={() => setActionTrack(player.current)}
            trailing={(
              <View style={styles.rowActions}>
                <View style={styles.liveBadge}><Text style={styles.liveText}>EN VIVO</Text></View>
                <IconButton
                  name="ellipsis-horizontal"
                  size={32}
                  color={colors.textMuted}
                  onPress={() => setActionTrack(player.current)}
                  accessibilityLabel={`Más opciones para ${player.current.title}`}
                />
              </View>
            )}
          />
          <View style={styles.controls}><PlayerControls compact /></View>
        </View>
      ) : null}

      {upcoming.length ? (
        <View style={styles.list}>
          <Text style={styles.sectionTitle}>A continuación</Text>
          {upcoming.map(({ track, position }) => (
            <TrackRow
              key={`${track.id}-${position}`}
              track={track}
              queue={player.queue}
              position={position}
              contextLabel={player.contextLabel}
              showAlbum
              onMore={() => setActionTrack(track)}
              trailing={(
                <View style={styles.rowActions}>
                  <IconButton
                    name="chevron-up"
                    size={28}
                    iconSize={17}
                    color={colors.textDim}
                    disabled={position <= player.index + 1}
                    onPress={() => player.moveInQueue(position, position - 1)}
                    accessibilityLabel={`Subir ${track.title} en la cola`}
                  />
                  <IconButton
                    name="chevron-down"
                    size={28}
                    iconSize={17}
                    color={colors.textDim}
                    disabled={position >= player.queue.length - 1}
                    onPress={() => player.moveInQueue(position, position + 1)}
                    accessibilityLabel={`Bajar ${track.title} en la cola`}
                  />
                  <IconButton
                    name="ellipsis-horizontal"
                    size={28}
                    iconSize={17}
                    color={colors.textDim}
                    onPress={() => setActionTrack(track)}
                    accessibilityLabel={`Más opciones para ${track.title}`}
                  />
                  <IconButton
                    name="close"
                    size={28}
                    iconSize={17}
                    color={colors.textDim}
                    onPress={() => player.removeFromQueue(position)}
                    accessibilityLabel={`Quitar ${track.title} de la cola`}
                  />
                </View>
              )}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="list-outline"
          title={player.current ? 'No hay más canciones' : 'La cola está vacía'}
          description={player.current ? 'Añade canciones con el menú de cada pista.' : 'Elige una canción para comenzar a reproducir.'}
          actionLabel="Explorar"
          onAction={() => router.push('/search')}
        />
      )}

      <TrackActionsModal track={actionTrack} visible={Boolean(actionTrack)} onClose={() => setActionTrack(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 132 },
  nowPlaying: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xxl,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: `${colors.accent}55`,
    backgroundColor: `${colors.accent}0D`
  },
  eyebrow: { ...typography.eyebrow, color: colors.accent, marginHorizontal: spacing.sm, marginBottom: spacing.sm },
  liveBadge: { borderRadius: radii.round, backgroundColor: `${colors.accent}22`, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  liveText: { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  controls: { marginTop: spacing.sm },
  list: { paddingHorizontal: spacing.md },
  sectionTitle: { ...typography.section, color: colors.text, paddingHorizontal: spacing.sm, marginBottom: spacing.sm },
  rowActions: { flexDirection: 'row', alignItems: 'center' }
});

export default QueueScreen;
