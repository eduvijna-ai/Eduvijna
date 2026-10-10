import '@testing-library/jest-native/extend-expect';

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

jest.mock('../core/services/studentQuizCacheInvalidation', () => ({
  invalidateStudentQuizCaches: jest.fn().mockResolvedValue(undefined),
}));
