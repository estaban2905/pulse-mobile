const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

/**
 * `@pulse/core` vive dentro del proyecto, en `packages/core`.
 *
 * Estuvo fuera, como carpeta hermana, y compilaba bien en local pero el build
 * de EAS moría en «Bundle JavaScript»: EAS sube el repositorio, y la carpeta
 * hermana no está dentro de él. Metro no puede resolver lo que no se ha subido.
 *
 * Por eso `extraNodeModules` apunta hacia dentro y ya no hace falta
 * `watchFolders`: lo que está bajo la raíz del proyecto Metro ya lo observa.
 */
const projectRoot = __dirname;
const coreRoot = path.resolve(projectRoot, 'packages', 'core', 'src');

const config = getDefaultConfig(projectRoot);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@pulse/core': coreRoot
};

module.exports = config;
