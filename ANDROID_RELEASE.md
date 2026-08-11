# Android: APK instalable y Play Store

`pulse-mobile` es una aplicación React Native nativa. No contiene WebView ni
convierte la versión web en una app. Expo se usa como toolchain de compilación;
el APK final incluye el runtime nativo y no necesita Expo Go ni Metro.

## 1. Generar un APK para instalar directamente

El perfil `preview` de `eas.json` genera un APK firmado. Para la configuración
actual, el teléfono y el computador deben estar en la misma red porque el APK
consume `http://192.168.100.16:4000/v1`.

Primero levanta la API:

```powershell
cd C:\Users\mpp29\Desktop\mp3\pulse-api
npm.cmd install
npm.cmd run dev
```

Verifica desde el teléfono:

```text
http://192.168.100.16:4000/v1/health
```

Después inicia sesión en Expo y compila:

```powershell
cd C:\Users\mpp29\Desktop\mp3\pulse-mobile
npx.cmd --yes eas-cli@latest login
npm.cmd run build:apk
```

En la primera compilación:

1. Acepta crear o enlazar el proyecto EAS.
2. Cuando pregunte por las credenciales Android, permite que EAS genere el
   keystore.
3. Al terminar, abre el enlace o QR entregado por EAS desde el teléfono.
4. Descarga el `.apk` y permite a Android instalar apps desde esa fuente.

El APK se abre como una app normal desde el launcher. No se escanea un QR de
Expo Go y no se ejecuta `npm run start:go`.

## 2. Generar un AAB para Google Play

Antes de una compilación de tienda, despliega `pulse-api`, las portadas y los
MP3 en una URL HTTPS pública. Luego registra esa URL en el entorno production
de EAS:

```powershell
npx.cmd --yes eas-cli@latest env:create --name EXPO_PUBLIC_API_URL --value https://api.tudominio.com/v1 --environment production --visibility plaintext
npm.cmd run build:aab
```

El perfil `production` genera un `.aab`, incrementa la versión de compilación y
rechaza una API HTTP o vacía. El AAB se sube a Google Play Console; no se instala
directamente en el teléfono.

## 3. Qué falta antes de publicar públicamente

- API y archivos multimedia desplegados con HTTPS y almacenamiento estable.
- Cuenta de Google Play Developer, ficha, capturas, política de privacidad,
  clasificación de contenido y formulario de seguridad de datos.
- Derechos de distribución de cada canción. Los MP3 comerciales sirven para
  pruebas privadas, pero no deben publicarse en Play Store sin licencia.
- Pruebas en varios Android de reproducción, descargas, segundo plano,
  auriculares y pérdida de red.

## Perfiles disponibles

| Perfil | Archivo | Uso | Necesita Expo Go/Metro |
| --- | --- | --- | --- |
| `preview` | APK | Instalación directa y pruebas | No |
| `production` | AAB | Google Play Store | No |
