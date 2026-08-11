import React from 'react';
import { router } from 'expo-router';
import { EmptyState } from '../components/ui/StateView';
import { Screen } from '../components/ui/Screen';

export default function NotFoundScreen() {
  return (
    <Screen scroll={false}>
      <EmptyState
        icon="compass-outline"
        title="Esta vista no existe"
        description="La ruta solicitada no forma parte de Pulse Music."
        actionLabel="Volver al inicio"
        onAction={() => router.replace('/')}
      />
    </Screen>
  );
}
