import { parseChord } from './chords';

/**
 * Cómo se digita cada acorde en una guitarra en afinación estándar.
 *
 * Aquí no se inventa nada: o la postura es una de las conocidas, o se construye
 * moviendo una de las dos formas con cejilla, o no se devuelve ninguna. Un
 * diagrama equivocado es peor que ningún diagrama —quien lo lee no tiene forma
 * de saber que está mal hasta que suena—, así que ante la duda se calla.
 */

/** Cuántos trastes enseña el diagrama. */
export const FRETS_SHOWN = 5;

/** Las seis cuerdas al aire, de la 6.ª a la 1.ª, como semitonos. */
const OPEN_STRINGS = [4, 9, 2, 7, 11, 4];

/**
 * Hasta dónde se acepta subir una cejilla.
 *
 * Con las dos formas disponibles nunca hace falta pasar del sexto traste, así
 * que este tope no estorba a casi nada. Solo muerde en las familias que tienen
 * una sola forma —`sus2`—, donde cuatro fundamentales caerían por el traste
 * once: ahí arriba la postura es correcta sobre el papel e impracticable en la
 * mano, y quien la vea dibujada creerá que así se toca.
 */
const MAX_BARRE_FRET = 7;

export interface ChordShape {
  /**
   * Traste pisado en cada cuerda, de la 6.ª (la más grave) a la 1.ª.
   * `-1` es cuerda muda y `0` es cuerda al aire.
   */
  frets: number[];
  /** La cejilla, con las cuerdas que abarca por índice. Nula si no la lleva. */
  barre: { fret: number; from: number; to: number } | null;
  /**
   * Primer traste que dibuja el diagrama. Vale 1 en las posturas de abajo del
   * mástil; más arriba, el diagrama se desplaza y hay que decir por dónde va.
   */
  baseFret: number;
}

/** Las familias que se saben digitar. Lo que no esté aquí no lleva diagrama. */
type Family = 'major' | 'minor' | 'dom7' | 'min7' | 'maj7' | 'sus4' | 'sus2';

const mod12 = (value: number): number => ((value % 12) + 12) % 12;

/**
 * Las posturas al aire, por semitono de la fundamental y familia.
 *
 * Son las que todo el mundo toca, y ninguna sale de mover una cejilla: si el
 * cálculo las produjera igualmente, saldrían más arriba del mástil y más
 * difíciles. Por eso se buscan primero.
 */
const OPEN: Record<string, number[]> = {
  // Mayores
  '0|major': [-1, 3, 2, 0, 1, 0],
  '2|major': [-1, -1, 0, 2, 3, 2],
  '4|major': [0, 2, 2, 1, 0, 0],
  '7|major': [3, 2, 0, 0, 0, 3],
  '9|major': [-1, 0, 2, 2, 2, 0],
  // Menores
  '2|minor': [-1, -1, 0, 2, 3, 1],
  '4|minor': [0, 2, 2, 0, 0, 0],
  '9|minor': [-1, 0, 2, 2, 1, 0],
  // Séptimas de dominante
  '0|dom7': [-1, 3, 2, 3, 1, 0],
  '2|dom7': [-1, -1, 0, 2, 1, 2],
  '4|dom7': [0, 2, 0, 1, 0, 0],
  '7|dom7': [3, 2, 0, 0, 0, 1],
  '9|dom7': [-1, 0, 2, 0, 2, 0],
  '11|dom7': [-1, 2, 1, 2, 0, 2],
  // Séptimas menores
  '2|min7': [-1, -1, 0, 2, 1, 1],
  '4|min7': [0, 2, 0, 0, 0, 0],
  '9|min7': [-1, 0, 2, 0, 1, 0],
  // Séptimas mayores
  '0|maj7': [-1, 3, 2, 0, 0, 0],
  '2|maj7': [-1, -1, 0, 2, 2, 2],
  '4|maj7': [0, 2, 1, 1, 0, 0],
  '5|maj7': [-1, -1, 3, 2, 1, 0],
  '7|maj7': [3, 2, 0, 0, 0, 2],
  '9|maj7': [-1, 0, 2, 1, 2, 0],
  // Suspendidas
  '2|sus4': [-1, -1, 0, 2, 3, 3],
  '4|sus4': [0, 2, 2, 2, 0, 0],
  '9|sus4': [-1, 0, 2, 2, 3, 0],
  '2|sus2': [-1, -1, 0, 2, 3, 0],
  '9|sus2': [-1, 0, 2, 2, 0, 0]
};

