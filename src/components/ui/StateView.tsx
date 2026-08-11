import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import type { IoniconName } from './IconButton';

interface LoadingStateProps {
  message?: string;
  label?: string;
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

interface EmptyStateProps {
  icon?: IoniconName | React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

function StateLayout({ children }: { children: React.ReactNode }) {
  return <View style={styles.container}>{children}</View>;
}

export function LoadingState({ message, label }: LoadingStateProps) {
  return (
    <StateLayout>
      <ActivityIndicator color={colors.accent} size="large" />
      <Text style={styles.description}>{label ?? message ?? 'Cargando…'}</Text>
    </StateLayout>
  );
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <StateLayout>
      <View style={[styles.icon, styles.errorIcon]}>
        <Ionicons name="cloud-offline-outline" size={30} color={colors.danger} />
      </View>
      <Text style={styles.title}>No se pudo cargar</Text>
      <Text style={styles.description}>{message}</Text>
      {onRetry ? <ActionButton label="Reintentar" onPress={onRetry} /> : null}
    </StateLayout>
  );
}

export function EmptyState({
  icon = 'musical-notes-outline',
  title,
  description,
  actionLabel,
  onAction
}: EmptyStateProps) {
  return (
    <StateLayout>
      <View style={styles.icon}>
        {typeof icon === 'string'
          ? <Ionicons name={icon as IoniconName} size={31} color={colors.accent} />
          : icon}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? <ActionButton label={actionLabel} onPress={onAction} /> : null}
    </StateLayout>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
    >
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    minHeight: 280,
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center'
  },
  icon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(169, 152, 255, 0.12)',
    marginBottom: spacing.lg
  },
  errorIcon: {
    backgroundColor: 'rgba(255, 115, 125, 0.12)'
  },
  title: {
    ...typography.section,
    color: colors.text,
    textAlign: 'center'
  },
  description: {
    ...typography.body,
    maxWidth: 320,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm
  },
  action: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.round,
    backgroundColor: colors.accent
  },
  actionPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }]
  },
  actionText: {
    color: colors.accentInk,
    fontSize: 14,
    fontWeight: '800'
  }
});
