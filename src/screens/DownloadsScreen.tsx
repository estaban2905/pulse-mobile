import { router } from 'expo-router';
import React, { useState } from 'react';
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
import { useSettings } from '../contexts/SettingsContext';
import { colors, radii, spacing, typography } from '../theme';
import type { Track } from '../types/api';

const bitrateByQuality = { normal: 128, high: 256, 'very-high': 320 } as const;

function formatMegabytes(value: number): string {
  return value >= 1024 ? `${(value / 1024).toFixed(1)} GB` : `${Math.max(0.1, value).toFixed(1)} MB`;
}

export function DownloadsScreen() {
  const { loading, error, refresh, getTrack } = useCatalog();
  const library = useLibrary();
  const { settings } = useSettings();
  const [actionTrack, setActionTrack] = useState<Track | null>(null);

  const tracks = Object.keys(library.downloadedTracks)
    .map((id) => getTrack(id))
    .filter((track): track is Track => Boolean(track));
  const queue = tracks.map((track) => track.id);
  const bitrate = bitrateByQuality[settings.downloadQuality];
  const estimatedMb = tracks.reduce((sum, track) => sum + (track.duration * bitrate / 8 / 1024), 0);

  if (loading) return <Screen><LoadingState label="Cargando descargas…" /></Screen>;
  if (error) return <Screen><ErrorState message={error} onRetry={() => void refresh()} /></Screen>;

  const confirmClear = () => Alert.alert(
    'Eliminar todas las descargas',
    'Los archivos se borrarán del dispositivo, pero seguirán disponibles en línea.',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void library.clearDownloads() }
    ]
  );

  return (
    <Screen contentContainerStyle={styles.content}>
      <ScreenHeader
        eyebrow="SIN CONEXIÓN"
        title="Descargas"
        subtitle={tracks.length ? `${tracks.length} canciones disponibles sin internet` : undefined}
        onBack={() => router.back()}
        right={tracks.length ? (
          <IconButton name="trash-outline" color={colors.danger} onPress={confirmClear} accessibilityLabel="Eliminar todas las descargas" />
        ) : undefined}
      />

      {tracks.length ? (
        <>
          <View style={styles.summary}>
            <View style={styles.summaryIcon}>
              <Text style={styles.downloadGlyph}>↓</Text>
            </View>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryTitle}>Almacenamiento estimado</Text>
              <Text style={styles.summaryValue}>{formatMegabytes(estimatedMb)}</Text>
              <Text style={styles.summaryCaption}>Calidad {settings.downloadQuality === 'very-high' ? 'muy alta' : settings.downloadQuality === 'high' ? 'alta' : 'normal'}</Text>
            </View>
          </View>

          {library.downloadError ? <Text style={styles.error}>{library.downloadError}</Text> : null}

          <View style={styles.list}>
            {tracks.map((track, position) => (
              <TrackRow
                key={track.id}
                track={track}
                queue={queue}
                position={position}
                contextLabel="Descargas"
                showAlbum
                onMore={() => setActionTrack(track)}
                trailing={(
                  <View style={styles.rowActions}>
                    <IconButton
                      name="ellipsis-horizontal"
                      size={34}
                      color={colors.textMuted}
                      onPress={() => setActionTrack(track)}
                      accessibilityLabel={`Más opciones para ${track.title}`}
                    />
                    <IconButton
                      name="trash-outline"
                      size={34}
                      color={colors.textMuted}
                      onPress={() => void library.removeDownload(track.id)}
                      accessibilityLabel={`Eliminar descarga de ${track.title}`}
                    />
                  </View>
                )}
              />
            ))}
          </View>
        </>
      ) : (
        <EmptyState
          icon="cloud-download-outline"
          title="No tienes descargas"
          description="Descarga canciones o playlists para escucharlas cuando no tengas conexión."
          actionLabel="Explorar música"
          onAction={() => router.push('/search')}
        />
      )}

      <TrackActionsModal track={actionTrack} visible={Boolean(actionTrack)} onClose={() => setActionTrack(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 132 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  summaryIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radii.round, backgroundColor: `${colors.accent}22` },
  downloadGlyph: { color: colors.accent, fontSize: 28, fontWeight: '800' },
  summaryCopy: { flex: 1 },
  summaryTitle: { ...typography.caption, color: colors.textMuted },
  summaryValue: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: spacing.xs },
  summaryCaption: { ...typography.caption, color: colors.textDim },
  error: { ...typography.caption, color: colors.danger, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  list: { paddingHorizontal: spacing.md },
  rowActions: { flexDirection: 'row', alignItems: 'center' }
});

export default DownloadsScreen;