/**
 * Las dos formas que se mueven por el mástil, en su posición de partida.
 *
 * La de mi tiene la fundamental en la sexta cuerda y la de la en la quinta:
 * subirlas un traste sube el acorde un semitono, y con eso se cubren las doce
 * tonalidades con dos posturas. Es exactamente lo que hace un guitarrista
 * cuando le piden un fa.
 */
const MOVABLE: Record<Family, { e: number[] | null; a: number[] | null }> = {
  major: { e: [0, 2, 2, 1, 0, 0], a: [-1, 0, 2, 2, 2, 0] },
  minor: { e: [0, 2, 2, 0, 0, 0], a: [-1, 0, 2, 2, 1, 0] },
  dom7: { e: [0, 2, 0, 1, 0, 0], a: [-1, 0, 2, 0, 2, 0] },
  min7: { e: [0, 2, 0, 0, 0, 0], a: [-1, 0, 2, 0, 1, 0] },
  maj7: { e: [0, 2, 1, 1, 0, 0], a: [-1, 0, 2, 1, 2, 0] },
  sus4: { e: [0, 2, 2, 2, 0, 0], a: [-1, 0, 2, 2, 3, 0] },
  // La forma de mi para sus2 exige una apertura que no hace nadie.
  sus2: { e: null, a: [-1, 0, 2, 2, 0, 0] }
};

/** Cómo se escribe cada familia en un cifrado real. */
function familyOf(quality: string): Family | null {
  switch (quality.trim()) {
    case '':
    case 'maj':
    case 'M':
      return 'major';
    case 'm':
    case 'min':
    case '-':
      return 'minor';
    case '7':
      return 'dom7';
    case 'm7':
    case 'min7':
    case '-7':
      return 'min7';
    case 'maj7':
    case 'M7':
      return 'maj7';
    case 'sus':
    case 'sus4':
      return 'sus4';
    case 'sus2':
      return 'sus2';
    default:
      return null;
  }
}

/** Dónde empieza a dibujarse el diagrama. */
function windowOf(frets: number[]): number {
  const pressed = frets.filter((fret) => fret > 0);
  if (!pressed.length) return 1;

  const highest = Math.max(...pressed);
  // Mientras quepa desde el principio se dibuja desde el principio: es donde el
  // ojo espera la cejuela, y desplazar el diagrama sin necesidad confunde.
  return highest <= FRETS_SHOWN ? 1 : Math.min(...pressed);
}

/**
 * La postura de un acorde, o `null` si no se sabe digitarlo con garantías.
 *
 * Los acordes con bajo distinto —`C/G`— devuelven `null` a propósito. Se digitan
 * de formas que dependen de lo que venga antes y después, y enseñar la postura
 * del acorde a secas escondería justamente lo que el cifrado pedía: esa nota
 * grave, que es toda la razón de que alguien escribiera la barra.
 */
export function guitarShape(label: string): ChordShape | null {
  const parsed = parseChord(label);
  if (!parsed || parsed.bass) return null;

  const family = familyOf(parsed.quality);
  if (!family) return null;

  const open = OPEN[`${parsed.pitch}|${family}`];
  if (open) return { frets: open, barre: null, baseFret: windowOf(open) };

  const shapes = MOVABLE[family];
  const candidates: { base: number[]; fret: number; from: number }[] = [];

  // Un traste 0 sería la postura al aire, que ya se ha buscado arriba.
  if (shapes.e) {
    const fret = mod12(parsed.pitch - OPEN_STRINGS[0]);
    if (fret >= 1) candidates.push({ base: shapes.e, fret, from: 0 });
  }
  if (shapes.a) {
    const fret = mod12(parsed.pitch - OPEN_STRINGS[1]);
    if (fret >= 1) candidates.push({ base: shapes.a, fret, from: 1 });
  }
  // La más cómoda es la que cae más abajo: menos estirar y más volumen.
  const [best] = candidates.sort((left, right) => left.fret - right.fret);
  if (!best || best.fret > MAX_BARRE_FRET) return null;

  const frets = best.base.map((fret) => (fret < 0 ? -1 : fret + best.fret));

  return {
    frets,
    barre: { fret: best.fret, from: best.from, to: 5 },
    baseFret: windowOf(frets)
  };
}

/**
 * Las notas que suenan en una postura, para poder comprobarla.
 *
 * No la usa la interfaz: existe para que una postura mal copiada se pueda
 * detectar comparando lo que suena con lo que el acorde dice ser, en lugar de
 * fiarse de que los números estén bien escritos.
 */
export function shapePitches(shape: ChordShape): number[] {
  const pitches = shape.frets
    .map((fret, string) => (fret < 0 ? null : mod12(OPEN_STRINGS[string] + fret)))
    .filter((pitch): pitch is number => pitch !== null);

  return [...new Set(pitches)].sort((a, b) => a - b);
}
