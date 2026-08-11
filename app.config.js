module.exports = ({ config }) => {
  const profile = process.env.EAS_BUILD_PROFILE ?? 'development';
  const isProduction = profile === 'production';
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (isProduction && (!apiUrl || !apiUrl.startsWith('https://'))) {
    throw new Error(
      'El build production requiere EXPO_PUBLIC_API_URL con una URL HTTPS publica.'
    );
  }

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      [
        'expo-build-properties',
        {
          android: {
            // El APK preview usa la API HTTP de la red local. Play Store exige HTTPS.
            usesCleartextTraffic: !isProduction
          }
        }
      ]
    ]
  };
};
