import React from 'react';
import { RequireAuth } from '../../components/auth/RequireAuth';
import { ProfileScreen } from '../../screens/ProfileScreen';

export default function ProfileRoute() {
  return (
    <RequireAuth>
      <ProfileScreen />
    </RequireAuth>
  );
}
