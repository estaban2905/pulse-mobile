import React from 'react';
import { View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProviders } from '../providers/AppProviders';
import { MiniPlayer } from '../components/player/MiniPlayer';
import { colors } from '../theme';

function NavigationShell() {
  const pathname = usePathname();
  const playerOpen = pathname === '/player';

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
      {!playerOpen && <MiniPlayer />}
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
