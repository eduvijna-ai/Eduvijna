const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force axios to use browser build (prevents Node "crypto" import)
const originalResolveRequest = config.resolver.resolveRequest;

// Zustand .mjs files use import.meta.env which crashes on web because Metro
// serves bundles as classic scripts (not ES modules). Redirect to CJS builds.
const zustandRoot = path.join(__dirname, 'node_modules', 'zustand');
const zustandCjsMap = {
  'zustand': path.join(zustandRoot, 'index.js'),
  'zustand/vanilla': path.join(zustandRoot, 'vanilla.js'),
  'zustand/middleware': path.join(zustandRoot, 'middleware.js'),
  'zustand/shallow': path.join(zustandRoot, 'shallow.js'),
  'zustand/context': path.join(zustandRoot, 'context.js'),
  'zustand/traditional': path.join(zustandRoot, 'traditional.js'),
  'zustand/react': path.join(zustandRoot, 'react.js'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'axios') {
    return context.resolveRequest(
      context,
      'axios/dist/browser/axios.cjs',
      platform
    );
  }

  // On web, redirect zustand to CJS builds (no import.meta.env)
  if (platform === 'web' && zustandCjsMap[moduleName]) {
    return {
      type: 'sourceFile',
      filePath: zustandCjsMap[moduleName],
    };
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
