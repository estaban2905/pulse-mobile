import { apiRequest } from '../api';
import { restoreRefreshToken, setAccessToken, setRefreshToken } from './session';

/** Perfil de la cuenta, tal y como lo devuelve `/auth/me`. */
export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

/**
 * Respuesta de registro, login y refresco.
 *
 * `refreshToken` viene siempre porque el cliente HTTP manda
 * `X-Pulse-Client: native` en cada petición; en el navegador ese campo no
 * existiría y el token viajaría en una cookie.
 */
interface SessionResponse {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
  refreshToken?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  displayName?: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string | null;
}

const jsonBody = (body: unknown) => ({
  method: 'POST',
  auth: false,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

/** Guarda los dos tokens de una respuesta de sesión y devuelve el perfil. */
async function adoptSession(session: SessionResponse): Promise<AuthUser> {
  setAccessToken(session.accessToken);
  await setRefreshToken(session.refreshToken ?? null);
  return session.user;
}

async function register(input: RegisterInput): Promise<AuthUser> {
  return adoptSession(await apiRequest<SessionResponse>('/auth/register', jsonBody(input)));
}

async function login(input: LoginInput): Promise<AuthUser> {
  return adoptSession(await apiRequest<SessionResponse>('/auth/login', jsonBody(input)));
}

/**
 * Cierra la sesión en el servidor y borra las credenciales locales.
 *
 * El borrado va en `finally` a propósito: si la llamada falla por falta de red,
 * dejar los tokens puestos dejaría al usuario dentro de una sesión que él
 * acaba de decir que quería cerrar.
 */
async function logout(): Promise<void> {
  const refreshToken = await restoreRefreshToken();
  try {
    if (refreshToken) await apiRequest<void>('/auth/logout', jsonBody({ refreshToken }));
  } catch {
    // Un logout que no llega al servidor sigue siendo un logout aquí.
  } finally {
    setAccessToken(null);
    await setRefreshToken(null);
  }
}

/**
 * Recupera la sesión al arrancar la app.
 *
 * Devuelve `null` sin tocar la red cuando no hay refresh token guardado, que es
 * el caso de la primera instalación y el de quien cerró sesión.
 */
async function restoreSession(): Promise<AuthUser | null> {
  const refreshToken = await restoreRefreshToken();
  if (!refreshToken) return null;

  try {
    const session = await apiRequest<SessionResponse>('/auth/refresh', jsonBody({ refreshToken }));
    return await adoptSession(session);
  } catch {
    // El token caducó, lo revocaron, o el servidor no responde. En los tres
    // casos la app arranca sin sesión; forzar la pantalla de acceso es la
    // única respuesta honesta, porque no hay forma de saber quién es.
    setAccessToken(null);
    await setRefreshToken(null);
    return null;
  }
}

const me = (): Promise<AuthUser> => apiRequest<AuthUser>('/auth/me');

const updateProfile = (input: UpdateProfileInput): Promise<AuthUser> =>
  apiRequest<AuthUser>('/me/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });

/** Responde igual exista o no la cuenta: decir cuál delataría qué correos hay. */
const forgotPassword = (email: string): Promise<void> =>
  apiRequest<void>('/auth/forgot-password', jsonBody({ email }));

const resetPassword = (token: string, password: string): Promise<void> =>
  apiRequest<void>('/auth/reset-password', jsonBody({ token, password }));

const verifyEmail = (token: string): Promise<void> =>
  apiRequest<void>('/auth/verify-email', jsonBody({ token }));

const requestEmailVerification = (): Promise<void> =>
  apiRequest<void>('/auth/verify-email/request', { method: 'POST' });

export const authApi = {
  register,
  login,
  logout,
  restoreSession,
  me,
  updateProfile,
  forgotPassword,
  resetPassword,
  verifyEmail,
  requestEmailVerification
};
