import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { CatalogProvider } from '../contexts/CatalogContext';
import { CastProvider } from '../contexts/CastContext';
import { LibraryProvider } from '../contexts/LibraryContext';
import { PlayerProvider } from '../contexts/PlayerContext';
import { SettingsProvider } from '../contexts/SettingsContext';
import { NowPlayingReporter } from '../services/tv/NowPlayingReporter';

/**
 * `AuthProvider` va el primero porque es de quien dependerán los demás: la
 * biblioteca necesita saber de quién es antes de decidir si se sincroniza con
 * el servidor o se queda en el teléfono.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CatalogProvider>
        <SettingsProvider>
          <LibraryProvider>
            <CastProvider>
              <PlayerProvider>
                {/* No dibuja nada: informa al servidor de qué suena, para que
                    un televisor sin Google Cast pueda pintarlo. */}
                <NowPlayingReporter />
                {children}
              </PlayerProvider>
            </CastProvider>
          </LibraryProvider>
        </SettingsProvider>
      </CatalogProvider>
    </AuthProvider>
  );
}
