import { buildDeletionRequestMailto, PRIVACY_POLICY_URL, PRIVACY_CONTACT_EMAIL } from '../core/config/legal';

describe('legal links (Play Data safety)', () => {
  it('uses the published app.eduvijna.com privacy URL, not the 404 apex', () => {
    expect(PRIVACY_POLICY_URL).toBe('https://app.eduvijna.com/privacy');
  });
  it('deletion mailto targets the published privacy contact and never claims submission', () => {
    const url = buildDeletionRequestMailto({ email: 'a@example.com', username: 'alice', id: 42 });
    expect(url.startsWith(`mailto:${PRIVACY_CONTACT_EMAIL}?`)).toBe(true);
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('Account Deletion Request');
    expect(decoded).toContain('a@example.com');
    expect(decoded).toContain('Account ID: 42');
    expect(decoded).not.toMatch(/submitted|deleted successfully/i);
  });
  it('works without account details', () => {
    expect(decodeURIComponent(buildDeletionRequestMailto())).toContain('Account email:');
  });
});
