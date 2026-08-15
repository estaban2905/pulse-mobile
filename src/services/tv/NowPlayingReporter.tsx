import { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePlayer } from '../../contexts/PlayerContext';
import { tvApi } from './tvApi';

/**
 * Le cuenta al servidor qué está sonando, para que un televisor pueda pintarlo.
 *
 * No dibuja nada: es un componente solo para poder usar los contextos del
 * reproductor y de la sesión. Va dentro de `PlayerProvider`.
 *
 * Informa en los cambios que importan —canción, play/pausa, salto— y no en cada
 * segundo. El servidor guarda el momento del aviso y la pantalla extrapola el
 * resto, así que enviar cuatro veces por segundo solo gastaría batería y datos
 * para decir lo que la TV ya sabe calcular.
 */

/** Un salto de más de tres segundos es alguien moviendo la barra, no el avance normal. */
const SEEK_THRESHOLD_S = 3;

/** Recordatorio lento: corrige la deriva si algún aviso se perdió por el camino. */
const HEARTBEAT_MS = 30_000;

export function NowPlayingReporter() {
  const { status } = useAuth();
  const player = usePlayer();

  const signedIn = status === 'authenticated';
  const trackId = player.current?.id ?? null;
  const { isPlaying, position } = player;

  // El último informe enviado, para no repetirlo ni detectar saltos falsos.
  const sent = useRef({ trackId: '', isPlaying: false, position: 0 });

  const report = useRef((id: string, seconds: number, playing: boolean) => {
    sent.current = { trackId: id, isPlaying: playing, position: seconds };
    // Sin `await` y tragándose el error a propósito: que el televisor se quede
    // un momento desactualizado no puede romper la reproducción del teléfono.
    void tvApi.report(id, seconds * 1000, playing).catch(() => undefined);
  });

  // Cambio de canción o de estado de reproducción: se informa siempre.
  useEffect(() => {
    if (!signedIn || !trackId) return;
    report.current(trackId, position, isPlaying);
    // `position` queda fuera a propósito: si entrara, esto se dispararía cuatro
    // veces por segundo, que es justo lo que se quiere evitar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, trackId, isPlaying]);

  // Saltos en la barra de progreso.
  useEffect(() => {
    if (!signedIn || !trackId) return;
    if (Math.abs(position - sent.current.position) < SEEK_THRESHOLD_S) return;
    // Solo cuenta como salto si la canción no cambió: al cambiar, el efecto de
    // arriba ya informó y la posición vuelve a cero por sí sola.
    if (sent.current.trackId !== trackId) return;
    report.current(trackId, position, isPlaying);
  }, [signedIn, trackId, position, isPlaying]);

  // Latido lento mientras suena.
  useEffect(() => {
    if (!signedIn || !trackId || !isPlaying) return;
    const timer = setInterval(() => {
      report.current(trackId, player.position, true);
    }, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [signedIn, trackId, isPlaying, player]);

  return null;
}
