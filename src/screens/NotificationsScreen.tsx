import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EmptyState, IconButton, Screen, ScreenHeader } from '../components';
import { useLibrary } from '../contexts/LibraryContext';
import { colors, radii, spacing, typography } from '../theme';
import type { AppNotification } from '../types/app';
import { relativeDate } from '../utils/format';

const icons: Record<AppNotification['kind'], React.ComponentProps<typeof Ionicons>['name']> = {
  release: 'disc-outline',
  recommendation: 'sparkles-outline',
  download: 'cloud-download-outline'
};

export function NotificationsScreen() {
  const library = useLibrary();
  const unread = library.notifications.filter((notification) => !notification.read).length;

  return (
    <Screen contentContainerStyle={styles.content}>
      <ScreenHeader
        eyebrow={unread ? `${unread} SIN LEER` : 'TODO AL DÍA'}
        title="Notificaciones"
        onBack={() => router.back()}
        right={unread ? (
          <IconButton name="checkmark-done" onPress={library.markAllNotificationsRead} accessibilityLabel="Marcar todas como leídas" />
        ) : undefined}
      />

      {library.notifications.length ? (
        <View style={styles.list}>
          {library.notifications.map((notification) => (
            <Pressable
              key={notification.id}
              accessibilityRole="button"
              accessibilityLabel={`${notification.read ? '' : 'Sin leer. '}${notification.title}. ${notification.message}`}
              onPress={() => library.markNotificationRead(notification.id)}
              style={({ pressed }) => [
                styles.notification,
                !notification.read && styles.notificationUnread,
                pressed && styles.pressed
              ]}
            >
              <View style={[styles.icon, !notification.read && styles.iconUnread]}>
                <Ionicons name={icons[notification.kind]} size={20} color={notification.read ? colors.textMuted : colors.accent} />
              </View>
              <View style={styles.copy}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>{notification.title}</Text>
                  {!notification.read ? <View style={styles.dot} /> : null}
                </View>
                <Text style={styles.message}>{notification.message}</Text>
                <Text style={styles.date}>{relativeDate(notification.createdAt)}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <EmptyState
          icon="notifications-outline"
          title="Todo al día"
          description="Aquí aparecerán novedades, recomendaciones y descargas completadas."
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 132 },
  list: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  notification: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  notificationUnread: { borderColor: `${colors.accent}66`, backgroundColor: `${colors.accent}0D` },
  pressed: { opacity: 0.72 },
  icon: { width: 42, height: 42, borderRadius: radii.round, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSoft },
  iconUnread: { backgroundColor: `${colors.accent}20` },
  copy: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700' },
  dot: { width: 7, height: 7, borderRadius: radii.round, backgroundColor: colors.accent },
  message: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  date: { ...typography.caption, color: colors.textDim, marginTop: spacing.sm }
});

export default NotificationsScreen;
