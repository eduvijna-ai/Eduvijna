import {
  TeacherDashboardAuthenticationError,
  fetchTeacherDashboardSummary,
} from '../core/services/dashboardApi';
import * as TokenStorage from '../core/services/tokenStorage';

jest.mock('../core/services/cacheService', () => {
  const actual = jest.requireActual('../core/services/cacheService');
  return {
    ...actual,
    cachedApiCall: async (apiFunction: () => Promise<unknown>) => apiFunction(),
  };
});

jest.mock('../core/services/tokenStorage', () => ({
  getAccessToken: jest.fn(),
  clearAuthData: jest.fn().mockResolvedValue(undefined),
}));

describe('fetchTeacherDashboardSummary authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects without caching when access token is missing', async () => {
    (TokenStorage.getAccessToken as jest.Mock).mockResolvedValue(null);

    await expect(fetchTeacherDashboardSummary()).rejects.toBeInstanceOf(
      TeacherDashboardAuthenticationError,
    );
  });
});
