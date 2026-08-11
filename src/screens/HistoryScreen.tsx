import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import {
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  Screen,
  ScreenHeader,
  TrackActionsModal,
  TrackRow
} from '../components';
import { useCatalog } from '../contexts/CatalogContext';
import { useLibrary } from '../contexts/LibraryContext';
import { colors, spacing, typography } from '../theme';
import { goBackOrReplace } from '../navigation/goBack';
import type { Track } from '../types/api';
import { relativeDate } from '../utils/format';

export function HistoryScreen() {
  const { loading, error, refresh, getTrack } = useCatalog();
  const library = useLibrary();
  const [actionTrack, setActionTrack] = useState<Track | null>(null);

  const entries = useMemo(() => library.history
    .map((entry) => ({ ...entry, track: getTrack(entry.trackId) }))
    .filter((entry): entry is typeof entry & { track: Track } => Boolean(entry.track)), [getTrack, library.history]);
  const queue = entries.map((entry) => entry.track.id);

  if (loading) return <Screen><LoadingState label="Cargando historial…" /></Screen>;
  if (error) return <Screen><ErrorState message={error} onRetry={() => void refresh()} /></Screen>;

  const confirmClear = () => Alert.alert(
    'Limpiar historial',
    'Se eliminará todo tu historial de reproducción de este dispositivo.',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpiar', style: 'destructive', onPress: library.clearHistory }
    ]
  );

  let lastDate = '';
  return (
    <Screen contentContainerStyle={styles.content}>
      <ScreenHeader
        eyebrow="TU ACTIVIDAD"
        title="Historial"
        subtitle={entries.length ? `${entries.length} reproducciones recientes` : undefined}
        onBack={() => goBackOrReplace('/')}
        right={entries.length ? (
          <IconButton name="trash-outline" color={colors.danger} onPress={confirmClear} accessibilityLabel="Limpiar historial" />
        ) : undefined}
      />

      {entries.length ? (
        <View style={styles.list}>
          {entries.map((entry, position) => {
            const date = relativeDate(entry.playedAt);
            const showDate = date !== lastDate;
            lastDate = date;
            return (
              <React.Fragment key={entry.id}>
                {showDate ? <Text style={styles.date}>{date}</Text> : null}
                <TrackRow
                  track={entry.track}
                  queue={queue}
                  position={position}
                  contextLabel="Historial"
                  showAlbum
                  onMore={() => setActionTrack(entry.track)}
                  trailing={(
                    <View style={styles.rowActions}>
                      <IconButton
                        name="ellipsis-horizontal"
                        size={32}
                        color={colors.textDim}
                        onPress={() => setActionTrack(entry.track)}
                        accessibilityLabel={`Más opciones para ${entry.track.title}`}
                      />
                      <IconButton
                        name="close"
                        size={32}
                        color={colors.textDim}
                        onPress={() => library.removeHistoryEntry(entry.id)}
                        accessibilityLabel={`Quitar ${entry.track.title} del historial`}
                      />
                    </View>
                  )}
                />
              </React.Fragment>
            );
          })}
        </View>
      ) : (
        <EmptyState
          icon="time-outline"
          title="Tu historial está vacío"
          description="Las canciones que reproduzcas aparecerán aquí."
          actionLabel="Buscar música"
          onAction={() => router.push('/search')}
        />
      )}

      <TrackActionsModal track={actionTrack} visible={Boolean(actionTrack)} onClose={() => setActionTrack(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 132 },
  list: { paddingHorizontal: spacing.md },
  date: { ...typography.eyebrow, color: colors.textMuted, paddingHorizontal: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.sm },
  rowActions: { flexDirection: 'row', alignItems: 'center' }
});

export default HistoryScreen;
