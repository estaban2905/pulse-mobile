import AsyncStorage from '@react-native-async-storage/async-storage';
import { libraryApi, type ApiLibrary, type LibraryCollection } from './libraryApi';

/** Lo que la biblioteca del teléfono sabe y el servidor tiene que acabar sabiendo. */
export interface LocalLibrary {
  favourites: string[];
  savedAlbums: string[];
  followedArtists: string[];
}

const MIGRATED_KEY = 'pulse-mobile:library:migrated:v1';

/**
 * Cuentas cuya biblioteca local ya se subió.
 *
 * La marca es por usuario y no global: en un teléfono compartido, que uno haya
 * migrado no puede impedir que el siguiente lo haga.
 */
async function migratedAccounts(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(MIGRATED_KEY);
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
    await AsyncStorage.setItem(MIGRATED_KEY, JSON.stringify([...accounts, userId].slice(-10)));
  } catch {
    // Sin almacenamiento la migración se repetiría en el próximo arranque, y no
    // pasa nada: subir lo que ya está es inofensivo.
  }
}

export async function hasMigrated(userId: string): Promise<boolean> {
  return (await migratedAccounts()).includes(userId);
}

/**
 * Sube lo que ya estaba en el teléfono, una sola vez por cuenta.
 *
 * Solo añade: nunca borra del servidor lo que no esté en local. Quien entra
 * desde un dispositivo nuevo tiene ahí una biblioteca vacía, y sincronizar en
 * los dos sentidos le vaciaría la de verdad.
 *
 * Los fallos por elemento se ignoran a propósito —una pista que ya no está en
 * el catálogo devuelve 404— para que un identificador viejo no impida migrar
 * todo lo demás.
 */
export async function migrateLocalLibrary(
  userId: string,
  local: LocalLibrary,
  remote: ApiLibrary
): Promise<void> {
  const pending: Array<Promise<boolean>> = [];

  const queue = (collection: LibraryCollection, locals: string[], remotes: string[]) => {
    const known = new Set(remotes);
    for (const id of locals) {
      if (known.has(id)) continue;
      pending.push(
        libraryApi
          .setMembership(collection, id, true)
          .then(() => true)
          // Un 404 es un identificador que ya no está en el catálogo: eso no
          // deja la migración incompleta, sencillamente no hay nada que subir.
          .catch((error: unknown) => (error as { status?: number })?.status === 404)
      );
    }
  };

  queue('favourites', local.favourites, remote.favourites);
  queue('albums', local.savedAlbums, remote.savedAlbums);
  queue('artists', local.followedArtists, remote.followedArtists);

  const results = await Promise.all(pending);

  // Solo se da por migrada cuando todo lo migrable llegó. Si la red falló, se
  // reintenta en el próximo arranque; darla por buena a ciegas hacía que la
  // carga siguiente sustituyera lo local por un servidor incompleto.
  if (results.every(Boolean)) await rememberMigration(userId);
}

/** Une lo local con lo remoto sin repetir, dejando lo más reciente delante. */
export function mergeIds(remote: string[], local: string[]): string[] {
  return Array.from(new Set([...remote, ...local]));
}
