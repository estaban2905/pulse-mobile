import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  activeChordIndex,
  capoShift,
  chordLine,
  guitarShape,
  mergeLyricsWithChords,
  prefersFlats,
  transposeKey,
  transposeSheet,
  transposeTimeline,
  uniqueChords
} from '@pulse/core';
import { ChordDiagram } from './ChordDiagram';
import { IconButton } from '../ui/IconButton';
import { usePlayer } from '../../contexts/PlayerContext';
import { cachedLyrics, fetchLyrics, type LyricsResult, type LyricsStatus } from '../../services/lyrics/lyricsApi';
import { cachedChords, fetchChords, type ChordsResult } from '../../services/chords/chordsApi';
import { colors, radii, spacing, typography } from '../../theme';

interface SongSheetModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Letra y acordes de lo que suena.
 *
 * Las dos cosas viven en la misma hoja y no en dos botones porque son la misma
 * pregunta —«qué estoy oyendo»— y porque la barra del reproductor ya tiene
 * cuatro botones: un quinto no cabría en una pantalla pequeña.
 *
 * La pestaña que importa es «Ambos». Los acordes sueltos los tiene cualquier
 * sitio de cifrados; ponerlos sobre la letra en el momento en que suenan solo se
 * puede hacer teniendo las dos cosas sincronizadas, y aquí se tienen.
 */

type Tab = 'lyrics' | 'chords' | 'both';

const TAB_LABELS: Record<Tab, string> = { lyrics: 'Letra', chords: 'Acordes', both: 'Ambos' };

const noLyrics: LyricsResult = { status: 'missing', lines: [] };
const noChords: ChordsResult = { status: 'missing', timeline: [], sheet: [] };

/** Cuánto se puede transponer. Más allá se repiten las tonalidades. */
const MAX_SHIFT = 6;
/** La cejilla rara vez pasa del séptimo traste, y más arriba no queda mástil. */
const MAX_CAPO = 7;

/**
 * Un cifrado son dos renglones alineados por columna, y eso exige ancho fijo.
 * Con la tipografía normal el acorde caería sobre la sílaba equivocada.
 */
const MONO = Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' });

const lyricsSubtitle = (status: LyricsStatus): string => {
  switch (status) {
    case 'synced': return 'Letra sincronizada';
    case 'plain': return 'Letra sin sincronizar';
    case 'instrumental': return 'Instrumental';
    case 'error': return 'No se pudo consultar la letra';
    default: return 'Letra no disponible';
  }
};

const lyricsMessage = (status: LyricsStatus): string => {
  switch (status) {
    case 'instrumental': return 'Esta canción está marcada como instrumental.';
    case 'error': return 'No se pudo consultar el proveedor de letras. Revisa tu conexión e inténtalo de nuevo.';
    default: return 'No hay ninguna letra para esta canción.';
  }
};

const chordsMessage = (status: ChordsResult['status']): string =>
  status === 'error'
    ? 'No se pudieron consultar los acordes. Revisa tu conexión e inténtalo de nuevo.'
    : 'Todavía no hay acordes para esta canción.';

