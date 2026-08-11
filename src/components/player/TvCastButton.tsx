import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { getNativeCastButton, useCast } from '../../contexts/CastContext';
import { colors, radii, spacing, typography } from '../../theme';

interface TvCastButtonProps {
  showLabel?: boolean;
}

export function TvCastButton({ showLabel = false }: TvCastButtonProps) {
  const cast = useCast();
  const NativeCastButton = getNativeCastButton();
  const label = cast.isConnected ? (cast.deviceName ?? 'TV conectada') : 'Conectar TV';

  if (!cast.isAvailable || !NativeCastButton) {
    return (
      <Pressable
        accessibilityLabel="Google Cast requiere instalar el APK"
        accessibilityRole="button"
        onPress={() => Alert.alert(
          'Google Cast requiere el APK',
          'Expo Go no incluye el modulo nativo de Google Cast. Instala el proximo APK preview de Pulse Music para conectarte a la TV.'
        )}
        style={({ pressed }) => [styles.control, pressed && styles.pressed]}
      >
        <View style={styles.iconFrame}>
          <Ionicons color={colors.textMuted} name="tv-outline" size={22} />
        </View>
        {showLabel ? <Text numberOfLines={1} style={styles.label}>{label}</Text> : null}
      </Pressable>
    );
  }

  return (
    <View accessibilityLabel={label} style={styles.control}>
      <View style={[styles.iconFrame, cast.isConnected && styles.connected]}>
        <NativeCastButton
          accessibilityLabel={label}
          style={styles.nativeButton}
          tintColor={cast.isConnected ? colors.accent : colors.textMuted}
        />
      </View>
      {showLabel ? (
        <Text numberOfLines={1} style={[styles.label, cast.isConnected && styles.connectedLabel]}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  control: {
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconFrame: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round
  },
  connected: {
    backgroundColor: 'rgba(169,152,255,0.14)'
  },
  nativeButton: {
    width: 30,
    height: 30
  },
  label: {
    ...typography.caption,
    maxWidth: 78,
    color: colors.textDim,
    marginTop: spacing.xs,
    textAlign: 'center'
  },
  connectedLabel: {
    color: colors.accent
  },
  pressed: {
    opacity: 0.68
  }
});
