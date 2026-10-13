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

/** Matches Journey B / trace script analytics date filter. */
export const ANALYTICS_FIXTURE_DATE_RANGE = {
  created_from: '2026-08-01',
  created_to: '2026-10-13',
};

export const ANALYTICS_ITEMS_PER_PAGE = 10;

function quizRowMember(row, index) {
  return {
    index,
    quizId: Number(row.quiz_id),
    sessionId: String(row.session_id),
    createdAt: row.created_at ?? row.createdAt ?? null,
  };
}

/** Quiz list page (1-based) where the fixture assignment appears in class drill. */
export async function loadFixtureAnalyticsQuizPage() {
  const credFile = join(dirname(fileURLToPath(import.meta.url)), '../../.dev-api-credentials.local.json');
  if (!existsSync(credFile)) throw new Error('missing_credentials');
  const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
  const instructor = await loginDevApi(
    cfg.accounts.instructor.username,
    cfg.accounts.instructor.password,
  );
  const q = new URLSearchParams({
    view_type: 'all',
    limit: '500',
    offset: '0',
    created_from: ANALYTICS_FIXTURE_DATE_RANGE.created_from,
    created_to: ANALYTICS_FIXTURE_DATE_RANGE.created_to,
  });
  const res = await fetch(`${getDevApiBase()}/api/v1/dashboard/quizzes?${q.toString()}`, {
    headers: { Authorization: `Bearer ${instructor.token}` },
  });
  const data = await res.json();
  const rows = Array.isArray(data?.data) ? data.data : [];
  const classRows = rows.filter((r) => String(r.classroom_id) === FIXTURE.classroomId);
  const index = classRows.findIndex(
    (r) =>
      Number(r.quiz_id) === FIXTURE.quizId && String(r.session_id) === FIXTURE.sessionId,
  );
  const total = classRows.length;
  const totalPages = Math.max(1, Math.ceil(total / ANALYTICS_ITEMS_PER_PAGE));
  const page = index >= 0 ? Math.floor(index / ANALYTICS_ITEMS_PER_PAGE) + 1 : 1;
  const fixtureRow = index >= 0 ? classRows[index] : null;
  const pageStart = Math.max(0, (page - 1) * ANALYTICS_ITEMS_PER_PAGE);
  const pageEnd = pageStart + ANALYTICS_ITEMS_PER_PAGE;
  const pageMembers = classRows.slice(pageStart, pageEnd).map((row, offset) =>
    quizRowMember(row, pageStart + offset),
  );
  const windowStart = index >= 0 ? Math.max(0, index - 3) : 0;
  const windowEnd = index >= 0 ? Math.min(classRows.length, index + 4) : 0;
  const indexWindow =
    index >= 0 ? classRows.slice(windowStart, windowEnd).map((row, offset) => quizRowMember(row, windowStart + offset)) : [];
  return {
    index,
    page,
    total,
    totalPages,
    found: index >= 0,
    fixture: fixtureRow
      ? {
          quizId: FIXTURE.quizId,
          sessionId: FIXTURE.sessionId,
          created_at: fixtureRow.created_at ?? fixtureRow.createdAt ?? null,
          index,
          page,
        }
      : null,
    pageMembers,
    indexWindow,
    apiHintPage: page,
    apiHintIndex: index >= 0 ? index : null,
  };
}

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
  const classLabel = row?.class_name ?? row?.classroom_name ?? null;
  const openStudentsLabel = classLabel
    ? `View students for ${quizTitle} in ${classLabel}`
    : `View students for ${quizTitle}`;
  return {
    quizTitle,
    searchToken,
    classLabel,
    availability: row?.availability_status ?? null,
    openStudentsLabel,
  };
}

/** First saved question + answer snippets for journey result verification (not shown in UI). */
export async function loadFixtureResultEvidence(instructorToken) {
  const q = new URLSearchParams({
    student_id: FIXTURE.studentId,
    classroom_id: FIXTURE.classroomId,
    session_id: FIXTURE.sessionId,
    quiz_id: String(FIXTURE.quizId),
  });
  const res = await fetch(
    `${getDevApiBase()}/api/v1/dashboard/attended-quiz?${q.toString()}`,
    { headers: { Authorization: `Bearer ${instructorToken}` } },
  );
  const body = await res.json();
  const items = body?.items ?? body?.data?.items ?? body?.questions ?? [];
  const first = Array.isArray(items) ? items[0] : null;
  const question =
    first?.question ?? first?.question_text ?? first?.text ?? body?.worksheet_data?.questions?.[0]?.question;
  const answers = body?.log_data?.answers ?? body?.submission?.log_data?.answers;
  let userAnswer = '';
  if (Array.isArray(answers) && answers[0]) {
    userAnswer = answers[0].userAnswer ?? answers[0].answer ?? '';
  }
  const snippet = typeof question === 'string' ? question.replace(/\s+/g, ' ').trim().slice(0, 48) : '';
  const answerSnippet =
    typeof userAnswer === 'string' ? userAnswer.replace(/\s+/g, ' ').trim().slice(0, 32) : '';
  return {
    firstQuestionSnippet: snippet,
    firstAnswerSnippet: answerSnippet,
    identityLabel: `quiz-${FIXTURE.quizId} attempt-${FIXTURE.attemptId} student-${FIXTURE.studentId}`,
  };
}

export async function loadFixtureResultEvidenceFromCredentials() {
  const credFile = join(dirname(fileURLToPath(import.meta.url)), '../../.dev-api-credentials.local.json');
  if (!existsSync(credFile)) throw new Error('missing_credentials');
  const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
  const instructor = await loginDevApi(
    cfg.accounts.instructor.username,
    cfg.accounts.instructor.password,
  );
  return loadFixtureResultEvidence(instructor.token);
}
