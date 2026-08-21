import { Alert, Linking, Platform } from 'react-native';

/**
 * Duplicar la pantalla en el televisor.
 *
 * No hay API pública para esto: quien duplica es el sistema, y lo más que
 * puede hacer una aplicación es abrir su selector de pantallas. Basta, y
 * además es lo que conviene: al duplicar, en el televisor se ve lo que dibuja
 * Pulse —la letra incluida— sin receptor, sin aplicación de televisor y sin
 * nada que mantener del otro lado.
 *
 * El nombre de la pantalla cambia según el fabricante, de ahí la lista: en un
 * Samsung es Smart View, en un Android de serie es Transmitir. Se prueban en
 * orden porque `sendIntent` falla cuando el teléfono no trae esa pantalla.
 */
const ANDROID_SCREEN_PICKERS = [
  'android.settings.CAST_SETTINGS',
  'android.settings.WIFI_DISPLAY_SETTINGS'
];

export async function openScreenMirroring(): Promise<void> {
  if (Platform.OS !== 'android') {
    // En iOS no se puede abrir desde una aplicación; AirPlay vive en el Centro
    // de control y solo el usuario llega hasta ahí.
    Alert.alert(
      'Ver en la TV',
      'Abre el Centro de control y toca “Duplicar pantalla”. Elige tu televisor y vuelve a Pulse.'
    );
    return;
  }

  for (const action of ANDROID_SCREEN_PICKERS) {
    try {
      await Linking.sendIntent(action);
      return;
    } catch {
      // Este teléfono no trae esa pantalla; se prueba la siguiente.
    }
  }

  Alert.alert(
    'Ver en la TV',
    'Tu teléfono no deja abrir el selector desde aquí. Está en los ajustes del sistema, como “Transmitir”, “Smart View” o “Duplicar pantalla”.'
  );
}
