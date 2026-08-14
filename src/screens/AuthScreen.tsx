import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { Screen } from '../components';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../services/api';
import { authApi } from '../services/auth/authApi';
import { colors, radii, spacing, typography } from '../theme';

/** El mismo mínimo que exige el API, para no descubrirlo con un 400. */
const PASSWORD_MIN = 10;

type Mode = 'login' | 'register' | 'recover';

const copy: Record<Mode, { title: string; subtitle: string; cta: string }> = {
  login: {
    title: 'Tu música, contigo',
    subtitle: 'Inicia sesión para llevarte tu biblioteca a cualquier dispositivo.',
    cta: 'Iniciar sesión'
  },
  register: {
    title: 'Crea tu cuenta',
    subtitle: 'Tus favoritos, playlists e historial dejan de vivir solo en este teléfono.',
    cta: 'Crear cuenta'
  },
  recover: {
    title: 'Recuperar acceso',
    subtitle: 'Te enviamos un enlace para elegir una contraseña nueva.',
    cta: 'Enviar enlace'
  }
};

export function AuthScreen() {
  const router = useRouter();
  const { signIn, signUp, canPersistSession } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState({ displayName: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setNotice('');
  };

  const submit = async () => {
    if (busy) return;

    const email = form.email.trim().toLowerCase();
    const { password } = form;

    if (!email) {
      setError('Escribe tu correo electrónico.');
      return;
    }
    if (mode !== 'recover' && !password) {
      setError('Escribe tu contraseña.');
      return;
    }
    if (mode === 'register' && password.length < PASSWORD_MIN) {
      setError(`La contraseña necesita al menos ${PASSWORD_MIN} caracteres.`);
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'recover') {
        await authApi.forgotPassword(email);
        // El mensaje no confirma que la cuenta exista: el servidor tampoco lo
        // hace, y decirlo aquí convertiría este formulario en un comprobador de
        // qué direcciones están registradas.
        setMode('login');
        setNotice('Si esa cuenta existe, el enlace ya va de camino.');
        return;
      }

      if (mode === 'login') await signIn({ email, password });
      else await signUp({ email, password, displayName: form.displayName.trim() || undefined });

      // `replace` y no `push`: quien ya entró no debería poder volver atrás a la
      // pantalla de acceso con el gesto del sistema.
      router.replace('/');
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'No se pudo completar la operación. Inténtalo de nuevo.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <View style={styles.brandDot} />
          </View>
          <Text style={styles.brandName}>Pulse Music</Text>
        </View>

        <Text style={styles.title}>{copy[mode].title}</Text>
        <Text style={styles.subtitle}>{copy[mode].subtitle}</Text>

        <View style={styles.form}>
          {mode === 'register' ? (
            <TextInput
              value={form.displayName}
              onChangeText={(displayName) => setForm((f) => ({ ...f, displayName }))}
              placeholder="Nombre (opcional)"
              placeholderTextColor={colors.textDim}
              autoComplete="name"
              autoCapitalize="words"
              style={styles.input}
            />
          ) : null}

          <TextInput
            value={form.email}
            onChangeText={(email) => setForm((f) => ({ ...f, email }))}
            placeholder="Correo electrónico"
            placeholderTextColor={colors.textDim}
            keyboardType="email-address"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect={false}
            inputMode="email"
            style={styles.input}
          />

          {mode !== 'recover' ? (
            <TextInput
              value={form.password}
              onChangeText={(password) => setForm((f) => ({ ...f, password }))}
              placeholder="Contraseña"
              placeholderTextColor={colors.textDim}
              secureTextEntry
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              autoCapitalize="none"
              onSubmitEditing={() => void submit()}
              returnKeyType="go"
              style={styles.input}
            />
          ) : null}

          {mode === 'register' ? (
            <Text style={styles.hint}>Mínimo {PASSWORD_MIN} caracteres.</Text>
          ) : null}

          {error ? (
            <View style={[styles.banner, styles.errorBanner]}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
              <Text style={[styles.bannerText, styles.errorText]}>{error}</Text>
            </View>
          ) : null}

          {notice ? (
            <View style={[styles.banner, styles.noticeBanner]}>
              <Ionicons name="mail-outline" size={16} color={colors.accent} />
              <Text style={[styles.bannerText, styles.noticeText]}>{notice}</Text>
            </View>
          ) : null}

          {!canPersistSession ? (
            <View style={[styles.banner, styles.noticeBanner]}>
              <Ionicons name="lock-open-outline" size={16} color={colors.warning} />
              <Text style={[styles.bannerText, styles.warningText]}>
                Este dispositivo no ofrece almacenamiento seguro, así que tendrás que iniciar sesión cada vez que
                abras la app.
              </Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void submit()}
            style={({ pressed }) => [styles.submit, pressed && styles.submitPressed, busy && styles.submitBusy]}
          >
            {busy ? (
              <ActivityIndicator color={colors.accentInk} size="small" />
            ) : (
              <Ionicons name="mail-outline" size={16} color={colors.accentInk} />
            )}
            <Text style={styles.submitText}>{busy ? 'Conectando…' : copy[mode].cta}</Text>
          </Pressable>
        </View>

        <View style={styles.links}>
          {mode === 'login' ? (
            <>
              <LinkButton label="¿Olvidaste tu contraseña?" onPress={() => switchMode('recover')} />
              <LinkButton label="¿No tienes cuenta? Regístrate" onPress={() => switchMode('register')} accent />
            </>
          ) : (
            <LinkButton label="Volver a iniciar sesión" onPress={() => switchMode('login')} />
          )}
          <LinkButton label="Explorar sin cuenta" onPress={() => router.replace('/')} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function LinkButton({ label, onPress, accent }: { label: string; onPress: () => void; accent?: boolean }) {
  return (
    <Pressable accessibilityRole="button" hitSlop={6} onPress={onPress}>
      {({ pressed }) => (
        <Text style={[styles.link, accent && styles.linkAccent, pressed && styles.linkPressed]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    paddingBottom: spacing.xxxl
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xxl
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center'
  },
  brandDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accentInk
  },
  brandName: {
    ...typography.section,
    color: colors.text
  },
  title: {
    ...typography.title,
    color: colors.text
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm
  },
  form: {
    marginTop: spacing.xxl,
    gap: spacing.md
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    fontSize: 15,
    color: colors.text
  },
  hint: {
    ...typography.caption,
    color: colors.textDim,
    paddingHorizontal: spacing.xs
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 115, 125, 0.12)'
  },
  noticeBanner: {
    backgroundColor: 'rgba(169, 152, 255, 0.10)'
  },
  bannerText: {
    ...typography.caption,
    flex: 1
  },
  errorText: {
    color: colors.danger
  },
  noticeText: {
    color: colors.text
  },
  warningText: {
    color: colors.warning
  },
  submit: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.round,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md + 2
  },
  submitPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }]
  },
  submitBusy: {
    opacity: 0.7
  },
  submitText: {
    color: colors.accentInk,
    fontSize: 14,
    fontWeight: '800'
  },
  links: {
    marginTop: spacing.xl,
    gap: spacing.md,
    alignItems: 'center'
  },
  link: {
    ...typography.caption,
    color: colors.textMuted
  },
  linkAccent: {
    color: colors.accent,
    fontWeight: '700'
  },
  linkPressed: {
    color: colors.text
  }
});
