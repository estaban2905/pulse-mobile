# Pulse Mobile

Aplicación React Native/Expo que consume el catálogo y los MP3 de `pulse-api`.
Usa Expo Router, un reproductor global con `expo-audio`, persistencia con
AsyncStorage y descargas reales con Expo FileSystem.

> Esta es una app React Native nativa, no la web dentro de un WebView. Para
> instalarla sin Expo Go, sigue [ANDROID_RELEASE.md](./ANDROID_RELEASE.md).

## Funcionalidades incluidas

- Tabs reales: Inicio, Buscar, Biblioteca y Perfil.
- Vistas de álbum, artista, playlist, colección, historial, descargas,
  notificaciones, ajustes, cola y reproductor completo.
- Streaming MP3, play/pause, anterior/siguiente, seek, volumen, shuffle,
  repetición, autoavance, cola reordenable y temporizador.
- Restauración local de cola, canción, posición y preferencias del reproductor.
- Mini player persistente y metadatos para pantalla bloqueada.
- Favoritos, álbumes guardados, artistas seguidos, búsquedas recientes,
  historial y perfil persistentes en el dispositivo.
- Crear, editar, eliminar y reordenar playlists personales.
- Descargar/eliminar MP3 y reproducir primero el archivo local cuando existe.
- Estados de carga, error/reintento y contenido vacío.

## Estructura

```text
src/
  app/          rutas Expo Router
  components/   UI, filas de música y reproductor
  contexts/     catálogo, biblioteca, ajustes y player
  data/         colecciones editoriales de la demo
  screens/      pantallas principales y secundarias
  services/     API y descargas
  theme/        colores, espacios y tipografía
  types/        contratos de API y estado local
```

## Probar en un teléfono físico

Esta sección usa Expo Go únicamente como prueba rápida durante el desarrollo.
Para probar el APK autónomo que se instala desde Android, usa
`npm.cmd run build:apk` como se explica en `ANDROID_RELEASE.md`.

El teléfono y el computador deben estar en la misma red Wi-Fi.

1. Arranca la API en una terminal:

   ```powershell
   cd C:\ruta\al\workspace\pulse-api
   npm.cmd run dev
   ```

2. Comprueba desde el navegador del teléfono que esta dirección responde:

   ```text
   http://192.168.100.16:4000/v1/health
   ```

3. Configura `pulse-mobile/.env`:

   ```dotenv
   EXPO_PUBLIC_API_URL=http://192.168.100.16:4000/v1
   ```

4. Arranca Expo en otra terminal:

   ```powershell
   cd C:\ruta\al\workspace\pulse-mobile
   npm.cmd install
   npm.cmd run start:go
   ```

5. El proyecto usa Expo SDK 57. Si Expo Go muestra “Project is incompatible”,
   descarga desde el computador el APK oficial compatible:

   ```powershell
   cd C:\ruta\al\workspace\pulse-mobile
   npx.cmd expo-go download android 57
   ```

   Copia el APK generado al teléfono e instálalo. Si Android no permite
   instalarlo encima de la versión de Play Store, desinstala primero Expo Go y
   vuelve a instalar el APK oficial.

6. Abre **Expo Go** en Android y usa su opción **Scan QR code**. No abras la URL
   `exp://...` en Chrome: Chrome muestra `ERR_UNKNOWN_URL_SCHEME` porque ese
   esquema pertenece a Expo Go.

Si Metro conserva una versión anterior:

```powershell
npm.cmd run start:clear
```

## Emuladores

- Android Emulator: `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000/v1`
- iOS Simulator: `EXPO_PUBLIC_API_URL=http://localhost:4000/v1`

Después de cambiar `.env`, reinicia Metro.

## Prueba rápida recomendada

1. Reproduce una canción y navega entre las cuatro tabs: el audio no debe
   detenerse.
2. Abre el mini player, mueve el seek y usa anterior/siguiente.
3. Marca un favorito, crea una playlist y reinicia Expo: deben persistir.
4. Descarga una pista, espera la notificación y vuelve a reproducirla.
5. Reordena la cola y una playlist, activa shuffle/repeat y prueba el
   temporizador.
6. Busca por canción, artista y álbum; abre sus vistas de detalle.

## Validación nativa completa

Expo Go permite revisar la UI y el flujo principal. El background prolongado,
los controles del sistema y la configuración nativa de audio deben validarse
con un development build:

```powershell
npm.cmd run android
```

Ese comando necesita Android Studio/emulador o un teléfono Android con USB
debugging. En producción la API debe usar HTTPS.

## Estado de sincronización

El catálogo, las portadas y el streaming vienen de `pulse-api`. Favoritos,
perfil, playlists, historial, notificaciones y ajustes funcionan hoy de forma
local en el dispositivo. Para compartir el mismo estado con la web todavía se
deben implementar los endpoints de usuario/autenticación descritos en el
[README general](../README.md#próximos-pasos).
