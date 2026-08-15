/**
 * Cómo se habla con Pulse API.
 *
 * Este paquete no llama a `fetch`. Recibe una función que ya sabe hacerlo, con
 * la sesión resuelta, los reintentos por 401 y —según el cliente— la cookie o
 * el token en el cuerpo. Eso es justo lo que difiere entre un navegador y un
 * teléfono, y lo que no tenía sentido unificar.
 *
 * Lo que sí se comparte es todo lo demás: qué rutas existen, qué verbo lleva
 * cada una y qué forma tiene lo que contestan.
 */

export interface TransportOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
  /** Adjunta el token de sesión. Cierto por defecto en ambos clientes. */
  auth?: boolean;
}

/** La función que cada cliente aporta. */
export type Transport = <T>(path: string, options?: TransportOptions) => Promise<T>;

/**
 * El código HTTP de un error, si lo trae.
 *
 * Se lee por su forma y no con `instanceof`: cada cliente tiene su propia clase
 * `ApiError`, y una comprobación por identidad fallaría en cuanto el error
 * cruzara la frontera del paquete. Lo que importa aquí es si hubo un 404, no de
 * qué clase es el objeto que lo cuenta.
 */
export function statusOf(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}

/** Cierto cuando el error es una cancelación deliberada y no un fallo. */
export function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/** Cabecera obligatoria en todo cuerpo JSON, para no repetirla en cada llamada. */
export const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;
