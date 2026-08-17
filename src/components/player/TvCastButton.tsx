import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePlayer } from '../../contexts/PlayerContext';
import { colors, radii, spacing, typography } from '../../theme';

interface TvCastButtonProps {
  showLabel?: boolean;
}

export function TvCastButton({ showLabel = false }: TvCastButtonProps) {
  const { current, setTvShareVisible } = usePlayer();
  const isPlaying = !!current;

  const handlePress = () => {
    if (isPlaying) {
      setTvShareVisible(true);
    }
  };

  return (
    <Pressable
      accessibilityLabel="Compartir con TV"
      accessibilityRole="button"
      disabled={!isPlaying}
      onPress={handlePress}
      style={({ pressed }) => [styles.control, pressed && styles.pressed, !isPlaying && styles.disabled]}
    >
      <View style={styles.iconFrame}>
        <Ionicons color={isPlaying ? colors.accent : colors.textMuted} name="tv-outline" size={22} />
      </View>
      {showLabel ? <Text numberOfLines={1} style={styles.label}>{isPlaying ? 'TV' : 'TV'}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  control: {
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFrame: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
  },
  label: {
    ...typography.caption,
    maxWidth: 78,
    color: colors.textDim,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.68,
  },
  disabled: {
    opacity: 0.4,
  },
});