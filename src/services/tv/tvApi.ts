import { apiRequest } from '../api';

/**
 * Televisores vinculados a la cuenta.
 *
 * Es el camino para los televisores que no hablan Google Cast —Samsung y LG no
 * lo implementan—. Ahí la pantalla no puede recibir la canción, así que hay que
 * dársela: el teléfono informa de qué suena y el televisor lo consulta.
 *
 * Vive aquí y no en `@pulse/core` porque solo el teléfono manda: la web no
 * controla televisores, y el receptor tiene su propio cliente del otro lado.
 */

export interface TvScreen {
  id: string;
  name: string;
  /** Cierto si la pantalla dio señales en el último minuto. */
  online?: boolean;
  lastSeenAt?: string;
}

export const tvApi = {
  /** Vincula un televisor con el código que enseña en pantalla. */
  claim: (code: string): Promise<TvScreen> =>
    apiRequest<TvScreen>('/me/tv/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    }),

  list: (): Promise<TvScreen[]> => apiRequest<TvScreen[]>('/me/tv'),

  unlink: (sessionId: string): Promise<void> =>
    apiRequest<void>(`/me/tv/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }),

  /** Informa de qué suena. Sin ruido: solo en los cambios que importan. */
  report: (trackId: string, positionMs: number, isPlaying: boolean): Promise<void> =>
    apiRequest<void>('/me/now-playing', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId, positionMs: Math.max(0, Math.round(positionMs)), isPlaying })
    })
} as const;
