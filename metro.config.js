const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const appEntry = path.join(projectRoot, 'App.tsx');
const reactNativeShim = path.join(projectRoot, 'src', 'vendor', 'react-native.ts');
const reactPackageDir = path.join(projectRoot, 'node_modules', 'react');
const reactDomPackageDir = path.join(projectRoot, 'node_modules', 'react-dom');

function normalizeFsPath(filePath) {
  return path.normalize(filePath).replace(/[\\/]+$/, '').toLowerCase();
}

function isAppSource(originModulePath) {
  if (!originModulePath) return false;
  const origin = normalizeFsPath(originModulePath);
  const root = normalizeFsPath(projectRoot);
  if (!origin.startsWith(root)) return false;
  if (origin.includes(`${path.sep}node_modules${path.sep}`.toLowerCase())) return false;
  return true;
}

function isReactNativeShimOrigin(originModulePath) {
  if (!originModulePath) return false;
  const origin = normalizeFsPath(originModulePath);
  return origin === normalizeFsPath(reactNativeShim)
    || origin.includes(`${path.sep}src${path.sep}vendor${path.sep}react-native.`.toLowerCase());
}

function isForeignReactNativeShimRequest(moduleName) {
  const normalized = String(moduleName).replace(/\\/g, '/');
  if (normalized === './src/vendor/react-native.ts' || normalized === './src/vendor/react-native.js') {
    return true;
  }
  if (!normalized.endsWith('/src/vendor/react-native.ts') && !normalized.endsWith('/src/vendor/react-native.js')) {
    return false;
  }
  if (!path.isAbsolute(moduleName)) return true;
  return normalizeFsPath(moduleName) !== normalizeFsPath(reactNativeShim);
}

function resolveFromProject(specifier) {
  return require.resolve(specifier, { paths: [projectRoot] });
}

function resolveZustandCjs(relativeFile) {
  const pkgJson = resolveFromProject('zustand/package.json');
  const root = path.dirname(pkgJson);
  const filePath = path.join(root, relativeFile);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Metro zustand CJS file missing: ${filePath}`);
  }
  return filePath;
}

const config = getDefaultConfig(projectRoot);
config.projectRoot = projectRoot;
// Expo's default cache is %TEMP%/metro-cache, keyed by project-relative path.
// The primary checkout's babel.config.js rewrites `react-native` to
// <primary>/src/vendor/react-native.ts and that transform is reused for this
// worktree's ThemeContext.tsx. Keep the cache inside this checkout.
config.cacheVersion = projectRoot;
config.cacheStores = [
  new FileStore({ root: path.join(projectRoot, '.expo', 'metro-cache') }),
];
config.watchFolders = [projectRoot];
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [path.join(projectRoot, 'node_modules')];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  react: reactPackageDir,
  'react-dom': reactDomPackageDir,
};

{
  const existingBlockList = config.resolver.blockList;
  const jestWatchBlockList = [
    /.*\/jest-changed-files\/.*/,
    /.*\/node_modules\/jest[^/]*\/node_modules\/.*/,
  ];
  config.resolver.blockList = existingBlockList
    ? [
        ...(Array.isArray(existingBlockList) ? existingBlockList : [existingBlockList]),
        ...jestWatchBlockList,
      ]
    : jestWatchBlockList;
}

const originalResolveRequest = config.resolver.resolveRequest;

const zustandCjsCandidates = [
  ['zustand', 'index.js'],
  ['zustand/vanilla', 'vanilla.js'],
  ['zustand/middleware', 'middleware.js'],
  ['zustand/shallow', 'shallow.js'],
  ['zustand/context', 'context.js'],
  ['zustand/traditional', 'traditional.js'],
  ['zustand/react', 'react.js'],
];

const zustandCjsMap = Object.fromEntries(
  zustandCjsCandidates
    .map(([moduleName, relativeFile]) => {
      try {
        return [moduleName, resolveZustandCjs(relativeFile)];
      } catch {
        return null;
      }
    })
    .filter(Boolean),
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    context.originModulePath &&
    context.originModulePath.includes(`${path.sep}expo${path.sep}AppEntry`) &&
    (moduleName === '../../App' || moduleName === '../../../App')
  ) {
    return { type: 'sourceFile', filePath: appEntry };
  }

  if (
    moduleName === 'react' ||
    moduleName === 'react-dom' ||
    moduleName === 'react/jsx-runtime' ||
    moduleName === 'react/jsx-dev-runtime'
  ) {
    return {
      type: 'sourceFile',
      filePath: require.resolve(moduleName, { paths: [path.join(projectRoot, 'node_modules')] }),
    };
  }

  if (
    fs.existsSync(reactNativeShim) &&
    (
      (
        moduleName === 'react-native' &&
        isAppSource(context.originModulePath) &&
        !isReactNativeShimOrigin(context.originModulePath)
      ) ||
      isForeignReactNativeShimRequest(moduleName)
    )
  ) {
    return { type: 'sourceFile', filePath: reactNativeShim };
  }

  if (moduleName === 'react-native-original') {
    if (platform === 'web') {
      return context.resolveRequest(context, 'react-native-web', platform);
    }
    return {
      type: 'sourceFile',
      filePath: resolveFromProject('react-native/index.js'),
    };
  }

  if (moduleName === 'axios') {
    return context.resolveRequest(context, 'axios/dist/browser/axios.cjs', platform);
  }

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
