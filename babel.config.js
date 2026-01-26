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
          },
        },
      ],
    ],
  };
};
