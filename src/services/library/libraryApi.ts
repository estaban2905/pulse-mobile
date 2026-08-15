import { createLibraryApi } from '@pulse/core';
import { apiRequest } from '../api';

/**
 * El cliente de biblioteca, montado sobre el transporte de la app.
 *
 * Las rutas y las formas viven en `@pulse/core`; lo único que pone la app es
 * cómo se hace la petición, que es lo que de verdad la distingue del navegador:
 * aquí no hay cookies, así que el refresh token llega en el cuerpo y se guarda
 * en el almacén seguro del teléfono. Todo eso ya está en `apiRequest`.
 */
export const libraryApi = createLibraryApi(apiRequest);

export type {
  ApiHistoryEntry,
  ApiLibrary,
  ApiPreferences,
  LibraryCollection
} from '@pulse/core';
