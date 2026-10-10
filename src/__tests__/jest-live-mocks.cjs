const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

const apiBase =
  process.env.EDUVIJNA_API_BASE?.replace(/\/$/, '') || 'https://dev-api.eduvijna.com';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { API_BASE_URL: apiBase } },
  },
}));

const checkpointDir = process.env.EDUVIJNA_LIVE_CHECKPOINT_DIR;
const storageFile = checkpointDir ? join(checkpointDir, 'async-storage.json') : null;
let fileBackedStore = {};

if (storageFile && existsSync(storageFile)) {
  try {
    fileBackedStore = JSON.parse(readFileSync(storageFile, 'utf8'));
  } catch {
    fileBackedStore = {};
  }
}

function persistFileStore() {
  if (!storageFile) return;
  mkdirSync(join(storageFile, '..'), { recursive: true });
  writeFileSync(storageFile, JSON.stringify(fileBackedStore, null, 2));
}

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key) => fileBackedStore[key] ?? null),
  setItem: jest.fn(async (key, value) => {
    fileBackedStore[key] = value;
    persistFileStore();
  }),
  removeItem: jest.fn(async (key) => {
    delete fileBackedStore[key];
    persistFileStore();
  }),
}));
