import type { LyricLine } from './catalog';
import type { ChordEvent, ChordSheetLine } from './chordsApi';

/**
 * Lo que se hace con los acordes una vez recibidos.
 *
 * Todo esto es cálculo puro y vive en el cliente a propósito. Transponer o
 * poner cejilla no cambia la canción, cambia cómo la va a tocar quien la mira:
 * son dos guitarristas pidiendo cosas distintas de la misma pista, y resolverlo
 * en el servidor obligaría a un viaje de red por cada semitono.
 */

/** Los doce semitonos, contando desde do. */
const OCTAVE = 12;

const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/**
 * Las tonalidades que se escriben con bemoles, por semitono.
 *
 * La misma tecla se llama fa sostenido o sol bemol según la tonalidad, y elegir
 * mal no es un detalle: un cifrado en mi bemol lleno de re sostenidos es
 * correcto y aun así ilegible. Con la tonalidad se acierta; sin ella se hereda
 * la grafía que traía el acorde original, que es lo mejor que se puede hacer.
 *
 * Va por número de semitono y no por nombre a propósito. Preguntar «¿está su
 * nombre en bemoles dentro de la lista de tonalidades con bemoles?» siempre
 * responde que sí, porque el nombre en bemoles de cualquier tecla negra lo está:
 * así, mi transportado dos semitonos salía sol bemol en lugar de fa sostenido, y
 * con él un cifrado que mezclaba las dos grafías.
 *
 * Son las tonalidades cuya armadura lleva bemoles: en mayor, reb / mib / fa /
 * lab / sib; en menor, dom / rem / mibm / fam / solm / sibm.
 */
const FLAT_MAJOR = new Set([1, 3, 5, 8, 10]);
const FLAT_MINOR = new Set([0, 2, 3, 5, 7, 10]);

/** Los símbolos que ocupan el sitio de un acorde sin serlo: silencio, repetición. */
const NOT_A_CHORD = new Set(['N.C.', 'NC', '%', '/']);

