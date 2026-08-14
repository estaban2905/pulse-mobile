import * as SecureStore from 'expo-secure-store';

/**
 * Credenciales de la sesión.
 *
 * Los dos tokens se guardan en sitios distintos porque valen cosas distintas.
 * El de acceso dura quince minutos y vive solo en memoria: perderlo al cerrar
 * la app no cuesta nada, porque el de refresco lo reemplaza al arrancar. El de
 * refresco dura treinta días, así que sí tiene que sobrevivir, y por eso va al
 * almacén del sistema —Keychain en iOS, Keystore en Android— y no a
 * `AsyncStorage`, que es un archivo de texto plano legible en un dispositivo
 * con root.
 */

const REFRESH_KEY = 'pulse.refreshToken';

let accessToken: string | null = null;
let refreshToken: string | null = null;

/** Evita releer el almacén seguro en cada arranque de una pantalla. */
let restored = false;

/**
 * Cierto cuando el almacén seguro no está disponible en este dispositivo.
 *
 * Entonces el refresh token se queda en memoria y la sesión no sobrevive a un
 * cierre de la app. Es peor experiencia, pero la alternativa —dejarlo en claro
 * en `AsyncStorage`— sería rebajar en silencio la seguridad de un credencial de
 * treinta días, y quien lo sufriera no tendría forma de enterarse.
 */
let secureStorageAvailable = true;

export type SessionEndedListener = () => void;

const sessionEndedListeners = new Set<SessionEndedListener>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export function isSecureStorageAvailable(): boolean {
  return secureStorageAvailable;
}

/**
 * Recupera el refresh token guardado. Idempotente: solo toca el disco la
 * primera vez, y las siguientes devuelve lo que ya tiene en memoria.
 */
export async function restoreRefreshToken(): Promise<string | null> {
  if (restored) return refreshToken;
  restored = true;

  try {
    refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    // Un almacén que no lee tampoco va a escribir: se anota para no prometer
    // una sesión persistente que no se va a cumplir.
    secureStorageAvailable = false;
    refreshToken = null;
  }

  return refreshToken;
}

/**
 * Guarda —o borra— el refresh token rotado.
 *
 * Cada canje devuelve uno nuevo y anula el anterior, así que escribir aquí no
 * es opcional: quedarse con el viejo significa que el próximo refresco lo
 * presentaría ya usado, y el servidor trata eso como robo y cierra todas las
 * sesiones de la cuenta.
 */
export async function setRefreshToken(token: string | null): Promise<void> {
  refreshToken = token;
  restored = true;

  try {
    if (token) await SecureStore.setItemAsync(REFRESH_KEY, token);
    else await SecureStore.deleteItemAsync(REFRESH_KEY);
  } catch {
    secureStorageAvailable = false;
  }
}

/**
 * Avisa de que la sesión se acabó por decisión del servidor.
 *
 * Lo dispara el cliente HTTP cuando un refresco falla, no el usuario al cerrar
 * sesión: es la señal de que el refresh token caducó o quedó revocado, y la
 * interfaz tiene que reaccionar aunque nadie haya pulsado nada.
 */
export function notifySessionEnded(): void {
  accessToken = null;
  // El token guardado ya no sirve para nada, y dejarlo puesto haría que el
  // siguiente arranque intentara una sesión que el servidor ya rechazó.
  void setRefreshToken(null);
  sessionEndedListeners.forEach((listener) => listener());
}

export function subscribeSessionEnded(listener: SessionEndedListener): () => void {
  sessionEndedListeners.add(listener);
  return () => {
    sessionEndedListeners.delete(listener);
  };
}
