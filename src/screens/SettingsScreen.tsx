import { router } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { Chip, Screen, ScreenHeader, SettingRow } from '../components';
import { useSettings } from '../contexts/SettingsContext';
import { colors, radii, spacing, typography } from '../theme';
import { goBackOrReplace } from '../navigation/goBack';
import type { AudioSettings } from '../types/app';

type Quality = AudioSettings['playbackQuality'];

const qualities: Array<{ id: Quality; label: string; detail: string }> = [
  { id: 'normal', label: 'Normal', detail: 'Ahorra datos y espacio' },
  { id: 'high', label: 'Alta', detail: 'Equilibrio recomendado' },
  { id: 'very-high', label: 'Muy alta', detail: 'Máxima calidad MP3' }
];

function Toggle({ value, onChange, label }: { value: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      accessibilityLabel={label}
      trackColor={{ false: colors.surfaceSoft, true: colors.accentStrong }}
      thumbColor={colors.white}
      ios_backgroundColor={colors.surfaceSoft}
    />
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupBody}>{children}</View>
    </View>
  );
}

function QualityPicker({
  title,
  value,
  onChange
}: {
  title: string;
  value: Quality;
  onChange: (quality: Quality) => void;
}) {
  const current = qualities.find((quality) => quality.id === value);
  return (
    <View style={styles.qualityPicker}>
      <Text style={styles.qualityTitle}>{title}</Text>
      <Text style={styles.qualityDetail}>{current?.detail}</Text>
      <View style={styles.chips}>
        {qualities.map((quality) => (
          <Chip key={quality.id} label={quality.label} active={quality.id === value} onPress={() => onChange(quality.id)} />
        ))}
      </View>
    </View>
  );
}

export function SettingsScreen() {
  const { settings, setSetting, resetSettings } = useSettings();

  const confirmReset = () => Alert.alert(
    'Restablecer configuración',
    'Se recuperarán todos los valores recomendados de Pulse.',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Restablecer', style: 'destructive', onPress: resetSettings }
    ]
  );

  return (
    <Screen contentContainerStyle={styles.content}>
      <ScreenHeader
        eyebrow="PULSE MUSIC"
        title="Configuración"
        onBack={() => goBackOrReplace('/profile')}
        right={undefined}
      />

      <Group title="Calidad de audio">
        <QualityPicker
          title="Reproducción en línea"
          value={settings.playbackQuality}
          onChange={(value) => setSetting('playbackQuality', value)}
        />
        <View style={styles.divider} />
        <QualityPicker
          title="Descargas"
          value={settings.downloadQuality}
          onChange={(value) => setSetting('downloadQuality', value)}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="cellular-outline"
          title="Ahorro de datos"
          description="Reduce automáticamente el consumo en redes móviles."
          right={<Toggle label="Ahorro de datos" value={settings.dataSaver} onChange={(value) => setSetting('dataSaver', value)} />}
        />
      </Group>


      <Group title="Reproducción">
        <SettingRow
          icon="infinite-outline"
          title="Reproducción automática"
          description="Continúa con la cola cuando termina la última canción."
          right={<Toggle label="Reproducción automática" value={settings.autoplay} onChange={(value) => setSetting('autoplay', value)} />}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="options-outline"
          title="Normalizar volumen"
          description="Mantiene un nivel parecido entre canciones."
          right={<Toggle label="Normalizar volumen" value={settings.normalizeVolume} onChange={(value) => setSetting('normalizeVolume', value)} />}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="warning-outline"
          title="Permitir contenido explícito"
          description="Muestra y reproduce canciones marcadas como explícitas."
          right={<Toggle label="Permitir contenido explícito" value={settings.allowExplicit} onChange={(value) => setSetting('allowExplicit', value)} />}
        />
      </Group>

      <Group title="Descargas">
        <SettingRow
          icon="wifi-outline"
          title="Solo mediante Wi-Fi"
          description="Evita descargar archivos usando tus datos móviles."
          right={<Toggle label="Descargar solo con Wi-Fi" value={settings.wifiOnlyDownloads} onChange={(value) => setSetting('wifiOnlyDownloads', value)} />}
        />
      </Group>

      <Group title="Privacidad">
        <SettingRow
          icon="eye-off-outline"
          title="Sesión privada"
          description="Lo que escuches no se añadirá a tu historial."
          right={<Toggle label="Sesión privada" value={settings.privateSession} onChange={(value) => setSetting('privateSession', value)} />}
        />
      </Group>

      <Group title="Acerca de">
        <SettingRow icon="information-circle-outline" title="Pulse Music" description="Versión móvil 0.1.0 · Catálogo de demostración" value="MVP" />
        <View style={styles.divider} />
        <SettingRow icon="refresh-outline" title="Restablecer preferencias" description="Volver a los ajustes recomendados." onPress={confirmReset} danger />
      </Group>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 132 },
  group: { marginHorizontal: spacing.lg, marginBottom: spacing.xl },
  groupTitle: { ...typography.section, color: colors.text, fontSize: 16, marginBottom: spacing.sm },
  groupBody: { borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' },
  qualityPicker: { padding: spacing.lg },
  qualityTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  qualityDetail: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: spacing.lg }
});

export default SettingsScreen;