const timeLabel = (seconds: number): string => {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

export function SongSheetModal({ visible, onClose }: SongSheetModalProps) {
  const insets = useSafeAreaInsets();
  const player = usePlayer();

  const [tab, setTab] = useState<Tab>('lyrics');
  const [lyrics, setLyrics] = useState<LyricsResult>(noLyrics);
  const [chords, setChords] = useState<ChordsResult>(noChords);
  const [loading, setLoading] = useState(false);

  /** Semitonos que el usuario ha subido o bajado la canción. */
  const [shift, setShift] = useState(0);
  /** Traste de la cejilla. Cambia lo que se digita, no lo que suena. */
  const [capo, setCapo] = useState(0);
  /** El acorde cuyo diagrama se está mirando, si hay alguno abierto. */
  const [diagram, setDiagram] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);
  /** Dónde empieza cada línea dentro del scroll, medido al dibujarla. */
  const lineOffsets = useRef<number[]>([]);
  const viewportHeight = useRef(0);

  const track = player.current;
  const trackId = track?.id;

  useEffect(() => {
    if (!visible || !trackId) return;

    // Cada canción se lee en su tono. Arrastrar la transposición de la anterior
    // sería enseñar unos acordes que nadie ha pedido y que además son falsos.
    setShift(0);
    setCapo(0);
    lineOffsets.current = [];

    const cachedL = cachedLyrics(trackId);
    const cachedC = cachedChords(trackId);
    if (cachedL && cachedC) {
      setLyrics(cachedL);
      setChords(cachedC);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setLyrics(cachedL ?? noLyrics);
    setChords(cachedC ?? noChords);

    // Las dos peticiones a la vez y no en cadena: son independientes, y
    // encadenarlas haría esperar los acordes a una letra que puede no existir.
    Promise.all([fetchLyrics(trackId, controller.signal), fetchChords(trackId, controller.signal)])
      .then(([nextLyrics, nextChords]) => {
        setLyrics(nextLyrics);
        setChords(nextChords);
        setLoading(false);
      })
      .catch(() => {
        // Abortada porque se cerró la hoja o cambió la canción.
      });

    return () => controller.abort();
  }, [visible, trackId]);

  /**
   * Lo que se enseña es la suma de las dos cosas, y en sentidos contrarios: subir
   * el tono sube los acordes, y poner cejilla los baja, porque el traste ya sube
   * el instrumento. Con cejilla en el segundo traste, un re se digita como do.
   */
  const total = shift + capoShift(capo);
  const flats = chords.musicKey ? prefersFlats(chords.musicKey, total) : undefined;

  const timeline = useMemo(
    () => transposeTimeline(chords.timeline, total, { flats }),
    [chords.timeline, total, flats]
  );
  const sheet = useMemo(() => transposeSheet(chords.sheet, total, { flats }), [chords.sheet, total, flats]);
  const merged = useMemo(
    () => mergeLyricsWithChords(lyrics.lines, timeline, player.duration || undefined),
    [lyrics.lines, timeline, player.duration]
  );

  const hasLyrics = lyrics.lines.length > 0;
  const hasChords = timeline.length > 0 || sheet.length > 0;
  const synced = lyrics.status === 'synced';

  /**
   * Los acordes que usa la canción, sin repetir.
   *
   * Es la lista que quien va a tocarla mira antes de empezar: cuatro acordes
   * conocidos y se lanza; uno raro y busca cómo se hace. Por eso van arriba y no
   * escondidos detrás de cada aparición.
   */
  const distinct = useMemo(
    () => uniqueChords(timeline.length ? timeline : sheet.flatMap((line) => line.chords)),
    [timeline, sheet]
  );

  const diagramShape = diagram ? guitarShape(diagram) : null;

  const tabs = useMemo(() => {
    const available: Tab[] = [];
    if (hasLyrics) available.push('lyrics');
    if (hasChords) available.push('chords');
    // «Ambos» necesita las dos cosas y además los tiempos: sin ellos no hay
    // forma de saber qué acorde va sobre qué verso.
    if (hasLyrics && synced && timeline.length > 0) available.push('both');
    return available;
  }, [hasLyrics, hasChords, synced, timeline.length]);

  // Al cambiar de canción la pestaña abierta puede dejar de existir: una con
  // acordes y otra sin ellos. Se cae a la primera que haya en vez de enseñar
  // una hoja en blanco.
  useEffect(() => {
    if (tabs.length && !tabs.includes(tab)) setTab(tabs[0]);
  }, [tabs, tab]);

  const activeLine = useMemo(() => {
    if (!synced) return -1;
    let index = -1;
    for (let position = 0; position < lyrics.lines.length; position += 1) {
      if (player.position >= lyrics.lines[position].time) index = position;
      else break;
    }
    return index;
  }, [lyrics.lines, player.position, synced]);

  const activeChord = useMemo(() => activeChordIndex(timeline, player.position), [timeline, player.position]);

  /**
   * Qué fila hay que mantener centrada, según lo que se esté mirando.
   *
   * El cifrado escrito a mano no lleva tiempos, así que no sigue a nadie: sus
   * filas se miden por verso y el acorde activo cuenta eventos del timeline, dos
   * numeraciones distintas. Mezclarlas desplazaría la hoja a una línea al azar.
   */
  const followed = tab === 'chords' ? (sheet.length ? -1 : activeChord) : activeLine;

  /**
   * Centra la fila que suena.
   *
   * Las posiciones se miden al dibujar en lugar de calcularse con una altura
   * fija: una línea larga ocupa dos renglones, y con una altura supuesta el
   * desplazamiento se iría acumulando hasta perder el verso.
   */
  useEffect(() => {
    if (!visible || followed < 0) return;
    const offset = lineOffsets.current[followed];
    if (offset === undefined) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, offset - viewportHeight.current / 2), animated: true });
  }, [followed, visible]);

  // Las alturas medidas son de la vista anterior y no valen para la nueva.
  useEffect(() => {
    lineOffsets.current = [];
  }, [tab]);

  const rememberOffset = useCallback((index: number, y: number) => {
    lineOffsets.current[index] = y;
  }, []);

  const seekTo = useCallback((seconds: number) => player.seek(seconds), [player]);

  if (!track) return null;

  const subtitle = loading
    ? 'Buscando letra y acordes…'
    : tab === 'lyrics'
      ? lyricsSubtitle(lyrics.status)
      : chords.status === 'timed'
        ? 'Acordes sincronizados'
        : chords.status === 'sheet'
          ? 'Cifrado'
          : lyricsSubtitle(lyrics.status);

  const keyLabel = chords.musicKey
    ? (transposeKey(chords.musicKey, total) ?? chords.musicKey)
    : total === 0
      ? 'Original'
      : `${total > 0 ? '+' : '−'}${Math.abs(total)}`;

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
            <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text>
          </View>
          <IconButton name="close" onPress={onClose} accessibilityLabel="Cerrar letra y acordes" />
        </View>

        {tabs.length > 1 ? (
          <View style={styles.tabs}>
            {tabs.map((option) => (
              <Pressable
                key={option}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === option }}
                onPress={() => setTab(option)}
                style={[styles.tab, tab === option && styles.tabActive]}
              >
                <Text style={[styles.tabLabel, tab === option && styles.tabLabelActive]}>{TAB_LABELS[option]}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {tab !== 'lyrics' && hasChords ? (
          <View style={styles.toolbar}>
            <Stepper
              label="Tono"
              value={keyLabel}
              onDown={() => setShift((current) => Math.max(-MAX_SHIFT, current - 1))}
              onUp={() => setShift((current) => Math.min(MAX_SHIFT, current + 1))}
              downLabel="Bajar medio tono"
              upLabel="Subir medio tono"
              canDown={shift > -MAX_SHIFT}
              canUp={shift < MAX_SHIFT}
            />
            <Stepper
              label="Cejilla"
              value={capo === 0 ? 'Ninguna' : `Traste ${capo}`}
              onDown={() => setCapo((current) => Math.max(0, current - 1))}
              onUp={() => setCapo((current) => Math.min(MAX_CAPO, current + 1))}
              downLabel="Bajar la cejilla un traste"
              upLabel="Subir la cejilla un traste"
              canDown={capo > 0}
              canUp={capo < MAX_CAPO}
            />
          </View>
        ) : null}

        {tab !== 'lyrics' && distinct.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.strip}
            contentContainerStyle={styles.stripContent}
          >
            {distinct.map((label) => (
              <Pressable
                key={label}
                accessibilityRole="button"
                accessibilityLabel={`Ver cómo se toca ${label}`}
                onPress={() => setDiagram(label)}
                style={styles.pill}
              >
                <Text style={styles.pillLabel}>{label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {loading && !hasLyrics && !hasChords ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.message}>Buscando letra y acordes…</Text>
          </View>
        ) : !tabs.length ? (
          <View style={styles.centered}>
            <Text style={styles.message}>{lyricsMessage(lyrics.status)}</Text>
            <Text style={styles.messageDim}>{chordsMessage(chords.status)}</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
            onLayout={(event) => {
              viewportHeight.current = event.nativeEvent.layout.height;
            }}
          >
            {tab === 'lyrics' ? (
              <LyricsView
                lines={lyrics.lines}
                activeIndex={activeLine}
                synced={synced}
                onSeek={seekTo}
                onMeasure={rememberOffset}
              />
            ) : tab === 'both' ? (
              <MergedView
                lines={merged}
                activeIndex={activeLine}
                onSeek={seekTo}
                onMeasure={rememberOffset}
              />
            ) : sheet.length ? (
              <SheetView lines={sheet} />
            ) : (
              <TimelineView
                timeline={timeline}
                activeIndex={activeChord}
                onSeek={seekTo}
                onMeasure={rememberOffset}
              />
            )}

            <Credits tab={tab} lyrics={lyrics} chords={chords} />
          </ScrollView>
        )}

        {/*
          Superpuesto dentro de esta misma hoja y no en un `Modal` propio: un
          modal dentro de otro se comporta de forma distinta en cada plataforma,
          y aquí no hace falta ninguno para oscurecer el fondo.
        */}
        {diagram ? (
          <Pressable
            accessibilityLabel="Cerrar el diagrama"
            accessibilityRole="button"
            onPress={() => setDiagram(null)}
            style={styles.overlay}
          >
            <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
              <Text style={styles.cardTitle}>{diagram}</Text>
              {diagramShape ? (
                <>
                  <ChordDiagram shape={diagramShape} gap={26} />
                  <Text style={styles.cardHint}>
                    {diagramShape.barre
                      ? `Cejilla en el traste ${diagramShape.barre.fret}.`
                      : 'Postura al aire, sin cejilla.'}
                  </Text>
                </>
              ) : (
                <Text style={styles.cardHint}>
                  No hay una postura estándar para este acorde. Mejor no enseñar una equivocada.
                </Text>
              )}
            </Pressable>
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
}

interface StepperProps {
  label: string;
  value: string;
  onDown: () => void;
  onUp: () => void;
  downLabel: string;
  upLabel: string;
  canDown: boolean;
  canUp: boolean;
}

function Stepper({ label, value, onDown, onUp, downLabel, upLabel, canDown, canUp }: StepperProps) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <IconButton
          name="remove"
          size={32}
          iconSize={17}
          disabled={!canDown}
          onPress={onDown}
          accessibilityLabel={downLabel}
        />
        <Text style={styles.stepperValue}>{value}</Text>
        <IconButton name="add" size={32} iconSize={17} disabled={!canUp} onPress={onUp} accessibilityLabel={upLabel} />
      </View>
    </View>
  );
}

interface LyricsViewProps {
  lines: { time: number; text: string }[];
  activeIndex: number;
  synced: boolean;
  onSeek: (seconds: number) => void;
  onMeasure: (index: number, y: number) => void;
}

function LyricsView({ lines, activeIndex, synced, onSeek, onMeasure }: LyricsViewProps) {
  return (
    <>
      {lines.map((line, index) => (
        <Pressable
          key={`${line.time}-${index}`}
          accessibilityRole={synced ? 'button' : 'text'}
          accessibilityLabel={synced ? `Saltar a ${line.text}` : line.text}
          disabled={!synced}
          onLayout={(event) => onMeasure(index, event.nativeEvent.layout.y)}
          onPress={() => synced && onSeek(line.time)}
          style={styles.lineRow}
        >
          <Text
            style={[
              styles.line,
              index === activeIndex && styles.lineActive,
              synced && index < activeIndex && styles.linePassed
            ]}
          >
            {line.text}
          </Text>
        </Pressable>
      ))}
    </>
  );
}

interface MergedViewProps {
  lines: { time: number; text: string; chords: { index: number; label: string }[]; sustained: string | null }[];
  activeIndex: number;
  onSeek: (seconds: number) => void;
  onMeasure: (index: number, y: number) => void;
}

/**
 * La letra con los acordes encima, en el momento en que suenan.
 *
 * El acorde que ya venía sonando se enseña entre paréntesis y apagado: un
 * cifrado de papel no lo repite porque se lee entero desde el principio, pero
 * aquí se puede entrar por la mitad de la canción y hay que saber qué suena.
 */
function MergedView({ lines, activeIndex, onSeek, onMeasure }: MergedViewProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wide}>
      <View>
        {lines.map((line, index) => {
          const above = line.chords.length
            ? chordLine(line.text, line.chords)
            : line.sustained
              ? `(${line.sustained})`
              : '';

          return (
            <Pressable
              key={`${line.time}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={above ? `${above}. ${line.text}` : line.text}
              onLayout={(event) => onMeasure(index, event.nativeEvent.layout.y)}
              onPress={() => onSeek(line.time)}
              style={styles.mergedRow}
            >
              {above ? (
                <Text
                  style={[
                    styles.chordRow,
                    !line.chords.length && styles.chordSustained,
                    index === activeIndex && styles.chordRowActive
                  ]}
                >
                  {above}
                </Text>
              ) : null}
              <Text
                style={[
                  styles.monoLine,
                  index === activeIndex && styles.lineActive,
                  index < activeIndex && styles.linePassed
                ]}
              >
                {line.text || ' '}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

interface SheetViewProps {
  lines: { section: string | null; text: string; chords: { index: number; label: string }[] }[];
}

/** El cifrado escrito a mano. No tiene tiempos, así que no sigue a la canción. */
function SheetView({ lines }: SheetViewProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wide}>
      <View>
        {lines.map((line, index) => {
          const above = chordLine(line.text, line.chords);
          const opensSection = line.section && line.section !== lines[index - 1]?.section;

          return (
            <View key={index}>
              {opensSection ? <Text style={styles.section}>{line.section}</Text> : null}
              {above ? <Text style={styles.chordRow}>{above}</Text> : null}
              {line.text ? <Text style={styles.monoLine}>{line.text}</Text> : null}
              {!above && !line.text ? <View style={styles.blank} /> : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

interface TimelineViewProps {
  timeline: { time: number; label: string }[];
  activeIndex: number;
  onSeek: (seconds: number) => void;
  onMeasure: (index: number, y: number) => void;
}

/**
 * Los acordes sin letra: la canción vista como su progresión.
 *
 * En rejilla y no en lista porque un acorde dura un par de segundos, y una
 * lista vertical de doscientas filas se desplazaría sin parar sin dejar ver la
 * estructura, que es justo lo que se viene a mirar.
 */
function TimelineView({ timeline, activeIndex, onSeek, onMeasure }: TimelineViewProps) {
  return (
    <View style={styles.grid}>
      {timeline.map((event, index) => (
        <Pressable
          key={`${event.time}-${index}`}
          accessibilityRole="button"
          accessibilityLabel={`${event.label} en el minuto ${timeLabel(event.time)}`}
          onLayout={(layout) => onMeasure(index, layout.nativeEvent.layout.y)}
          onPress={() => onSeek(event.time)}
          style={[styles.chip, index === activeIndex && styles.chipActive]}
        >
          <Text style={[styles.chipLabel, index === activeIndex && styles.chipLabelActive]}>{event.label}</Text>
          <Text style={[styles.chipTime, index === activeIndex && styles.chipTimeActive]}>{timeLabel(event.time)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * Quién puso cada cosa, y un aviso cuando los acordes no los ha revisado nadie.
 *
 * El aviso no es cortesía: unos acordes automáticos con la séptima mal puesta se
 * tocan igual de mal que unos inventados, y quien los lee merece saber de dónde
 * salen antes de fiarse.
 */
function Credits({ tab, lyrics, chords }: { tab: Tab; lyrics: LyricsResult; chords: ChordsResult }) {
  const automatic = typeof chords.confidence === 'number';

  return (
    <View style={styles.credits}>
      {tab !== 'chords' && lyrics.source ? (
        <Text style={styles.credit}>
          {lyrics.source === 'lrclib' ? 'Letra proporcionada por LRCLIB.' : `Letra proporcionada por ${lyrics.source}.`}
        </Text>
      ) : null}
      {tab !== 'lyrics' && chords.source && chords.status !== 'missing' ? (
        <Text style={styles.credit}>
          {automatic
            ? 'Acordes detectados automáticamente a partir del audio: puede que alguno necesite repaso.'
            : `Acordes de ${chords.source}.`}
        </Text>
      ) : null}
    </View>
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

  tabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    margin: spacing.xl,
    marginBottom: 0,
    padding: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.md
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radii.sm },
  tabActive: { backgroundColor: colors.surfaceRaised },
  tabLabel: { ...typography.caption, color: colors.textMuted, fontWeight: '700' },
  tabLabelActive: { color: colors.text },

  toolbar: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md
  },
  stepper: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.sm },
  stepperLabel: { ...typography.caption, color: colors.textDim, textAlign: 'center', fontWeight: '700' },
  stepperControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepperValue: { color: colors.text, fontSize: 15, fontWeight: '800', flex: 1, textAlign: 'center' },

  // `flexGrow: 0` es obligatorio: un ScrollView horizontal dentro de una columna
  // se estira hasta comerse la pantalla y dejaría la letra sin sitio.
  strip: { flexGrow: 0, marginTop: spacing.md },
  stripContent: { gap: spacing.sm, paddingHorizontal: spacing.xl },
  pill: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.round,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border
  },
  pillLabel: { color: colors.text, fontSize: 14, fontWeight: '800' },

  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: 'rgba(0, 0, 0, 0.66)'
  },
  card: {
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xxl,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border
  },
  cardTitle: { color: colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  cardHint: { ...typography.caption, color: colors.textMuted, textAlign: 'center', maxWidth: 220 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xxl },
  message: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  messageDim: { ...typography.body, color: colors.textDim, textAlign: 'center' },

  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  wide: { paddingRight: spacing.xxl },

  lineRow: { borderRadius: radii.md, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  line: { color: colors.textMuted, fontSize: 17, fontWeight: '600', lineHeight: 26 },
  lineActive: { color: colors.accent, fontWeight: '800' },
  linePassed: { color: colors.textDim },

  mergedRow: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radii.md },
  monoLine: { color: colors.textMuted, fontFamily: MONO, fontSize: 14, lineHeight: 20 },
  chordRow: { color: colors.accent, fontFamily: MONO, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  chordRowActive: { color: colors.accentStrong },
  chordSustained: { color: colors.textDim, fontWeight: '400' },

  section: { ...typography.caption, color: colors.textDim, fontWeight: '800', marginTop: spacing.lg, letterSpacing: 1 },
  blank: { height: spacing.md },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    alignItems: 'center',
    minWidth: 62,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipLabel: { color: colors.text, fontSize: 15, fontWeight: '800' },
  chipLabelActive: { color: colors.accentInk },
  chipTime: { ...typography.caption, color: colors.textDim, marginTop: 1 },
  chipTimeActive: { color: colors.accentInk, opacity: 0.7 },

  credits: { marginTop: spacing.xl, gap: spacing.xs, paddingHorizontal: spacing.sm },
  credit: { ...typography.caption, color: colors.textDim }
});
