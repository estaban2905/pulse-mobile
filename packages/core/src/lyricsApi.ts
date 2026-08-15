import type { LyricLine } from './catalog';
import { isAbort, statusOf, type Transport } from './transport';

/**
 * Letras servidas por Pulse API.
 *
 * Ningún cliente habla con el proveedor de letras: preguntan por el
 * identificador de la pista y el servidor se encarga del resto. Por eso aquí no
 * hay nada que analice el formato LRC —eso vive en el API— y por eso este
 * archivo puede ser el mismo para los dos.
 */

export type LyricsStatus = 'synced' | 'plain' | 'instrumental' | 'missing' | 'error';

export interface LyricsResult {
  status: LyricsStatus;
  lines: LyricLine[];
  /** Quién proporcionó la letra. Ausente cuando no se pudo consultar. */
  source?: string;
}

/** Lo que responde `GET /tracks/:id/lyrics`. `error` no viaja: se deduce del 503. */
interface LyricsResponse {
  status: Exclude<LyricsStatus, 'error'>;
  source: string;
  fetchedAt: string;
  lines: LyricLine[];
}

export interface LyricsApi {
  /** Lo ya consultado en esta sesión, sin tocar la red. */
  cached(trackId: string): LyricsResult | undefined;
  fetch(trackId: string, signal?: AbortSignal): Promise<LyricsResult>;
}

export function createLyricsApi(request: Transport): LyricsApi {
  /**
   * Caché de sesión.
   *
   * El servidor ya no repite la consulta al proveedor, pero sí un viaje de red.
   * Esto evita ese viaje al reabrir la letra de la misma canción, que es
   * exactamente lo que hace quien alterna entre la letra y la portada.
   */
  const cache = new Map<string, LyricsResult>();

  return {
    cached: (trackId) => cache.get(trackId),

    fetch: async (trackId, signal) => {
      const hit = cache.get(trackId);
      if (hit) return hit;

      try {
        const response = await request<LyricsResponse>(
          `/tracks/${encodeURIComponent(trackId)}/lyrics`,
          { signal, auth: false }
        );

        const result: LyricsResult = {
          status: response.status,
          lines: response.lines,
          source: response.source
        };
        cache.set(trackId, result);
        return result;
      } catch (error) {
        if (isAbort(error)) throw error;

        // Una pista que el catálogo no reconoce no tiene letra que buscar, y
        // esa respuesta sí se puede recordar. Un 503 —el proveedor caído— no:
        // cachearlo dejaría la canción sin letra durante toda la sesión por un
        // fallo pasajero.
        if (statusOf(error) === 404) {
          const result: LyricsResult = { status: 'missing', lines: [] };
          cache.set(trackId, result);
          return result;
        }

        return { status: 'error', lines: [] };
      }
    }
  };
}
