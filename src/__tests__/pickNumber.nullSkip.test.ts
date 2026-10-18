import { pickNumber } from '../erp_schools/utils/apiHelpers';

describe('pickNumber null skip', () => {
  it('skips null/empty so period defaults reach the fallback', () => {
    expect(pickNumber(null, undefined, '', 4)).toBe(4);
    expect(pickNumber(null, 1)).toBe(1);
    expect(pickNumber(3, 1)).toBe(3);
  });
});
