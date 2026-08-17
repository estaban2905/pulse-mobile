import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, radii, spacing, typography } from '../../theme';

export function TvCastButton({ showLabel = false }: { showLabel?: boolean }) {
  const handlePress = () => {
    router.push('/tv');
  };

  return (
    <Pressable
      accessibilityLabel="Conectar TV"
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [styles.control, pressed && styles.pressed]}
    >
      <View style={styles.iconFrame}>
        <Ionicons color={colors.textMuted} name="tv-outline" size={22} />
      </View>
      {showLabel ? <Text numberOfLines={1} style={styles.label}>Conectar TV</Text> : null}
    </Pressable>
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
  label: {
    ...typography.caption,
    maxWidth: 78,
    color: colors.textDim,
    marginTop: spacing.xs,
    textAlign: 'center'
  },
  pressed: {
    opacity: 0.68
  }
});