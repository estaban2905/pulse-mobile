import React from 'react';
import { RequireAuth } from '../../components/auth/RequireAuth';
import { LibraryScreen } from '../../screens/LibraryScreen';

export default function LibraryRoute() {
  return (
    <RequireAuth>
      <LibraryScreen />
    </RequireAuth>
  );
}
