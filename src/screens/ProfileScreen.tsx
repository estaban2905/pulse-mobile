import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import {
  ErrorState,
  IconButton,
  LoadingState,
  MediaCard,
  Screen,
  ScreenHeader,
  Section,
  SettingRow,
  TrackRow
} from '../components';
import { useCatalog } from '../contexts/CatalogContext';
import { useLibrary } from '../contexts/LibraryContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useSettings } from '../contexts/SettingsContext';
import { colors, radii, spacing, typography } from '../theme';

interface StatCardProps {
  label: string;
  value: number;
  onPress: () => void;
}

function StatCard({ label, value, onPress }: StatCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}
    >
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

function qualityLabel(value: 'normal' | 'high' | 'very-high'): string {
  if (value === 'very-high') return 'Muy alta';
  if (value === 'high') return 'Alta';
  return 'Normal';
}

export function ProfileScreen() {
  const { catalog, loading, error, refresh, getArtist } = useCatalog();
  const library = useLibrary();
  const { settings } = useSettings();
  const player = usePlayer();
  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState(library.profile.name);
  const [draftEmail, setDraftEmail] = useState(library.profile.email);

  const followedArtists = useMemo(
    () => library.followedArtistIds.map((id) => getArtist(id)).filter((artist) => Boolean(artist)),
    [getArtist, library.followedArtistIds]
  );

  const openEdit = () => {
    setDraftName(library.profile.name);
    setDraftEmail(library.profile.email);
    setEditOpen(true);
  };

  const saveProfile = () => {
    const name = draftName.trim();
    const email = draftEmail.trim();
    if (!name || !email) return;
    library.updateProfile({ name, email });
    setEditOpen(false);
  };

  if (loading && !catalog) {
    return (
      <Screen scroll={false} contentContainerStyle={styles.centered}>
        <LoadingState message="Cargando tu perfil…" />
      </Screen>
    );
  }

  if (error && !catalog) {
    return (
      <Screen scroll={false} contentContainerStyle={styles.centered}>
        <ErrorState message={error} onRetry={() => void refresh()} />
      </Screen>
    );
  }

  if (!catalog) return null;

  const initials = library.profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'P';
  const unread = library.notifications.filter((notification) => !notification.read).length;

  return (
    <>
      <Screen contentContainerStyle={styles.screen}>
        <ScreenHeader
          title="Perfil"
          right={(
            <IconButton
              name="settings-outline"
              accessibilityLabel="Abrir configuración"
              onPress={() => router.push('/settings')}
            />
          )}
        />

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text numberOfLines={1} style={styles.profileName}>{library.profile.name}</Text>
            <Text numberOfLines={1} style={styles.profileEmail}>{library.profile.email}</Text>
            <View style={styles.planPill}>
              <Ionicons name="sparkles" size={12} color={colors.accent} />
              <Text style={styles.planText}>Pulse {library.profile.plan}</Text>
            </View>
          </View>
          <IconButton
            name="pencil-outline"
            accessibilityLabel="Editar perfil"
            onPress={openEdit}
          />
        </View>

        <View style={styles.stats}>
          <StatCard
            label="Playlists"
            value={library.playlists.length}
            onPress={() => router.push('/library')}
          />
          <StatCard
            label="Favoritas"
            value={library.favoriteTrackIds.length}
            onPress={() => router.push({ pathname: '/collection/[kind]/[id]', params: { kind: 'favourites', id: 'all' } })}
          />
          <StatCard
            label="Siguiendo"
            value={library.followedArtistIds.length}
            onPress={() => router.push('/library')}
          />
        </View>

        {player.current ? (
          <Section title="Escuchando ahora" subtitle={player.contextLabel}>
            <TrackRow
              track={player.current}
              queue={player.queue}
              position={player.index}
              contextLabel={player.contextLabel}
              showAlbum
            />
          </Section>
        ) : null}

        {followedArtists.length > 0 ? (
          <Section title="Artistas que sigues" horizontal>
            {followedArtists.map((artist) => artist ? (
              <MediaCard
                key={artist.id}
                image={artist.photoUrl}
                title={artist.name}
                subtitle={artist.genres[0]}
                round
                onPress={() => router.push({ pathname: '/artist/[id]', params: { id: artist.id } })}
              />
            ) : null)}
          </Section>
        ) : null}

        <Section title="Tu cuenta">
          <View style={styles.settingsGroup}>
            <SettingRow
              icon="person-outline"
              title="Editar perfil"
              description="Nombre y correo electrónico"
              onPress={openEdit}
            />
            <SettingRow
              icon="notifications-outline"
              title="Notificaciones"
              description="Lanzamientos, recomendaciones y descargas"
              value={unread > 0 ? `${unread} nuevas` : 'Al día'}
              onPress={() => router.push('/notifications')}
            />
            <SettingRow
              icon="time-outline"
              title="Historial"
              description="Lo que escuchaste recientemente"
              value={`${library.history.length}`}
              onPress={() => router.push('/history')}
            />
            <SettingRow
              icon="download-outline"
              title="Descargas"
              description="Música disponible sin conexión"
              value={`${Object.keys(library.downloadedTracks).length}`}
              onPress={() => router.push('/downloads')}
            />
          </View>
        </Section>

        <Section title="Reproducción y privacidad">
          <View style={styles.settingsGroup}>
            <SettingRow
              icon="musical-notes-outline"
              title="Calidad de reproducción"
              description="Calidad usada al escuchar en línea"
              value={qualityLabel(settings.playbackQuality)}
              onPress={() => router.push('/settings')}
            />
            <SettingRow
              icon="eye-off-outline"
              title="Sesión privada"
              description="No guardar actividad en el historial"
              value={settings.privateSession ? 'Activa' : 'Desactivada'}
              onPress={() => router.push('/settings')}
            />
            <SettingRow
              icon="settings-outline"
              title="Configuración"
              description="Audio, datos y almacenamiento"
              onPress={() => router.push('/settings')}
            />
          </View>
        </Section>

        <View style={styles.demoNotice}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
          <Text style={styles.demoNoticeText}>
            Este perfil se guarda localmente en el dispositivo. La sincronización de cuentas llegará cuando se conecte el backend de usuarios.
          </Text>
        </View>
      </Screen>

      <Modal animationType="fade" transparent visible={editOpen} onRequestClose={() => setEditOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalRoot}
        >
          <Pressable accessibilityLabel="Cerrar" onPress={() => setEditOpen(false)} style={styles.backdrop} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Editar perfil</Text>
                <Text style={styles.modalSubtitle}>Estos datos se guardan en este dispositivo.</Text>
              </View>
              <IconButton name="close" accessibilityLabel="Cerrar" onPress={() => setEditOpen(false)} />
            </View>

            <View>
              <Text style={styles.inputLabel}>Nombre</Text>
              <TextInput
                autoFocus
                accessibilityLabel="Nombre"
                maxLength={60}
                onChangeText={setDraftName}
                placeholder="Tu nombre"
                placeholderTextColor={colors.textDim}
                style={styles.input}
                value={draftName}
              />
            </View>
            <View>
              <Text style={styles.inputLabel}>Correo electrónico</Text>
              <TextInput
                accessibilityLabel="Correo electrónico"
                autoCapitalize="none"
                keyboardType="email-address"
                maxLength={100}
                onChangeText={setDraftEmail}
                placeholder="tu@correo.com"
                placeholderTextColor={colors.textDim}
                style={styles.input}
                value={draftEmail}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={!draftName.trim() || !draftEmail.trim()}
              onPress={saveProfile}
              style={({ pressed }) => [
                styles.saveButton,
                (!draftName.trim() || !draftEmail.trim()) && styles.disabled,
                pressed && styles.pressed
              ]}
            >
              <Text style={styles.saveButtonLabel}>Guardar cambios</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: spacing.xxxl, gap: spacing.xxl },
  centered: { flex: 1, justifyContent: 'center' },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  avatar: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.accentStrong
  },
  avatarText: { color: colors.white, fontSize: 22, fontWeight: '900' },
  profileCopy: { flex: 1, minWidth: 0 },
  profileName: { color: colors.text, fontSize: 20, fontWeight: '800' },
  profileEmail: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  planPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.round,
    backgroundColor: 'rgba(169,152,255,0.14)'
  },
  planText: { color: colors.accent, fontSize: 10, fontWeight: '800' },
  stats: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  statValue: { color: colors.text, fontSize: 20, fontWeight: '900' },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  settingsGroup: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface
  },
  demoNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface
  },
  demoNoticeText: { ...typography.caption, flex: 1, color: colors.textMuted },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.72)'
  },
  modalCard: {
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 38 : spacing.xxl,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { ...typography.section, color: colors.text },
  modalSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  inputLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: spacing.sm },
  input: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 15
  },
  saveButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radii.round,
    backgroundColor: colors.accent
  },
  saveButtonLabel: { color: colors.accentInk, fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.38 },
  pressed: { opacity: 0.72 }
});
