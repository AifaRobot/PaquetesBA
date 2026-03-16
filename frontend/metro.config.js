const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow Metro to resolve .cjs files (needed for ESM-only packages like @tanstack/react-query v5)
config.resolver.sourceExts.push('cjs');

// Force @tanstack/* packages to resolve their CJS build instead of the ESM build
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@tanstack/react-query') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/@tanstack/react-query/build/legacy/index.cjs'),
      type: 'sourceFile',
    };
  }
  if (moduleName === '@tanstack/query-core') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/@tanstack/query-core/build/legacy/index.cjs'),
      type: 'sourceFile',
    };
  }
  // Stub react-native-maps on web (it uses native-only internals)
  if (moduleName === 'react-native-maps' && platform === 'web') {
    return {
      filePath: path.resolve(__dirname, 'src/mocks/react-native-maps.web.tsx'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
