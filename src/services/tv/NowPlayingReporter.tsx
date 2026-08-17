import { useEffect, useRef, useState } from 'react';
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

  /** Cierto cuando hay un televisor encendido y el sonido debe salir por él. */
  const [enTv, setEnTv] = useState(false);
  /** El volumen que el usuario eligió, para devolvérselo al desconectar la TV. */
  const volumenPropio = useRef(player.volume || 0.8);
  if (!enTv && player.volume > 0) volumenPropio.current = player.volume;

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

  /**
   * Con un televisor encendido, el sonido sale por él y no por el teléfono.
   *
   * Sin esto se oye dos veces y desfasado, que es peor que no tener televisor.
   * Se baja el volumen en vez de pausar a propósito: el teléfono sigue siendo el
   * reloj —lleva la posición y decide cuándo cambia la canción—, y pausarlo
   * dejaría a la pantalla sin nadie que le diga por dónde va.
   */
  useEffect(() => {
    if (!signedIn) return;

    let cancelado = false;
    const revisar = async () => {
      try {
        const pantallas = await tvApi.list();
        if (!cancelado) setEnTv(pantallas.some((p) => p.online));
      } catch {
        // Sin respuesta se asume que no hay televisor: es preferible oír el
        // teléfono a quedarse en silencio por un fallo de red.
        if (!cancelado) setEnTv(false);
      }
    };

    void revisar();
    const timer = setInterval(() => void revisar(), 15_000);
    return () => {
      cancelado = true;
      clearInterval(timer);
    };
  }, [signedIn]);

  useEffect(() => {
    player.setVolume(enTv ? 0 : volumenPropio.current);
    // `player.volume` queda fuera: al silenciar cambiaría y volvería a
    // dispararse este efecto, guardando el cero como «volumen propio».
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enTv]);

  /**
   * Obedece al mando del televisor.
   *
   * Solo se pregunta mientras hay una pantalla encendida: sin televisor esto
   * sería una petición cada dos segundos para nada, y el teléfono lo pagaría en
   * batería.
   *
   * Quien reproduce sigue siendo el teléfono. El televisor no toca la cola ni
   * decide nada; solo pide, y aquí se traduce a las mismas acciones que si el
   * usuario hubiera pulsado en la pantalla.
   */
  const mandoRef = useRef(player);
  mandoRef.current = player;

  useEffect(() => {
    if (!signedIn || !enTv) return;

    let cancelado = false;
    const recoger = async () => {
      let ordenes: Awaited<ReturnType<typeof tvApi.commands>>;
      try {
        ordenes = await tvApi.commands();
      } catch {
        return;
      }
      if (cancelado) return;

      const p = mandoRef.current;
      for (const { action, value } of ordenes) {
        if (action === 'play' && !p.isPlaying) p.toggle();
        else if (action === 'pause' && p.isPlaying) p.toggle();
        else if (action === 'next') p.next();
        else if (action === 'previous') p.previous();
        else if (action === 'seek' && value !== null) p.seek(value);
        else if (action === 'shuffle') p.toggleShuffle();
        else if (action === 'repeat') p.cycleRepeat();
        // `volume` no se aplica aquí: con televisor el teléfono está en silencio
        // a propósito, y el volumen que importa es el del televisor.
      }
    };

    const timer = setInterval(() => void recoger(), 2_000);
    return () => {
      cancelado = true;
      clearInterval(timer);
    };
  }, [signedIn, enTv]);

  return null;
}
