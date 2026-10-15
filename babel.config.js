module.exports = function(api) {
  // Key the cache on this checkout. A shared Metro transform cache must not
  // reuse a sibling checkout's config result.
  api.cache.using(() => __dirname);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          cwd: __dirname,
          root: ['./'],
          alias: {
            '@core': './src/core',
            '@platforms': './src/platforms',
            '@mobile': './src/platforms/mobile',
            '@web': './src/platforms/web',
            '@context': './src/context',
            '@theme': './src/theme',
          },
        },
      ],
    ],
  };
};
