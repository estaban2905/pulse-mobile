import React from 'react';
import { View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProviders } from '../providers/AppProviders';
import { MiniPlayer } from '../components/player/MiniPlayer';
import { colors, spacing, TAB_BAR_BASE_HEIGHT } from '../theme';

const TAB_PATHS = new Set(['/', '/search', '/library', '/profile']);

function NavigationShell() {
  const pathname = usePathname();
  const playerOpen = pathname === '/player';
  const tabBarVisible = TAB_PATHS.has(pathname);
  // El mini reproductor no pinta nada sobre el formulario de acceso: tapa el
  // último campo y sugiere una sesión que todavía no existe.
  const chromeHidden = playerOpen || pathname === '/login';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right'
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="player" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="queue" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="album/[id]" />
        <Stack.Screen name="artist/[id]" />
        <Stack.Screen name="playlist/[id]" />
        <Stack.Screen name="collection/[kind]/[id]" />
        <Stack.Screen name="history" />
        <Stack.Screen name="downloads" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="settings" />
      </Stack>
      {!chromeHidden && (
        <MiniPlayer bottomOffset={(tabBarVisible ? TAB_BAR_BASE_HEIGHT : 0) + spacing.sm} />
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProviders>
        <StatusBar style="light" />
        <NavigationShell />
      </AppProviders>
    </SafeAreaProvider>
  );
}
