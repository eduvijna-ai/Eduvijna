import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDevApiBase, loginDevApi } from './dev-api-auth.mjs';

export const FIXTURE = {
  quizId: 479,
  studentId: '70',
  studentName: 'Aarya',
  attemptId: 207,
  sessionId: 'a6882262-5c50-4cf5-a4a8-dc8786862916',
  classroomId: 'class_4d82c60e',
  expectedScore: 60,
  expectedEvaluatedItems: 10,
  expectedCorrect: 6,
};

export async function loadFixtureLabels() {
  const credFile = join(dirname(fileURLToPath(import.meta.url)), '../../.dev-api-credentials.local.json');
  if (!existsSync(credFile)) throw new Error('missing_credentials');
  const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
  const instructor = await loginDevApi(
    cfg.accounts.instructor.username,
    cfg.accounts.instructor.password,
  );
  const res = await fetch(
    `${getDevApiBase()}/api/v1/dashboard/quizzes?view_type=all&quiz_id=${FIXTURE.quizId}&limit=50`,
    { headers: { Authorization: `Bearer ${instructor.token}` } },
  );
  const data = await res.json();
  const rows = Array.isArray(data?.data) ? data.data : [];
  const row = rows.find(
    (r) =>
      Number(r.quiz_id) === FIXTURE.quizId &&
      String(r.session_id) === FIXTURE.sessionId,
  );
  const quizTitle = row?.quiz_title ?? row?.title ?? row?.quiz_name ?? `Quiz ${FIXTURE.quizId}`;
  const searchToken = String(quizTitle).slice(0, 14);
  return {
    quizTitle,
    searchToken,
    classLabel: row?.class_name ?? row?.classroom_name ?? null,
    availability: row?.availability_status ?? null,
  };
}
