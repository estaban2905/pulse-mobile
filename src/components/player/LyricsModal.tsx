import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '../ui/IconButton';
import { usePlayer } from '../../contexts/PlayerContext';
import { cachedLyrics, fetchLyrics, type LyricsResult, type LyricsStatus } from '../../services/lyrics/lyricsApi';
import { colors, radii, spacing, typography } from '../../theme';

interface LyricsModalProps {
  visible: boolean;
  onClose: () => void;
}

const empty: LyricsResult = { status: 'missing', lines: [] };

const subtitleFor = (status: LyricsStatus, loading: boolean): string => {
  if (loading) return 'Buscando letra…';
  switch (status) {
    case 'synced': return 'Letra sincronizada';
    case 'plain': return 'Letra sin sincronizar';
    case 'instrumental': return 'Instrumental';
    case 'error': return 'No se pudo consultar la letra';
    default: return 'Letra no disponible';
  }
};

const messageFor = (status: LyricsStatus): string => {
  switch (status) {
    case 'instrumental': return 'Esta canción está marcada como instrumental.';
    case 'error': return 'No se pudo consultar el proveedor de letras. Revisa tu conexión e inténtalo de nuevo.';
    default: return 'No hay ninguna letra para esta canción.';
  }
};

export function LyricsModal({ visible, onClose }: LyricsModalProps) {
  const insets = useSafeAreaInsets();
  const player = usePlayer();
  const [result, setResult] = useState<LyricsResult>(empty);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  /** Dónde empieza cada línea dentro del scroll, medido al dibujarla. */
  const lineOffsets = useRef<number[]>([]);
  const viewportHeight = useRef(0);

  const track = player.current;
  const trackId = track?.id;

  useEffect(() => {
    if (!visible || !trackId) return;

    const cached = cachedLyrics(trackId);
    if (cached) {
      setResult(cached);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setResult(empty);
    lineOffsets.current = [];

    fetchLyrics(trackId, controller.signal)
      .then((next) => {
        setResult(next);
        setLoading(false);
      })
      .catch(() => {
        // Abortada porque se cerró la hoja o cambió la canción.
      });

    return () => controller.abort();
  }, [visible, trackId]);

  const lines = result.lines;
  const synced = result.status === 'synced';

  const activeIndex = useMemo(() => {
    if (!synced) return -1;
    let index = -1;
    for (let position = 0; position < lines.length; position += 1) {
      if (player.position >= lines[position].time) index = position;
      else break;
    }
    return index;
  }, [lines, player.position, synced]);

  /**
   * Centra la línea activa.
   *
   * Las posiciones se miden al dibujar en lugar de calcularse con una altura
   * fija: una línea larga ocupa dos renglones, y con una altura supuesta el
   * desplazamiento se iría acumulando hasta perder el verso.
   */
  useEffect(() => {
    if (!visible || activeIndex < 0) return;
    const offset = lineOffsets.current[activeIndex];
    if (offset === undefined) return;
    scrollRef.current?.scrollTo({
      y: Math.max(0, offset - viewportHeight.current / 2),
      animated: true
    });
  }, [activeIndex, visible]);

  const rememberOffset = useCallback((index: number, y: number) => {
    lineOffsets.current[index] = y;
  }, []);

  if (!track) return null;

  return (
    <Modal
      animationType="slide"
      navigationBarTranslucent
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text numberOfLines={1} style={styles.title}>{track.title}</Text>
            <Text numberOfLines={1} style={styles.subtitle}>
              {subtitleFor(result.status, loading)}
            </Text>
          </View>
          <IconButton name="close" onPress={onClose} accessibilityLabel="Cerrar letra" />
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.message}>Buscando letra…</Text>
          </View>
        ) : lines.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.message}>{messageFor(result.status)}</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
            onLayout={(event) => {
              viewportHeight.current = event.nativeEvent.layout.height;
            }}
          >
            {lines.map((line, index) => {
              const active = index === activeIndex;
              const passed = synced && index < activeIndex;
              return (
                <Pressable
                  key={`${line.time}-${index}`}
                  accessibilityRole={synced ? 'button' : 'text'}
                  accessibilityLabel={synced ? `Saltar a ${line.text}` : line.text}
                  disabled={!synced}
                  onLayout={(event) => rememberOffset(index, event.nativeEvent.layout.y)}
                  onPress={() => synced && player.seek(line.time)}
                  style={styles.lineRow}
                >
                  <Text
                    style={[
                      styles.line,
                      active && styles.lineActive,
                      passed && styles.linePassed
                    ]}
                  >
                    {line.text}
                  </Text>
                </Pressable>
              );
            })}
            {result.source ? (
              <Text style={styles.credit}>
                {result.source === 'lrclib'
                  ? 'Letra proporcionada por LRCLIB.'
                  : `Letra proporcionada por ${result.source}.`}
              </Text>
            ) : null}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  headerCopy: { flex: 1 },
  title: { color: colors.text, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xxl },
  message: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  lineRow: { borderRadius: radii.md, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  line: { color: colors.textMuted, fontSize: 17, fontWeight: '600', lineHeight: 26 },
  lineActive: { color: colors.accent, fontSize: 19, fontWeight: '800' },
  linePassed: { color: colors.textDim },
  credit: { ...typography.caption, color: colors.textDim, marginTop: spacing.xl, paddingHorizontal: spacing.sm }
});
