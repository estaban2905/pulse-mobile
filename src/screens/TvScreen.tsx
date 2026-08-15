import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { EmptyState, Screen, ScreenHeader } from '../components';
import { useAuth } from '../contexts/AuthContext';
import { tvApi, type TvScreen as LinkedScreen } from '../services/tv/tvApi';
import { colors, radii, spacing, typography } from '../theme';
import { goBackOrReplace } from '../navigation/goBack';

const CODE_LENGTH = 6;

/**
 * Televisores que no hablan Google Cast.
 *
 * Samsung y LG no lo implementan, así que ahí el icono de Cast nunca encuentra
 * nada. En esos televisores se abre Pulse en la pantalla, aparece un código, y
 * se escribe aquí. Después el televisor sigue a esta cuenta solo.
 */
export function TvScreen() {
  const { status } = useAuth();
  const [screens, setScreens] = useState<LinkedScreen[]>([]);
  const [code, setCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const signedIn = status === 'authenticated';

  const refresh = useCallback(async () => {
    if (!signedIn) {
      setLoading(false);
      return;
    }
    try {
      setScreens(await tvApi.list());
    } catch {
      // Una lista que no carga no merece una alerta: se reintenta al volver.
    } finally {
      setLoading(false);
    }
  }, [signedIn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const link = async () => {
    const value = code.trim().toUpperCase();
    if (value.length !== CODE_LENGTH) {
      setError(`El código tiene ${CODE_LENGTH} caracteres.`);
      return;
    }

    setLinking(true);
    setError(null);
    try {
      const screen = await tvApi.claim(value);
      setCode('');
      await refresh();
      Alert.alert('Televisor vinculado', `${screen.name} ya sigue lo que reproduces.`);
    } catch (reason) {
      // El caso normal es un código caducado —duran dos minutos— o mal copiado.
      setError(
        (reason as { status?: number })?.status === 404
          ? 'Ese código no vale o ya caducó. Genera uno nuevo en el televisor.'
          : 'No se pudo vincular. Comprueba tu conexión.'
      );
    } finally {
      setLinking(false);
    }
  };

  const unlink = (screen: LinkedScreen) => {
    Alert.alert('Desvincular', `¿Quitar ${screen.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desvincular',
        style: 'destructive',
        onPress: () => {
          setScreens((current) => current.filter((item) => item.id !== screen.id));
          void tvApi.unlink(screen.id).catch(() => void refresh());
        }
      }
    ]);
  };

  if (!signedIn) {
    return (
      <Screen>
        <ScreenHeader title="Televisores" onBack={() => goBackOrReplace('/')} />
        <EmptyState
          icon="tv-outline"
          title="Inicia sesión"
          description="Los televisores se vinculan a tu cuenta para saber qué estás escuchando."
        />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <ScreenHeader
        eyebrow="SIN GOOGLE CAST"
        title="Televisores"
        onBack={() => goBackOrReplace('/')}
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Vincular un televisor</Text>
        <Text style={styles.cardBody}>
          Abre Pulse en la pantalla del televisor. Aparecerá un código de {CODE_LENGTH} caracteres:
          escríbelo aquí.
        </Text>

        <TextInput
          value={code}
          onChangeText={(value) => {
            setCode(value.toUpperCase());
            setError(null);
          }}
          placeholder="A1B2C3"
          placeholderTextColor={colors.textDim}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={CODE_LENGTH}
          style={styles.input}
          accessibilityLabel="Código del televisor"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Vincular televisor"
          disabled={linking || code.trim().length !== CODE_LENGTH}
          onPress={() => void link()}
          style={({ pressed }) => [
            styles.button,
            (linking || code.trim().length !== CODE_LENGTH) && styles.buttonDisabled,
            pressed && styles.pressed
          ]}
        >
          {linking ? (
            <ActivityIndicator color={colors.accentInk} />
          ) : (
            <Text style={styles.buttonText}>Vincular</Text>
          )}
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Vinculados</Text>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : screens.length === 0 ? (
        <Text style={styles.empty}>Todavía no has vinculado ningún televisor.</Text>
      ) : (
        <View style={styles.list}>
          {screens.map((screen) => (
            <View key={screen.id} style={styles.row}>
              <View style={[styles.dot, screen.online && styles.dotOnline]} />
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{screen.name}</Text>
                <Text style={styles.rowSub}>{screen.online ? 'Encendido' : 'Apagado'}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Desvincular ${screen.name}`}
                hitSlop={10}
                onPress={() => unlink(screen)}
              >
                <Ionicons name="close-circle-outline" size={24} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.footnote}>
        Si tu televisor tiene Chromecast, Google TV o Android TV, no hace falta nada de esto: usa el
        icono de Cast del reproductor.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 132 },
  card: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  cardTitle: { ...typography.section, color: colors.text },
  cardBody: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  input: {
    marginTop: spacing.lg,
    height: 58,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center'
  },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.sm },
  button: {
    marginTop: spacing.lg,
    height: 50,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.accentInk, fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.75 },
  sectionTitle: {
    ...typography.section,
    color: colors.text,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg
  },
  loader: { marginTop: spacing.lg },
  empty: { ...typography.body, color: colors.textMuted, paddingHorizontal: spacing.lg },
  list: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  dot: { width: 9, height: 9, borderRadius: radii.round, backgroundColor: colors.textDim },
  dotOnline: { backgroundColor: colors.success },
  rowCopy: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  rowSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  footnote: {
    ...typography.caption,
    color: colors.textDim,
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
    lineHeight: 18
  }
});

export default TvScreen;
