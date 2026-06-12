const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Prevent Metro's FallbackWatcher from watching jest packages on Windows.
// When npm installs jest-changed-files and similar packages with deeply-nested
// node_modules, Windows creates long-path junctions (\\?\ prefix). If a
// subsequent npm install removes those nested dirs, stale fs.watch events
// produce mangled paths (e.g. "...\type\?\D:\...\type") that crash Metro.
// Blocking these packages stops Metro from watching them entirely.
{
  const existingBlockList = config.resolver.blockList;
  const jestWatchBlockList = [
    // Block the entire jest-changed-files package (not needed in the app bundle)
    /.*\/jest-changed-files\/.*/,
    // Block nested node_modules inside any jest-* package (long-path junctions)
    /.*\/node_modules\/jest[^/]*\/node_modules\/.*/,
  ];
  config.resolver.blockList = existingBlockList
    ? [
        ...(Array.isArray(existingBlockList)
          ? existingBlockList
          : [existingBlockList]),
        ...jestWatchBlockList,
      ]
    : jestWatchBlockList;
}

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

const reactNativeRoot = path.join(__dirname, 'node_modules', 'react-native');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Shim target imports the real package under a different name (avoids circular alias).
  // On web, must use react-native-web — native react-native pulls in Fabric internals.
  if (moduleName === 'react-native-original') {
    if (platform === 'web') {
      return context.resolveRequest(context, 'react-native-web', platform);
    }
    return {
      type: 'sourceFile',
      filePath: path.join(reactNativeRoot, 'index.js'),
    };
  }

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
