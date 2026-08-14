# Pulse Mobile

Aplicación React Native/Expo que consume el catálogo y los MP3 de `pulse-api`.
Usa Expo Router, un reproductor global con `expo-audio`, persistencia con
AsyncStorage y descargas reales con Expo FileSystem.

> Esta es una app React Native nativa, no la web dentro de un WebView. Para
> instalarla sin Expo Go, sigue [ANDROID_RELEASE.md](./ANDROID_RELEASE.md).

## De dónde viene cada cosa

La app solo habla con `pulse-api`, pero no todo llega de ahí:

| Qué | De dónde llega |
|---|---|
| Catálogo, sesión, biblioteca | `pulse-api` en Render |
| **Los MP3** | **Cloudflare R2**, no el API |
| **Las portadas** | **Cloudflare R2**, URL pública |

Al reproducir, la app pide `/tracks/:id/stream` y recibe un **302** hacia una URL
temporal y firmada de R2. `expo-audio` sigue la redirección solo, y las descargas
de Expo FileSystem también. El audio nunca pasa por el servidor.

Un detalle que le toca solo a esta app: al no ser un navegador, no manda cabecera
`Origin`, así que la lista `CORS_ORIGINS` del API no la afecta. Si la web no
carga por CORS pero la móvil sí, es exactamente esto y no un problema de red.

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

## La variable

Una sola, y quién la pone depende de cómo arranques:

| Cómo arrancas | De dónde sale `EXPO_PUBLIC_API_URL` |
|---|---|
| `npm run start:go`, `npm run android` | de `.env` |
| `npm run build:apk` y demás builds de EAS | de **`eas.json`**, que no lee `.env` |

En `eas.json` los perfiles `preview` y `production` ya apuntan al API
desplegado. El perfil `production` además **falla el build** si la URL no es
HTTPS: lo comprueba `app.config.js`, porque Play Store no acepta tráfico en
claro y es mejor enterarse al construir que al publicar.

Contra el API desplegado, en `.env`:

```dotenv
EXPO_PUBLIC_API_URL=https://pulse-api-mq9p.onrender.com/v1
```

Con esto no hace falta ni red Wi-Fi compartida ni tener la API encendida: el
teléfono va a internet directamente.

## Probar contra una API local

Solo si necesitas la API en tu máquina. El teléfono y el computador deben estar
en la misma red Wi-Fi.

Esta sección usa Expo Go únicamente como prueba rápida durante el desarrollo.
Para probar el APK autónomo que se instala desde Android, usa
`npm.cmd run build:apk` como se explica en `ANDROID_RELEASE.md`.

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
debugging.

## Estado de sincronización

El catálogo y el streaming vienen de `pulse-api`; los archivos, de R2.

Favoritos, perfil, playlists, historial, notificaciones y ajustes siguen
funcionando **en el dispositivo**, aunque el API ya tiene los endpoints para
sincronizarlos: `/auth/*` para la sesión y `/me/*` para biblioteca, playlists,
historial y preferencias. Falta conectarlos desde esta app.

Cuando se haga, esta app no usa cookies: mandando la cabecera
`X-Pulse-Client: native` el API devuelve el refresh token en el cuerpo en lugar
de plantarlo en una cookie `httpOnly`, que es lo único que un navegador sabe
hacer y lo que aquí no serviría de nada. Eso ya está resuelto en
[`src/services/api.ts`](./src/services/api.ts).
