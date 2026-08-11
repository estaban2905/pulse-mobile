import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii } from '../../theme';

export type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface IconButtonProps {
  name: IoniconName;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  iconSize?: number;
  color?: string;
  filled?: boolean;
  active?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  size = 42,
  iconSize = 21,
  color,
  filled = false,
  active = false,
  disabled = false,
  style
}: IconButtonProps) {
  const iconColor = color ?? (active ? colors.accent : colors.text);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size },
        filled && styles.filled,
        active && styles.active,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style
      ]}
    >
      <Ionicons name={name} size={iconSize} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round
  },
  filled: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth
  },
  active: {
    backgroundColor: 'rgba(169, 152, 255, 0.14)'
  },
  pressed: {
    opacity: 0.68,
    transform: [{ scale: 0.94 }]
  },
  disabled: {
    opacity: 0.38
  }
});
