const path = require('path');

module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@core': './src/core',
            '@platforms': './src/platforms',
            '@mobile': './src/platforms/mobile',
            '@web': './src/platforms/web',
            '@context': './src/context',
            '@theme': './src/theme',
            'react-native-original': 'react-native',
          },
          // Only shim exact `react-native` imports from app code (not node_modules / subpaths).
          resolvePath(sourcePath, currentFile) {
            if (sourcePath !== 'react-native') return undefined;
            if (currentFile.includes('node_modules')) return undefined;
            if (currentFile.includes(`${path.sep}src${path.sep}vendor${path.sep}react-native`)) {
              return undefined;
            }
            const isAppSource =
              currentFile.includes(`${path.sep}src${path.sep}`) ||
              currentFile.endsWith(`${path.sep}App.tsx`) ||
              currentFile.endsWith(`${path.sep}App.js`);
            if (!isAppSource) return undefined;
            return path.resolve(__dirname, 'src/vendor/react-native.ts');
          },
        },
      ],
    ],
  };
};
