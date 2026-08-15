/**
 * Almacenamiento clave-valor, el mínimo que necesita este paquete.
 *
 * La interfaz es asíncrona aunque `localStorage` no lo sea. Al revés no
 * funcionaba: `AsyncStorage` no se puede leer de forma síncrona, así que una
 * interfaz síncrona habría dejado fuera a la app móvil. Envolver algo síncrono
 * en una promesa es gratis; lo contrario es imposible.
 */
export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

/**
 * Almacén que no guarda nada.
 *
 * Sirve cuando el entorno no tiene dónde escribir —un navegador con el
 * almacenamiento bloqueado, o una prueba—. Que no persista no rompe nada:
 * lo peor que pasa es que la migración de la biblioteca se reintente.
 */
export const memoryStore: KeyValueStore = (() => {
  const values = new Map<string, string>();
  return {
    get: async (key) => values.get(key) ?? null,
    set: async (key, value) => {
      values.set(key, value);
    }
  };
})();
