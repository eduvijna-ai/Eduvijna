import { resolveWebShellScreen } from '../core/utils/webShellRouteAdapter';

describe('webShellRouteAdapter', () => {
  it('maps nested Main destinations to web shell screens', () => {
    expect(resolveWebShellScreen('Main/Assessments')).toBe('assessments');
    expect(resolveWebShellScreen('Assessments')).toBe('assessments');
  });
});
