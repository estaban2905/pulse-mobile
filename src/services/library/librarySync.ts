import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLibrarySync, type ApiLibrary, type KeyValueStore, type LocalLibrary } from '@pulse/core';
import { libraryApi } from './libraryApi';

/**
 * La clave es la que ya había.
 *
 * Renombrarla al unificar habría hecho que todas las cuentas ya migradas se
 * dieran por no migradas y volvieran a subir su biblioteca entera.
 */
const MIGRATED_KEY = 'pulse-mobile:library:migrated:v1';

/** `AsyncStorage` ya es asíncrono: aquí no hay nada que adaptar. */
const deviceStore: KeyValueStore = {
  get: (key) => AsyncStorage.getItem(key),
  set: (key, value) => AsyncStorage.setItem(key, value)
};

const sync = createLibrarySync(deviceStore, libraryApi, MIGRATED_KEY);

export const hasMigrated = (userId: string): Promise<boolean> => sync.hasMigrated(userId);

export const migrateLocalLibrary = (
  userId: string,
  local: LocalLibrary,
  remote: ApiLibrary
): Promise<void> => sync.migrate(userId, local, remote);

export { mergeIds } from '@pulse/core';
export type { LocalLibrary } from '@pulse/core';
