import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('dev-api-profile-notification-verify script', () => {
  it('requires three roles and restoration markers', () => {
    const script = readFileSync(
      join(process.cwd(), 'scripts', 'dev-api-profile-notification-verify.mjs'),
      'utf8',
    );
    expect(script).toContain("REQUIRED_ACCOUNTS = ['admin', 'instructor', 'student']");
    expect(script).toContain('abortedBeforeMutation');
    expect(script).toContain('profile_restore');
    expect(script).toContain('notificationFailed');
  });
});
