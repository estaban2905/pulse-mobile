import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, spacing } from '../../theme';
import type { IoniconName } from './IconButton';

interface ChipProps {
  label: string;
  selected?: boolean;
  active?: boolean;
  icon?: IoniconName;
  onPress?: () => void;
}

export function Chip({ label, selected = false, active = false, icon, onPress }: ChipProps) {
  const isActive = selected || active;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected: isActive }}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        isActive && styles.active,
        pressed && styles.pressed
      ]}
    >
      {icon ? <Ionicons name={icon} size={15} color={isActive ? colors.accentInk : colors.textMuted} /> : null}
      <Text style={[styles.label, isActive && styles.activeLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  active: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  pressed: {
    opacity: 0.72
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700'
  },
  activeLabel: {
    color: colors.accentInk
  }
});
