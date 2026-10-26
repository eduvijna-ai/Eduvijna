import fs from 'fs';
import path from 'path';
import { Linking } from 'react-native';
import {
  ACCOUNT_DELETION_URL,
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_POLICY_URL,
  accountDeletionOpenFailureMessage,
  openAccountDeletionPage,
  openPrivacyPolicy,
  privacyPolicyOpenFailureMessage,
} from '../core/config/legal';

jest.mock('react-native', () => ({
  Linking: {
    openURL: jest.fn(),
    canOpenURL: jest.fn(),
  },
}));

const openURL = Linking.openURL as jest.MockedFunction<typeof Linking.openURL>;

describe('legal links (browser destinations)', () => {
  beforeEach(() => {
    openURL.mockReset();
    openURL.mockResolvedValue(undefined as never);
  });

  it('uses the published privacy and deletion URLs with no personal data', () => {
    expect(PRIVACY_POLICY_URL).toBe('https://app.eduvijna.com/privacy');
    expect(ACCOUNT_DELETION_URL).toBe('https://app.eduvijna.com/delete-account');
    expect(ACCOUNT_DELETION_URL).not.toMatch(/[?&](email|token|user|id)=/i);
    expect(PRIVACY_POLICY_URL).not.toMatch(/[?&]/);
  });

  it('openPrivacyPolicy opens the privacy URL', async () => {
    await expect(openPrivacyPolicy()).resolves.toBe(true);
    expect(openURL).toHaveBeenCalledTimes(1);
    expect(openURL).toHaveBeenCalledWith('https://app.eduvijna.com/privacy');
  });

  it('openAccountDeletionPage opens the deletion URL without mailto or API side effects', async () => {
    await expect(openAccountDeletionPage()).resolves.toBe(true);
    expect(openURL).toHaveBeenCalledTimes(1);
    expect(openURL).toHaveBeenCalledWith('https://app.eduvijna.com/delete-account');
    const opened = String(openURL.mock.calls[0][0]);
    expect(opened.startsWith('mailto:')).toBe(false);
  });

  it('returns false when Linking.openURL fails', async () => {
    openURL.mockRejectedValueOnce(new Error('no browser'));
    await expect(openPrivacyPolicy()).resolves.toBe(false);
    openURL.mockRejectedValueOnce(new Error('no browser'));
    await expect(openAccountDeletionPage()).resolves.toBe(false);
  });

  it('failure messages include the webpage URL and support email, without success claims', () => {
    const privacyMsg = privacyPolicyOpenFailureMessage();
    const deletionMsg = accountDeletionOpenFailureMessage();
    expect(privacyMsg).toContain(PRIVACY_POLICY_URL);
    expect(privacyMsg).toContain(PRIVACY_CONTACT_EMAIL);
    expect(deletionMsg).toContain(ACCOUNT_DELETION_URL);
    expect(deletionMsg).toContain(PRIVACY_CONTACT_EMAIL);
    expect(deletionMsg).not.toMatch(/submitted|account deleted|deleted successfully/i);
  });

  it('Profile and role settings wire browser helpers, not mailto or deletion APIs', () => {
    const roots = [
      'platforms/mobile/screens/Profile.tsx',
      'erp_schools/screens/teacher/settings/SettingsScreen.tsx',
      'erp_schools/screens/admin/settings/SettingsScreen.tsx',
      'erp_schools/screens/student/settings/SettingsScreen.tsx',
    ];
    for (const rel of roots) {
      const src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
      expect(src).toContain('openPrivacyPolicy');
      expect(src).toContain('openAccountDeletionPage');
      expect(src).not.toContain('openDeletionRequestEmail');
      expect(src).not.toContain('buildDeletionRequestMailto');
      expect(src).not.toMatch(/\/api\/.*delet/i);
      expect(src).not.toMatch(/mailto:/);
    }
  });
});
