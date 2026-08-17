import { isAbort, statusOf, type Transport } from './transport';

/**
 * Acordes servidos por Pulse API.
 *
 * Igual que las letras, los clientes preguntan por el identificador de la pista
 * y no saben de dónde salen los acordes. La diferencia está en el otro lado: la
 * letra la tiene un proveedor y los acordes se calculan a partir del audio o los
 * escribe una persona. Aquí eso no se nota, y es justo lo que se pretendía.
 */

export type ChordsStatus = 'timed' | 'sheet' | 'missing' | 'error';

/** Un acorde con marca de tiempo: lo que permite seguirlos mientras suena. */
export interface ChordEvent {
  /** Segundos desde el principio de la pista. */
  time: number;
  label: string;
}

/** Dónde entra un acorde dentro del verso, en caracteres. */
export interface ChordPlacement {
  index: number;
  label: string;
}

/** Un verso del cifrado, ya separado de sus acordes. */
export interface ChordSheetLine {
  /** La sección a la que pertenece (`Estribillo`), o nulo fuera de toda sección. */
  section: string | null;
  /** Vacío en las líneas de solo acordes y en las que separan estrofas. */
  text: string;
  chords: ChordPlacement[];
}

export interface ChordsResult {
  status: ChordsStatus;
  /**
   * Las dos representaciones llegan juntas y no se excluyen: una pista puede
   * traer el cifrado bueno y además los tiempos con los que seguirlo. Que
   * `timeline` esté lleno no dice nada sobre `sheet`, ni al revés.
   */
  timeline: ChordEvent[];
  sheet: ChordSheetLine[];
  /** Tonalidad, para poder decir desde dónde se transpone. */
  musicKey?: string | null;
  bpm?: number | null;
  /**
   * Lo seguro que está el análisis, de 0 a 1. Ausente en lo escrito a mano.
   * Es lo que permite avisar de que unos acordes no los ha revisado nadie.
   */
  confidence?: number | null;
  /** Quién los produjo. Ausente cuando no se pudo consultar. */
  source?: string;
}

/** Lo que responde `GET /tracks/:id/chords`. `error` no viaja: se deduce del fallo. */
interface ChordsResponse {
  status: Exclude<ChordsStatus, 'error'>;
  source: string;
  updatedAt: string;
  musicKey: string | null;
  bpm: number | null;
  confidence: number | null;
  timeline: ChordEvent[];
  sheet: ChordSheetLine[];
}

export interface ChordsApi {
  /** Lo ya consultado en esta sesión, sin tocar la red. */
  cached(trackId: string): ChordsResult | undefined;
  fetch(trackId: string, signal?: AbortSignal): Promise<ChordsResult>;
}

const empty = (status: ChordsStatus): ChordsResult => ({ status, timeline: [], sheet: [] });

export function createChordsApi(request: Transport): ChordsApi {
  /**
   * Caché de sesión, por lo mismo que en las letras: alternar entre la portada
   * y los acordes de la misma canción no debería costar un viaje de red cada
   * vez. Un cifrado corregido desde administración tarda en verse lo que dure la
   * sesión, y ese es un precio menor comparado con el de recargarlo todo.
   */
  const cache = new Map<string, ChordsResult>();

  return {
    cached: (trackId) => cache.get(trackId),

    fetch: async (trackId, signal) => {
      const hit = cache.get(trackId);
      if (hit) return hit;

      try {
        const response = await request<ChordsResponse>(
          `/tracks/${encodeURIComponent(trackId)}/chords`,
          { signal, auth: false }
        );

        const result: ChordsResult = {
          status: response.status,
          timeline: response.timeline,
          sheet: response.sheet,
          musicKey: response.musicKey,
          bpm: response.bpm,
          confidence: response.confidence,
          source: response.source
        };
        cache.set(trackId, result);
        return result;
      } catch (error) {
        if (isAbort(error)) throw error;

        // Igual que con la letra: una pista que el catálogo no reconoce no tiene
        // acordes que buscar y esa respuesta se puede recordar. Un fallo del
        // servidor no, porque dejaría la canción sin acordes durante toda la
        // sesión por algo pasajero.
        if (statusOf(error) === 404) {
          const result = empty('missing');
          cache.set(trackId, result);
          return result;
        }

        return empty('error');
      }
    }
  };
}
