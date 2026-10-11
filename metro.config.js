const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const appEntry = path.join(projectRoot, 'App.tsx');

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
config.watchFolders = [projectRoot];
config.resolver.nodeModulesPaths = [path.join(projectRoot, 'node_modules')];

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

const zustandCjsMap = {
  zustand: resolveZustandCjs('index.js'),
  'zustand/vanilla': resolveZustandCjs('vanilla.js'),
  'zustand/middleware': resolveZustandCjs('middleware.js'),
  'zustand/shallow': resolveZustandCjs('shallow.js'),
  'zustand/context': resolveZustandCjs('context.js'),
  'zustand/traditional': resolveZustandCjs('traditional.js'),
  'zustand/react': resolveZustandCjs('react.js'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    context.originModulePath &&
    context.originModulePath.includes(`${path.sep}expo${path.sep}AppEntry`) &&
    (moduleName === '../../App' || moduleName === '../../../App')
  ) {
    return { type: 'sourceFile', filePath: appEntry };
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
