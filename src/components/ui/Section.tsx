import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface SectionProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
  horizontal?: boolean;
}

export function Section({ title, subtitle, actionLabel, onAction, children, horizontal = false }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {actionLabel && onAction ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={onAction}>
            {({ pressed }) => <Text style={[styles.action, pressed && styles.pressed]}>{actionLabel}</Text>}
          </Pressable>
        ) : null}
      </View>
      {horizontal ? (
        <ScrollView
          horizontal
          contentContainerStyle={styles.horizontalContent}
          showsHorizontalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xxl
  },
  header: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.lg,
    marginBottom: spacing.md
  },
  copy: {
    flex: 1,
    minWidth: 0
  },
  title: {
    ...typography.section,
    color: colors.text
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs
  },
  action: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    paddingVertical: spacing.xs
  },
  pressed: {
    opacity: 0.62
  },
  horizontalContent: {
    gap: spacing.md,
    paddingRight: spacing.xl
  }
});
