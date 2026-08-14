import React from 'react';
import { RequireAuth } from '../components/auth/RequireAuth';
import { DownloadsScreen } from '../screens/DownloadsScreen';

export default function DownloadsRoute() {
  return (
    <RequireAuth>
      <DownloadsScreen />
    </RequireAuth>
  );
}
