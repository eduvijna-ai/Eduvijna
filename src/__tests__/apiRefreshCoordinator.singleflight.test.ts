import type { AxiosInstance } from 'axios';
import {
  bumpAuthSessionEpoch,
  getAuthSessionEpoch,
  refreshAccessToken,
} from '../core/api/apiRefreshCoordinator';

jest.mock('../core/services/tokenStorage', () => ({
  getRefreshToken: jest.fn().mockResolvedValue('refresh-token'),
  storeAuthTokens: jest.fn().mockResolvedValue(undefined),
  persistCredentialEpoch: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../core/store/user.store', () => ({
  useUserStore: {
    getState: () => ({
      setTokens: jest.fn(),
    }),
  },
}));

describe('refreshAccessToken single-flight', () => {
  it('coalesces concurrent refresh for the same session', async () => {
    bumpAuthSessionEpoch();
    const epoch = getAuthSessionEpoch();

    let resolvePost!: (value: unknown) => void;
    const postPromise = new Promise((resolve) => {
      resolvePost = resolve;
    });

    const refreshClient = {
      post: jest.fn().mockReturnValue(postPromise),
    } as unknown as AxiosInstance;

    const p1 = refreshAccessToken(refreshClient, epoch);
    const p2 = refreshAccessToken(refreshClient, epoch);

    await Promise.resolve();
    expect(refreshClient.post).toHaveBeenCalledTimes(1);

    resolvePost({
      data: { access_token: 'access', refresh_token: 'refresh' },
    });

    const [o1, o2] = await Promise.all([p1, p2]);
    expect(o1.kind).toBe('success');
    expect(o2.kind).toBe('success');
  });
});
