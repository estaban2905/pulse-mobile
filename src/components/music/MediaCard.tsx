import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing } from '../../theme';

interface MediaCardProps {
  image: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  round?: boolean;
  large?: boolean;
}

export function MediaCard({ image, title, subtitle, onPress, round = false, large = false }: MediaCardProps) {
  const width = large ? 208 : round ? 128 : 152;

  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}
    >
      <View style={[
        styles.imageFrame,
        { width, height: width, borderRadius: round ? width / 2 : large ? radii.xl : radii.lg },
        shadows.card
      ]}>
        {image ? (
          <Image
            accessibilityLabel={`Portada de ${title}`}
            contentFit="cover"
            source={{ uri: image }}
            style={StyleSheet.absoluteFill}
            transition={180}
          />
        ) : (
          <Ionicons name="musical-notes" color={colors.textDim} size={36} />
        )}
      </View>
      <Text numberOfLines={2} style={[styles.title, round && styles.centered]}>{title}</Text>
      {subtitle ? <Text numberOfLines={2} style={[styles.subtitle, round && styles.centered]}>{subtitle}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 0
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.975 }]
  },
  imageFrame: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    marginBottom: spacing.md
  },
  title: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800'
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: spacing.xs
  },
  centered: {
    textAlign: 'center'
  }
});
