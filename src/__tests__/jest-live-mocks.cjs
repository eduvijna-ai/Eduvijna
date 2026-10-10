jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { API_BASE_URL: 'https://dev-api.eduvijna.com' } },
  },
}));
