import '@testing-library/jest-native/extend-expect';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const checkpointDir = process.env.EDUVIJNA_LIVE_CHECKPOINT_DIR;
const storageFile = checkpointDir ? join(checkpointDir, 'async-storage.json') : null;
let fileBackedStore: Record<string, string> = {};

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

jest.mock('../core/services/cacheService', () => ({
  cachedApiCall: async (fn: () => Promise<unknown>) => fn(),
  CACHE_TTL: {},
  clearCacheEntry: jest.fn().mockResolvedValue(undefined),
  initializeCache: jest.fn().mockResolvedValue(undefined),
  closeCache: jest.fn().mockResolvedValue(undefined),
  isTransientNetworkError: () => false,
}));

jest.mock('../core/services/tokenStorage', () => ({
  getAccessToken: jest.fn().mockResolvedValue(null),
  storeAccessToken: jest.fn().mockResolvedValue(undefined),
  clearAuthData: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => fileBackedStore[key] ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    fileBackedStore[key] = value;
    persistFileStore();
  }),
  removeItem: jest.fn(async (key: string) => {
    delete fileBackedStore[key];
    persistFileStore();
  }),
}));

jest.mock('../core/services/studentQuizCacheInvalidation', () => ({
  invalidateStudentQuizCaches: jest.fn().mockResolvedValue(undefined),
}));
