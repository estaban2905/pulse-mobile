import React from 'react';
import { CatalogProvider } from '../contexts/CatalogContext';
import { CastProvider } from '../contexts/CastContext';
import { LibraryProvider } from '../contexts/LibraryContext';
import { PlayerProvider } from '../contexts/PlayerContext';
import { SettingsProvider } from '../contexts/SettingsContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <CatalogProvider>
      <SettingsProvider>
        <LibraryProvider>
          <CastProvider>
            <PlayerProvider>{children}</PlayerProvider>
          </CastProvider>
        </LibraryProvider>
      </SettingsProvider>
    </CatalogProvider>
  );
}
