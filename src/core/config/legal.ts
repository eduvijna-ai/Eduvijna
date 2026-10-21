/**
 * Legal / privacy entry points (Google Play Data safety remediation).
 *
 * PRIVACY_POLICY_URL is the published Quiz-React route `/privacy`
 * (src/App.tsx -> src/components/PrivacyPolicy.tsx) served from the
 * production web app origin. Verified live (HTTP 200) on 2026-10-21.
 * Do NOT point this at eduvijna.com/privacy — the apex returns 404.
 *
 * There is NO self-service account-deletion API today (see
 * docs/release/API_CHANGES_FOR_FOUNDER.md). The only published deletion
 * process is the Privacy Policy §6.3 email route to contactus@eduvijna.com.
 * These helpers only open the user's mail client / browser; they never
 * claim a request was submitted or data was deleted.
 */
import { Linking } from 'react-native';

export const PRIVACY_POLICY_URL = 'https://app.eduvijna.com/privacy';
export const PRIVACY_CONTACT_EMAIL = 'contactus@eduvijna.com';

export async function openPrivacyPolicy(): Promise<boolean> {
  try {
    const can = await Linking.canOpenURL(PRIVACY_POLICY_URL);
    if (!can) return false;
    await Linking.openURL(PRIVACY_POLICY_URL);
    return true;
  } catch {
    return false;
  }
}

export function buildDeletionRequestMailto(account?: {
  email?: string;
  username?: string;
  id?: string | number;
}): string {
  const lines = [
    'I request deletion of my EduVijna account and associated personal data.',
    '',
    account?.email ? `Account email: ${account.email}` : 'Account email: ',
    account?.username ? `Username: ${account.username}` : 'Username: ',
    account?.id != null && account.id !== '' ? `Account ID: ${account.id}` : undefined,
    '',
    'Please confirm receipt and the deletion timeline.',
  ].filter((l): l is string => l !== undefined);
  const subject = encodeURIComponent('Account Deletion Request');
  const body = encodeURIComponent(lines.join('\n'));
  return `mailto:${PRIVACY_CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

/** Opens the mail client with a pre-filled deletion request. Returns false if no mail client. Never sends mail itself. */
export async function openDeletionRequestEmail(account?: {
  email?: string;
  username?: string;
  id?: string | number;
}): Promise<boolean> {
  const url = buildDeletionRequestMailto(account);
  try {
    const can = await Linking.canOpenURL(url);
    if (!can) return false;
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