/** `Fundamental` + `lo que sea` + `/bajo`. La fundamental es lo único obligatorio. */
const CHORD = /^([A-G][#b]{0,2})([^/]*)(?:\/([A-G][#b]{0,2}))?$/;

const NOTE = /^([A-G])([#b]{0,2})$/;

/** La nota como número de semitono, o `null` si no es una nota. */
function pitchOf(note: string): number | null {
  const match = NOTE.exec(note);
  if (!match) return null;

  const [, letter, accidentals] = match;
  let pitch = NATURAL[letter];
  for (const accidental of accidentals) pitch += accidental === '#' ? 1 : -1;

  return ((pitch % OCTAVE) + OCTAVE) % OCTAVE;
}

function nameOf(pitch: number, flats: boolean): string {
  return (flats ? FLAT_NAMES : SHARP_NAMES)[((pitch % OCTAVE) + OCTAVE) % OCTAVE];
}

/** Un acorde ya desarmado en sus partes. */
export interface ChordParts {
  /** La fundamental tal y como estaba escrita, con su alteración. */
  root: string;
  /** La fundamental como número de semitono, de 0 (do) a 11 (si). */
  pitch: number;
  /** Todo lo que sigue a la fundamental: `m`, `7`, `sus4`, `add9`… */
  quality: string;
  /** La nota del bajo en un acorde con barra, o nulo. */
  bass: string | null;
}

/**
 * Desarma un acorde, o devuelve nulo si lo que hay no es uno.
 *
 * Es el único sitio donde se decide qué cuenta como acorde: transponer, elegir
 * la grafía y buscar la postura preguntan aquí, y así las tres cosas están
 * siempre de acuerdo sobre lo que están mirando.
 */
export function parseChord(label: string): ChordParts | null {
  const trimmed = label.trim();
  if (!trimmed || NOT_A_CHORD.has(trimmed)) return null;

  const match = CHORD.exec(trimmed);
  if (!match) return null;

  const [, root, quality, bass] = match;
  const pitch = pitchOf(root);
  if (pitch === null) return null;

  return { root, pitch, quality, bass: bass ?? null };
}

export interface TransposeOptions {
  /**
   * Escribir con bemoles en lugar de sostenidos. Si se omite, se conserva la
   * grafía del acorde de partida.
   */
  flats?: boolean;
}

/**
 * Sube o baja un acorde los semitonos indicados.
 *
 * Lo que no se reconoce vuelve tal cual. Un cifrado escrito por una persona
 * lleva anotaciones que no son acordes —un `N.C.`, una barra de compás, una
 * indicación suelta— y perderlas al transponer sería devolver un cifrado peor
 * que el original.
 */
export function transposeLabel(label: string, semitones: number, options: TransposeOptions = {}): string {
  const parsed = parseChord(label);
  if (!parsed) return label;

  const { root, pitch, quality, bass } = parsed;
  const flats = options.flats ?? (root.includes('b') || (bass?.includes('b') ?? false));
  const moved = nameOf(pitch + semitones, flats);

  if (!bass) return moved + quality;

  const bassPitch = pitchOf(bass);
  // Un bajo ilegible no invalida la fundamental: se transpone lo que se puede y
  // se deja el resto intacto, que sigue siendo más útil que no tocar nada.
  return `${moved}${quality}/${bassPitch === null ? bass : nameOf(bassPitch + semitones, flats)}`;
}

/** La tonalidad, transpuesta igual que los acordes. */
export function transposeKey(musicKey: string | null | undefined, semitones: number): string | null {
  if (!musicKey) return null;
  return transposeLabel(musicKey, semitones, { flats: prefersFlats(musicKey, semitones) });
}

/**
 * Si la canción, ya transpuesta, se escribe con bemoles.
 *
 * Se calcula una vez por canción y se pasa a cada acorde: decidirlo acorde a
 * acorde daría un cifrado con sostenidos y bemoles mezclados según cómo se
 * hubiera escrito cada uno.
 */
export function prefersFlats(musicKey: string | null | undefined, semitones = 0): boolean {
  if (!musicKey) return false;

  const parsed = parseChord(musicKey);
  if (!parsed) return false;

  const { pitch, quality } = parsed;

  // `maj7` es mayor por mucho que empiece por eme; `-` es como algunos cifrados
  // escriben el menor.
  const minor = (quality.startsWith('m') && !quality.startsWith('maj')) || quality.startsWith('-');
  const target = ((pitch + semitones) % OCTAVE + OCTAVE) % OCTAVE;

  return (minor ? FLAT_MINOR : FLAT_MAJOR).has(target);
}

export function transposeTimeline(timeline: ChordEvent[], semitones: number, options?: TransposeOptions): ChordEvent[] {
  if (!semitones) return timeline;
  return timeline.map((event) => ({ time: event.time, label: transposeLabel(event.label, semitones, options) }));
}

export function transposeSheet(sheet: ChordSheetLine[], semitones: number, options?: TransposeOptions): ChordSheetLine[] {
  if (!semitones) return sheet;
  return sheet.map((line) => ({
    ...line,
    chords: line.chords.map((chord) => ({ index: chord.index, label: transposeLabel(chord.label, semitones, options) }))
  }));
}

/**
 * Cuántos semitonos hay que transponer para tocar con cejilla en ese traste.
 *
 * La cejilla sube el instrumento, así que para que suene lo mismo hay que
 * digitar más abajo: con cejilla en el segundo traste, un re se toca como do.
 * Es el sentido contrario al que casi todo el mundo espera, y por eso existe
 * esta función en lugar de un menos suelto repartido por la interfaz.
 */
export function capoShift(fret: number): number {
  return -fret;
}

/** Un acorde colocado sobre un verso. */
export interface PlacedChord {
  label: string;
  /** Segundos desde el principio de la pista. */
  time: number;
  /** Columna aproximada dentro del verso, en caracteres. */
  index: number;
}

/** Un verso con los acordes que suenan mientras se canta. */
export interface MergedLine {
  time: number;
  text: string;
  /** Los que entran durante el verso, en orden. */
  chords: PlacedChord[];
  /**
   * El que ya venía sonando al empezar el verso y no cambia en él.
   *
   * Un cifrado de papel no lo repite —se escribe donde cambia—, pero quien
   * llega a mitad de canción necesita saber qué está sonando. Va aparte para
   * que la pantalla decida: apagado, o nada.
   */
  sustained: string | null;
}

/**
 * Pone los acordes encima de la letra.
 *
 * Esto es lo que ningún sitio de cifrados puede hacer y aquí sale casi solo:
 * las letras ya vienen sincronizadas, así que basta repartir cada acorde en el
 * verso que estaba sonando.
 *
 * La colocación dentro del verso es proporcional al tiempo, y ahí está el
 * límite honesto de todo esto: el LRC marca el principio de cada línea, no de
 * cada sílaba, así que un acorde cae en la palabra correcta pero no siempre en
 * la sílaba exacta. Reparte bien cuando se canta parejo y se desvía cuando hay
 * una pausa larga en medio del verso.
 */
export function mergeLyricsWithChords(
  lines: LyricLine[],
  timeline: ChordEvent[],
  /** Duración de la pista, para saber hasta dónde llega el último verso. */
  duration?: number
): MergedLine[] {
  const plain = lines.map((line) => ({ time: line.time, text: line.text, chords: [], sustained: null }));
  if (!lines.length || !timeline.length) return plain;

  // Sin sincronizar, todos los versos están en el segundo cero y no hay ventana
  // que repartir: colocarlos igualmente amontonaría la canción entera sobre el
  // primero. Mejor devolver la letra intacta y que la pantalla enseñe las dos
  // cosas por separado.
  if (lines.length > 1 && lines[lines.length - 1].time <= 0) return plain;

  const merged: MergedLine[] = [];
  let read = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const next = lines[index + 1];
    // El último verso llega hasta el final de la pista. Sin duración se le da un
    // margen generoso: es preferible recoger de más que dejar fuera la coda.
    const end = next ? next.time : Math.max(line.time, duration ?? line.time + 30);
    const span = end - line.time;

    // El que ya sonaba antes de empezar el verso, que puede venir de muy atrás.
    const before = read > 0 ? timeline[read - 1] : undefined;

    const chords: PlacedChord[] = [];
    while (read < timeline.length && timeline[read].time < end) {
      const event = timeline[read];
      read += 1;
      // Los anteriores al primer verso —una intro instrumental— no tienen dónde
      // ir. Se consumen para que el `sustained` del primer verso los recoja.
      if (event.time < line.time) continue;

      const ratio = span > 0 ? (event.time - line.time) / span : 0;
      chords.push({
        label: event.label,
        time: event.time,
        index: Math.min(line.text.length, Math.max(0, Math.round(ratio * line.text.length)))
      });
    }

    merged.push({
      time: line.time,
      text: line.text,
      chords,
      // Solo si no entra ninguno: cuando el verso trae acordes propios, repetir
      // el anterior sería escribir dos veces lo mismo.
      sustained: chords.length ? null : (before?.label ?? null)
    });
  }

  return merged;
}

/**
 * Cuál es el acorde que suena, dado el segundo en el que va la canción.
 *
 * Devuelve `-1` antes del primero, que es un estado real: casi ninguna canción
 * empieza a sonar en el segundo cero.
 */
export function activeChordIndex(timeline: ChordEvent[], position: number): number {
  let active = -1;
  for (let index = 0; index < timeline.length; index += 1) {
    if (timeline[index].time > position) break;
    active = index;
  }
  return active;
}

/**
 * Escribe la línea de acordes que va encima del verso.
 *
 * Un cifrado son dos renglones alineados por columna, y esa alineación solo se
 * sostiene con una tipografía de ancho fijo: es la razón de que los cifrados de
 * toda la vida se vean como se ven. Aquí se construye el renglón de arriba
 * rellenando con espacios hasta la columna de cada acorde.
 *
 * Dos acordes muy juntos se separarían mal —el segundo pisaría al primero—, así
 * que el que no cabe se corre lo justo. Se pierde un poco de precisión y se gana
 * poder leerlo, que es para lo que está.
 */
export function chordLine(text: string, chords: { index: number; label: string }[]): string {
  let line = '';

  for (const chord of chords) {
    const column = Math.max(0, Math.min(chord.index, text.length));
    if (column > line.length) line += ' '.repeat(column - line.length);
    else if (line.length) line += ' ';
    line += chord.label;
  }

  return line;
}

/**
 * Los acordes distintos que usa la canción, en el orden en que aparecen.
 *
 * Acepta cualquier cosa que tenga etiqueta para que valga igual con la lista de
 * tiempos que con el cifrado escrito a mano: son las dos formas en que puede
 * llegar la misma canción.
 */
export function uniqueChords(chords: { label: string }[]): string[] {
  const seen: string[] = [];
  for (const chord of chords) {
    if (!NOT_A_CHORD.has(chord.label) && !seen.includes(chord.label)) seen.push(chord.label);
  }
  return seen;
}
