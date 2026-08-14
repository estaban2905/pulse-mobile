import type { Catalog } from '../types/api';
import {
  getAccessToken,
  getRefreshToken,
  notifySessionEnded,
  setAccessToken,
  setRefreshToken
} from './auth/session';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/v1').replace(/\/$/, '');

/**
 * Declara que este cliente no tiene cookies.
 *
 * Con esta cabecera el API devuelve el refresh token en el cuerpo en lugar de
 * plantarlo en una cookie `httpOnly`, que es lo único que un navegador sabe
 * hacer y lo que aquí no serviría de nada.
 */
const CLIENT_HEADER = { 'X-Pulse-Client': 'native' } as const;

/** Error con el código HTTP a la vista, para poder distinguir 401 de 403. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  /** Adjunta el access token. Cierto por defecto. */
  auth?: boolean;
}

const messageFromPayload = (payload: unknown, fallback: string): string => {
  if (typeof payload === 'string' && payload.trim()) return payload.trim();
  if (!payload || typeof payload !== 'object') return fallback;

  const candidate =
    (payload as { message?: unknown; error?: unknown }).message ?? (payload as { error?: unknown }).error;
  if (Array.isArray(candidate)) {
    const messages = candidate.filter((item): item is string => typeof item === 'string');
    if (messages.length) return messages.join('. ');
  }
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : fallback;
};

const readPayload = async (response: Response): Promise<unknown> => {
  if (response.status === 204) return undefined;

  const text = await response.text();
  if (!text.trim()) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

async function send(path: string, options: ApiRequestOptions): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...CLIENT_HEADER,
    ...options.headers
  };

  const token = getAccessToken();
  if (options.auth !== false && token) headers.Authorization = `Bearer ${token}`;

  try {
    return await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch (error) {
    // Un `AbortSignal` disparado no es un fallo de red y quien abortó ya sabe
    // por qué: se propaga tal cual para no disfrazarlo de servidor caído.
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'No se pudo conectar con Pulse. Comprueba tu conexión.');
  }
}

/**
 * Renovación en curso, compartida por todas las peticiones.
 *
 * Sin esta cola, tres llamadas que caducan a la vez dispararían tres refrescos
 * simultáneos; como el servidor rota el token en cada canje y trata el segundo
 * uso como robo, eso cerraría la sesión entera. Aquí solo sale un canje y las
 * demás esperan su resultado.
 */
let refreshInFlight: Promise<string | null> | null = null;

async function requestRefresh(): Promise<string | null> {
  const current = getRefreshToken();
  // Sin token guardado no hay nada que canjear, y preguntárselo al servidor
  // solo serviría para gastar una petición y recibir el 401 que ya se sabe.
  if (!current) {
    notifySessionEnded();
    return null;
  }

  const response = await send('/auth/refresh', {
    method: 'POST',
    auth: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: current })
  }).catch(() => null);

  if (!response?.ok) {
    notifySessionEnded();
    return null;
  }

  const payload = (await readPayload(response)) as
    | { accessToken?: string; refreshToken?: string }
    | undefined;

  const token = payload?.accessToken ?? null;
  setAccessToken(token);
  // El canje rota el refresh: guardar el nuevo es obligatorio, porque el que
  // acabamos de usar ya está anulado en el servidor.
  await setRefreshToken(payload?.refreshToken ?? null);

  if (!token) notifySessionEnded();
  return token;
}

export function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= requestRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/**
 * Petición al API con la sesión ya resuelta.
 *
 * Un 401 se trata como "el access token caducó": se renueva y se reintenta una
 * sola vez. Un segundo 401 significa que el problema no era el token, así que
 * se propaga en lugar de entrar en un bucle de refrescos.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  let response = await send(path, options);

  const canRetry = options.auth !== false && !path.startsWith('/auth/');
  if (response.status === 401 && canRetry) {
    const token = await refreshAccessToken();
    if (token) response = await send(path, options);
  }

  const payload = await readPayload(response);
  if (!response.ok) {
    throw new ApiError(response.status, messageFromPayload(payload, `Pulse respondió ${response.status}`));
  }

  return payload as T;
}

export function getCatalog(signal?: AbortSignal): Promise<Catalog> {
  return apiRequest<Catalog>('/catalog', { signal, auth: false });
}

export function getHealth(signal?: AbortSignal): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/health', { signal, auth: false });
}
