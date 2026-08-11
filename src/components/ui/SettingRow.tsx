import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import type { IoniconName } from './IconButton';

interface SettingRowProps {
  icon?: IoniconName;
  title: string;
  description?: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}

export function SettingRow({
  icon,
  title,
  description,
  value,
  onPress,
  right,
  danger = false,
  disabled = false
}: SettingRowProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress || disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}
    >
      {icon ? (
        <View style={[styles.icon, danger && styles.dangerIcon]}>
          <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.accent} />
        </View>
      ) : null}
      <View style={styles.copy}>
        <Text style={[styles.title, danger && styles.dangerText]}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {value ? <Text numberOfLines={1} style={styles.value}>{value}</Text> : null}
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textDim} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  pressed: {
    opacity: 0.65
  },
  disabled: {
    opacity: 0.42
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(169, 152, 255, 0.12)'
  },
  dangerIcon: {
    backgroundColor: 'rgba(255, 115, 125, 0.12)'
  },
  copy: {
    flex: 1,
    minWidth: 0
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700'
  },
  dangerText: {
    color: colors.danger
  },
  description: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2
  },
  value: {
    maxWidth: 116,
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'right'
  }
});
