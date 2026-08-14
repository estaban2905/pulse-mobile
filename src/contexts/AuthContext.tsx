import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  authApi,
  type AuthUser,
  type LoginInput,
  type RegisterInput,
  type UpdateProfileInput
} from '../services/auth/authApi';
import { isSecureStorageAvailable, subscribeSessionEnded } from '../services/auth/session';

/**
 * `checking` es el estado del primer instante, mientras se intenta recuperar la
 * sesión con el refresh token guardado. Distinguirlo de `anonymous` evita el
 * parpadeo de mandar a la pantalla de acceso a quien sí tenía sesión.
 */
export type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

interface AuthValue {
  status: AuthStatus;
  user: AuthUser | null;
  isAdmin: boolean;
  /** Falso si el dispositivo no ofrece almacén seguro: la sesión no persistirá. */
  canPersistSession: boolean;
  signIn: (input: LoginInput) => Promise<AuthUser>;
  signUp: (input: RegisterInput) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<AuthUser>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [canPersistSession, setCanPersistSession] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void authApi.restoreSession().then((restored) => {
      if (cancelled) return;
      setUser(restored);
      setStatus(restored ? 'authenticated' : 'anonymous');
      // Solo se sabe después de intentar leer el almacén, así que se consulta
      // aquí y no antes.
      setCanPersistSession(isSecureStorageAvailable());
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // El servidor puede dar por terminada la sesión sin que nadie pulse nada
  // —refresh caducado o revocado—, y la interfaz tiene que enterarse.
  useEffect(
    () =>
      subscribeSessionEnded(() => {
        setUser(null);
        setStatus('anonymous');
      }),
    []
  );

  const signIn = useCallback(async (input: LoginInput) => {
    const signedIn = await authApi.login(input);
    setUser(signedIn);
    setStatus('authenticated');
    setCanPersistSession(isSecureStorageAvailable());
    return signedIn;
  }, []);

  const signUp = useCallback(async (input: RegisterInput) => {
    const created = await authApi.register(input);
    setUser(created);
    setStatus('authenticated');
    setCanPersistSession(isSecureStorageAvailable());
    return created;
  }, []);

  const signOut = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const updateProfile = useCallback(async (input: UpdateProfileInput) => {
    const updated = await authApi.updateProfile(input);
    setUser(updated);
    return updated;
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user,
      isAdmin: user?.role === 'ADMIN',
      canPersistSession,
      signIn,
      signUp,
      signOut,
      updateProfile
    }),
    [status, user, canPersistSession, signIn, signUp, signOut, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return value;
}
