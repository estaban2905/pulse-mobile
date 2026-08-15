const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

/**
 * Metro, enseñado a mirar fuera del proyecto.
 *
 * `@pulse/core` es una carpeta hermana, no un paquete instalado. Por defecto
 * Metro solo observa lo que hay bajo la raíz del proyecto, así que hacen falta
 * dos cosas y las dos por motivos distintos:
 *
 * - `watchFolders` para que compile lo de fuera y lo recargue al cambiar. Sin
 *   esto, un cambio en la lógica compartida no aparece hasta reiniciar Metro.
 * - `extraNodeModules` para que `import '@pulse/core'` encuentre la carpeta.
 *   Sin esto el error es «Unable to resolve module», sin más pistas.
 *
 * `nodeModulesPaths` queda fijado a propósito: al ampliar `watchFolders`, Metro
 * también empieza a buscar dependencias hacia arriba, y sin esta línea podría
 * resolver dos copias de React —una por proyecto— que en tiempo de ejecución se
 * manifiesta como «Invalid hook call» y no como un problema de resolución.
 */
const projectRoot = __dirname;
const coreRoot = path.resolve(projectRoot, '..', 'pulse-core');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [coreRoot];

config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@pulse/core': path.resolve(coreRoot, 'src')
};

module.exports = config;
