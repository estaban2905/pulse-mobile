import React from 'react';
import { RequireAuth } from '../components/auth/RequireAuth';
import { HistoryScreen } from '../screens/HistoryScreen';

export default function HistoryRoute() {
  return (
    <RequireAuth>
      <HistoryScreen />
    </RequireAuth>
  );
}
