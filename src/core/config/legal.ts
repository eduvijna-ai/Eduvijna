/**
 * Legal / privacy entry points.
 *
 * Public pages are owned by Quiz-React (app.eduvijna.com):
 * - /privacy — Privacy Policy
 * - /delete-account — explains how to request deletion by email
 *   (opening the page does not submit a request or delete an account).
 *
 * Helpers only open the browser. They never call deletion APIs, send email,
 * log out, or claim a request was submitted / account deleted.
 */
import { Linking } from 'react-native';

export const PRIVACY_POLICY_URL = 'https://app.eduvijna.com/privacy';
export const ACCOUNT_DELETION_URL = 'https://app.eduvijna.com/delete-account';
export const PRIVACY_CONTACT_EMAIL = 'contactus@eduvijna.com';

async function openExternalUrl(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

/** Opens the published Privacy Policy in the system browser. */
export async function openPrivacyPolicy(): Promise<boolean> {
  return openExternalUrl(PRIVACY_POLICY_URL);
}

/**
 * Opens the published account-deletion request page in the system browser.
 * Does not append personal data to the URL and does not submit a request.
 */
export async function openAccountDeletionPage(): Promise<boolean> {
  return openExternalUrl(ACCOUNT_DELETION_URL);
}

export function privacyPolicyOpenFailureMessage(): string {
  return `Could not open the Privacy Policy. Open ${PRIVACY_POLICY_URL} in a browser, or email ${PRIVACY_CONTACT_EMAIL}.`;
}

export function accountDeletionOpenFailureMessage(): string {
  return `Could not open the deletion-request page. Open ${ACCOUNT_DELETION_URL} in a browser, or email ${PRIVACY_CONTACT_EMAIL} with subject "Account Deletion Request - EduVijna". Opening a page or mail app does not submit a request.`;
}
