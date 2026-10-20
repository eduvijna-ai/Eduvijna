/**
 * Verify dev-api environment and that configured student credentials map to fixture student 70.
 */
import { readFileSync } from 'node:fs';
import { getDevApiBase, loginDevApi } from './dev-api-auth.mjs';
import { FIXTURE } from './founder-fixture.mjs';
import { resolveDevApiCredentialsPath } from './resolve-dev-api-credentials-path.mjs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export async function verifyEngineeringStudentSession() {
  const apiBase = getDevApiBase();
  const expectedBase =
    process.env.EDUVIJNA_API_BASE || process.env.EDUVIJNA_API_ENV === 'production'
      ? null
      : 'https://dev-api.eduvijna.com';
  if (expectedBase && !apiBase.includes('dev-api.eduvijna.com')) {
    throw new Error(`api_environment_mismatch expected_dev_api got=${apiBase}`);
  }
  const credPath = resolveDevApiCredentialsPath(repoRoot);
  const { accounts } = JSON.parse(readFileSync(credPath, 'utf8'));
  const student = accounts?.student;
  if (!student?.username || !student?.password) {
    throw new Error('missing_student_credentials');
  }
  const session = await loginDevApi(student.username, student.password);
  if (String(session.userId) !== String(FIXTURE.studentId)) {
    throw new Error(
      `student_id_mismatch api_user=${session.userId} expected=${FIXTURE.studentId}`,
    );
  }
  return {
    apiBase,
    studentUserId: session.userId,
    studentUsername: session.username,
    credPathRedacted: '[credentials-file]',
    harnessGitHead: null,
  };
}
