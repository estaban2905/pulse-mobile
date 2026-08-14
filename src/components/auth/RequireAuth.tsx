import { useRouter } from 'expo-router';
import React from 'react';
// Se importa de los módulos y no del barril `components/index`: ese arrastra el
// mini reproductor y, con él, media aplicación en una pantalla que solo dibuja
// un cartel.
import { Screen } from '../ui/Screen';
import { EmptyState, LoadingState } from '../ui/StateView';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Puerta de las pantallas que necesitan cuenta.
 *
 * No redirige: enseña en el mismo sitio por qué está vacío y ofrece entrar. En
 * una barra de pestañas, saltar a otra pantalla al tocar una pestaña deja la
 * pestaña marcada y el contenido en otro lado, que desconcierta más de lo que
 * ayuda. El catálogo sigue siendo navegable sin cuenta, igual que en la web.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  // Mientras no se sabe si el refresh token guardado sirve, no se decide nada:
  // pedir cuenta antes de comprobarlo es echar fuera a quien sí la tiene.
  if (status === 'checking') {
    return (
      <Screen scroll={false}>
        <LoadingState label="Comprobando la sesión…" />
      </Screen>
    );
  }

  if (status === 'anonymous') {
    return (
      <Screen scroll={false}>
        <EmptyState
          icon="person-circle-outline"
          title="Necesitas una cuenta"
          description="Con tu cuenta, los favoritos, las playlists y el historial te acompañan a cualquier dispositivo."
          actionLabel="Iniciar sesión"
          onAction={() => router.push('/login')}
        />
      </Screen>
    );
  }

  return <>{children}</>;
}
