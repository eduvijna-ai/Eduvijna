const base = require('./package.json').jest;

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  testMatch: ['**/*.dev-api.live.test.ts'],
  setupFiles: ['<rootDir>/src/__tests__/jest-live-mocks.cjs'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup-live-api.ts'],
};
