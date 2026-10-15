#!/usr/bin/env node
/**
 * Sanitised trace: fixture assignment → list row → attempt → attended-quiz detail.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';
import { FIXTURE } from './lib/founder-fixture.mjs';
// Logic mirrored from teacherAnalyticsHelpers (Node cannot import .ts directly).
function resolveQuizAssignment(rows, key) {
  return (
    rows.find(
      (q) =>
        q.quiz_id === key.quizId &&
        q.classroom_id === key.classroomId &&
        q.session_id === key.sessionId,
    ) ?? null
  );
}

function stringifyLogData(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value.trim() ? value : null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function extractAttemptLogData(attempt) {
  const submission = attempt.submission;
  if (submission?.log_data != null) {
    const log = stringifyLogData(submission.log_data);
    if (log) return { log_data: log, logSource: 'submission' };
  }
  if (attempt.log_data != null) {
    const log = stringifyLogData(attempt.log_data);
    if (log) return { log_data: log, logSource: 'attempt' };
  }
  return { log_data: null, logSource: 'none' };
}

function canOpenSavedAttemptResult(attempt) {
  return attempt.status === 'completed' && attempt.attempt_id != null && attempt.attempt_id !== '';
}

function getQuizAttemptsForView(quiz) {
  let attemptsArray = quiz.attempts;
  if (typeof attemptsArray === 'string') {
    try {
      attemptsArray = JSON.parse(attemptsArray);
    } catch {
      attemptsArray = [];
    }
  }
  const attempts = Array.isArray(attemptsArray) ? attemptsArray : [];
  return attempts.map((attempt) => {
    let derivedStatus = attempt.status;
    if (attempt.status === 'completed') derivedStatus = 'completed';
    else if (quiz.availability_status === 'expired') derivedStatus = 'missed';
    else if (quiz.availability_status === 'active') derivedStatus = 'pending';
    const { log_data, logSource } = extractAttemptLogData(attempt);
    return {
      student_id: attempt.student_id,
      status: attempt.status,
      derivedStatus,
      score: attempt.score ?? null,
      attempt_id: attempt.attempt_id != null ? String(attempt.attempt_id) : undefined,
      log_data,
      logSource,
      canViewSavedResult: canOpenSavedAttemptResult(attempt),
    };
  });
}

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(repoRoot, 'docs', 'evidence', 'analytics-fixture-trace');
const FROM = '2026-08-01';
const TO = '2026-10-13';

function redactAttempt(a) {
  if (!a || typeof a !== 'object') return a;
  const { log_data, submission, ...rest } = a;
  const sub = submission && typeof submission === 'object'
    ? {
        submitted_at: submission.submitted_at,
        submission_id: submission.submission_id,
        has_log_data: submission.log_data != null,
        log_data_bytes:
          typeof submission.log_data === 'string'
            ? submission.log_data.length
            : submission.log_data
              ? JSON.stringify(submission.log_data).length
              : 0,
      }
    : submission;
  return {
    ...rest,
    submission: sub,
    has_top_level_log_data: log_data != null,
  };
}

async function main() {
  const credFile = join(repoRoot, '.dev-api-credentials.local.json');
  if (!existsSync(credFile)) throw new Error('missing_credentials');
  const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
  const instructor = await loginDevApi(
    cfg.accounts.instructor.username,
    cfg.accounts.instructor.password,
  );
  const base = getDevApiBase();
  const listUrl = new URL(`${base}/api/v1/dashboard/quizzes`);
  listUrl.searchParams.set('view_type', 'all');
  listUrl.searchParams.set('limit', '500');
  listUrl.searchParams.set('created_from', FROM);
  listUrl.searchParams.set('created_to', TO);
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${instructor.token}` },
  });
  const listBody = await listRes.json();
  const rows = Array.isArray(listBody?.data) ? listBody.data : [];

  const sameQuizClass = rows.filter(
    (r) =>
      Number(r.quiz_id) === FIXTURE.quizId && r.classroom_id === FIXTURE.classroomId,
  );
  const targetAssignment = rows.find((r) => String(r.session_id) === FIXTURE.sessionId);
  const selected = resolveQuizAssignment(rows, {
    quizId: FIXTURE.quizId,
    classroomId: FIXTURE.classroomId,
    sessionId: FIXTURE.sessionId,
  });

  let attemptsRaw = targetAssignment?.attempts;
  if (typeof attemptsRaw === 'string') {
    try {
      attemptsRaw = JSON.parse(attemptsRaw);
    } catch {
      attemptsRaw = [];
    }
  }
  const studentAttempt = (Array.isArray(attemptsRaw) ? attemptsRaw : []).find(
    (a) => String(a.student_id) === FIXTURE.studentId,
  );

  const normalised = selected ? getQuizAttemptsForView(selected, null) : [];
  const normalisedRow = normalised.find((r) => String(r.student_id) === FIXTURE.studentId);

  const attendedQ = new URLSearchParams({
    student_id: FIXTURE.studentId,
    classroom_id: FIXTURE.classroomId,
    session_id: FIXTURE.sessionId,
    quiz_id: String(FIXTURE.quizId),
  });
  const attendedRes = await fetch(`${base}/api/v1/dashboard/attended-quiz?${attendedQ}`, {
    headers: { Authorization: `Bearer ${instructor.token}` },
  });
  const attendedBody = await attendedRes.json();

  const report = {
    tracedAt: new Date().toISOString(),
    fixture: {
      quizId: FIXTURE.quizId,
      classroomId: FIXTURE.classroomId,
      sessionId: FIXTURE.sessionId,
      studentId: FIXTURE.studentId,
      attemptId: FIXTURE.attemptId,
    },
    listQuery: { created_from: FROM, created_to: TO, view_type: 'all' },
    assignmentsSameQuizClass: sameQuizClass.map((r) => ({
      session_id: r.session_id,
      quiz_name: r.quiz_name,
      availability_status: r.availability_status,
      completed_count: r.completed_count,
      pending_count: r.pending_count,
      attempt_count: Array.isArray(r.attempts)
        ? r.attempts.length
        : typeof r.attempts === 'string'
          ? 'json_string'
          : 0,
    })),
    targetAssignmentFound: Boolean(targetAssignment),
    selectedAssignmentMatchesTarget: selected?.session_id === FIXTURE.sessionId,
    rawStudentAttempt: studentAttempt ? redactAttempt(studentAttempt) : null,
    rawExtract: studentAttempt
      ? {
          ...extractAttemptLogData(studentAttempt),
          log_data_redacted: true,
          log_data_bytes: extractAttemptLogData(studentAttempt).log_data?.length ?? 0,
        }
      : null,
    rawCanOpen: studentAttempt ? canOpenSavedAttemptResult(studentAttempt) : false,
    normalisedRow: normalisedRow
      ? {
          status: normalisedRow.status,
          derivedStatus: normalisedRow.derivedStatus,
          score: normalisedRow.score,
          attempt_id: normalisedRow.attempt_id,
          canViewSavedResult: normalisedRow.canViewSavedResult,
          logSource: normalisedRow.logSource,
        }
      : null,
    attendedQuiz: {
      httpStatus: attendedRes.status,
      attempt_id: attendedBody?.attempt_id ?? attendedBody?.data?.attempt_id,
      score: attendedBody?.score ?? attendedBody?.data?.score,
      status: attendedBody?.status ?? attendedBody?.data?.status,
      has_items: Boolean(
        attendedBody?.items?.length ||
          attendedBody?.data?.items?.length ||
          attendedBody?.questions?.length,
      ),
      log_present: Boolean(
        attendedBody?.log_data ||
          attendedBody?.submission?.log_data ||
          attendedBody?.log_data?.answers,
      ),
    },
  };

  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, 'fixture-479-70-207.json');
  writeFileSync(path, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, path, summary: report }, null, 2));
}

main().catch((e) => {
  console.error(String(e.message || e));
  process.exit(1);
});
