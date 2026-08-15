import type { ApiLibrary, LibraryApi, LibraryCollection } from './libraryApi';
import type { KeyValueStore } from './storage';
import { statusOf } from './transport';

/** Lo que la biblioteca local sabe y el servidor tiene que acabar sabiendo. */
export interface LocalLibrary {
  favourites: string[];
  savedAlbums: string[];
  followedArtists: string[];
}

export interface LibrarySync {
  hasMigrated(userId: string): Promise<boolean>;
  migrate(userId: string, local: LocalLibrary, remote: ApiLibrary): Promise<void>;
}

/** Cuántas cuentas migradas se recuerdan. Sobra para un dispositivo compartido. */
const REMEMBERED_ACCOUNTS = 10;

/**
 * Sube al servidor la biblioteca que ya estaba en el dispositivo.
 *
 * `storageKey` lo pone cada cliente porque ya tenían el suyo escrito y
 * cambiarlo habría hecho que las cuentas ya migradas volvieran a migrar. No es
 * bonito, pero renombrarlo no arregla nada y rompe a quien ya lo tenía.
 */
export function createLibrarySync(
  store: KeyValueStore,
  libraryApi: LibraryApi,
  storageKey: string
): LibrarySync {
  /**
   * Cuentas cuya biblioteca local ya se subió.
   *
   * La marca es por usuario y no global: en un dispositivo compartido, que uno
   * haya migrado no puede impedir que el siguiente lo haga.
   */
  async function migratedAccounts(): Promise<string[]> {
    try {
      const raw = await store.get(storageKey);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  }

  async function rememberMigration(userId: string): Promise<void> {
    try {
      const accounts = await migratedAccounts();
      if (accounts.includes(userId)) return;
      await store.set(storageKey, JSON.stringify([...accounts, userId].slice(-REMEMBERED_ACCOUNTS)));
    } catch {
      // Sin almacenamiento la migración se repetiría en el próximo arranque, y
      // no pasa nada: subir lo que ya está es inofensivo.
    }
  }

  return {
    hasMigrated: async (userId) => (await migratedAccounts()).includes(userId),

    /**
     * Sube lo que ya estaba, una sola vez por cuenta.
     *
     * Solo añade: nunca borra del servidor lo que no esté en local. Quien entra
     * desde un dispositivo nuevo tiene ahí una biblioteca vacía, y sincronizar
     * en los dos sentidos le vaciaría la de verdad.
     */
    migrate: async (userId, local, remote) => {
      const pending: Array<Promise<boolean>> = [];

      const queue = (collection: LibraryCollection, locals: string[], remotes: string[]) => {
        const known = new Set(remotes);
        for (const id of locals) {
          if (known.has(id)) continue;
          pending.push(
            libraryApi
              .setMembership(collection, id, true)
              .then(() => true)
              // Un 404 es un identificador que ya no está en el catálogo: eso
              // no deja la migración incompleta, sencillamente no hay nada que
              // subir.
              .catch((error: unknown) => statusOf(error) === 404)
          );
        }
      };

      queue('favourites', local.favourites, remote.favourites);
      queue('albums', local.savedAlbums, remote.savedAlbums);
      queue('artists', local.followedArtists, remote.followedArtists);

      const results = await Promise.all(pending);

      // Solo se da por migrada cuando todo lo migrable llegó. Si la red falló,
      // se reintenta en el próximo arranque; darla por buena a ciegas hacía que
      // la carga siguiente sustituyera lo local por un servidor incompleto.
      if (results.every(Boolean)) await rememberMigration(userId);
    }
  };
}

/** Une lo local con lo remoto sin repetir, dejando lo más reciente delante. */
export function mergeIds(remote: string[], local: string[]): string[] {
  return Array.from(new Set([...remote, ...local]));
}
