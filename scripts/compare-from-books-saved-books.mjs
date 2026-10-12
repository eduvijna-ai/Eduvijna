/**
 * Live saved-books From Books capture against dev-api.
 * Uses the same query/payload contracts as Quiz-React ContentService (21f9a1d).
 *
 * Credentials: EDUVIJNA_DEV_USERNAME / EDUVIJNA_DEV_PASSWORD
 * or gitignored .dev-api-credentials.local.json
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadCreds() {
  if (process.env.EDUVIJNA_DEV_USERNAME && process.env.EDUVIJNA_DEV_PASSWORD) {
    return {
      username: process.env.EDUVIJNA_DEV_USERNAME,
      password: process.env.EDUVIJNA_DEV_PASSWORD,
    };
  }
  const local = join(repoRoot, '.dev-api-credentials.local.json');
  const cfg = JSON.parse(readFileSync(local, 'utf8'));
  return cfg.accounts.instructor;
}

function items(data) {
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data)) return data;
  return [];
}

function summarizeItems(rows) {
  return (rows || []).slice(0, 20).map((row) => ({
    id: row.id,
    label: row.label,
  }));
}

async function apiGet(token, path) {
  const res = await fetch(`${getDevApiBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { _nonJson: text.slice(0, 120) };
  }
  return { status: res.status, path, data };
}

async function apiPost(token, path, body, headers = {}) {
  const res = await fetch(`${getDevApiBase()}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { _nonJson: text.slice(0, 120) };
  }
  return { status: res.status, path, data };
}

function sanitizeGenerateResult(data) {
  if (!data || typeof data !== 'object') return data;
  const quiz = Array.isArray(data.quiz)
    ? data.quiz.map((q, i) => ({
        index: i,
        questionChars: String(q.question || '').length,
        optionCount: Array.isArray(q.options) ? q.options.length : 0,
        hasCorrect: Boolean(q.correctAnswer || q.answer),
        verification_level: q.verification_level || null,
      }))
    : undefined;
  return {
    success: data.success,
    generation_type: data.generation_type,
    accepted: data.accepted,
    job_id: data.job_id ? 'present' : undefined,
    status: data.status,
    quizCount: quiz?.length ?? 0,
    quiz,
    assessment_intelligence: data.assessment_intelligence
      ? {
          alignment_status: data.assessment_intelligence.alignment_status,
          unit: data.assessment_intelligence.selected_unit?.title,
          warnings: (data.assessment_intelligence.warnings || []).map((w) => w.code),
        }
      : null,
    message: data.message ? 'present' : undefined,
  };
}

async function maybePoll(token, postResult, schoolId) {
  const accepted = postResult?.data;
  if (!accepted?.accepted || !accepted.job_id) return postResult;
  const jobId = accepted.job_id;
  const statusPath = `/api/v1/content/saved-books/generation-jobs/${encodeURIComponent(jobId)}?school_id=${schoolId}`;
  const started = Date.now();
  let delay = Math.min(accepted.poll_after_ms || 1000, 5000);
  await new Promise((r) => setTimeout(r, delay));
  while (Date.now() - started < 180000) {
    const status = await apiGet(token, statusPath);
    const row = status.data || {};
    const normalized = String(row.status || '').toLowerCase();
    if (normalized === 'persisted') {
      return { ...status, data: row.result || row.result_payload || row };
    }
    if (normalized === 'failed' || normalized === 'cancelled') {
      return status;
    }
    delay = Math.min(Math.max(row.poll_after_ms || delay * 2, 1000), 5000);
    await new Promise((r) => setTimeout(r, delay));
  }
  return { status: 0, path: statusPath, data: { timeout: true } };
}

async function main() {
  const creds = loadCreds();
  const session = await loginDevApi(creds.username, creds.password);
  const me = await apiGet(session.token, '/api/v1/auth/profile');
  const schoolId = Number(me.data?.school_id ?? me.data?.user?.school_id) || undefined;

  const boardsPath = schoolId
    ? `/api/v1/content/saved-books/boards?school_id=${schoolId}`
    : '/api/v1/content/saved-books/boards';
  const boards = await apiGet(session.token, boardsPath);
  const boardRows = items(boards.data);
  const board = boardRows.find((b) => /cbse/i.test(b.label)) || boardRows[0];

  const classesPath = `/api/v1/content/saved-books/classes?board_id=${board?.id}${
    schoolId ? `&school_id=${schoolId}` : ''
  }`;
  const classes = board ? await apiGet(session.token, classesPath) : { status: 0, path: classesPath, data: {} };
  const classRows = items(classes.data);
  const classItem =
    classRows.find((c) => /class\s*(10|x)\b/i.test(c.label)) ||
    classRows.find((c) => /class\s*(9|ix)\b/i.test(c.label)) ||
    classRows[0];

  const subjectsPath = `/api/v1/content/saved-books/subjects?board_id=${board?.id}&class_id=${classItem?.id}${
    schoolId ? `&school_id=${schoolId}` : ''
  }`;
  const subjects = classItem
    ? await apiGet(session.token, subjectsPath)
    : { status: 0, path: subjectsPath, data: {} };
  const subjectRows = items(subjects.data);
  const subject =
    subjectRows.find((s) => /math/i.test(s.label)) || subjectRows[0];

  const topicsPath = `/api/v1/content/saved-books/topics?board_id=${board?.id}&class_id=${classItem?.id}&subject_id=${subject?.id}${
    schoolId ? `&school_id=${schoolId}` : ''
  }`;
  const topics = subject
    ? await apiGet(session.token, topicsPath)
    : { status: 0, path: topicsPath, data: {} };
  const topicRows = items(topics.data);
  const topic = topicRows[0];

  const subtopicsPath = `/api/v1/content/saved-books/subtopics?board_id=${board?.id}&class_id=${classItem?.id}&subject_id=${subject?.id}&topics=${encodeURIComponent(topic?.label || '')}${
    schoolId ? `&school_id=${schoolId}` : ''
  }`;
  const subtopics = topic
    ? await apiGet(session.token, subtopicsPath)
    : { status: 0, path: subtopicsPath, data: {} };

  const catalog = await apiGet(session.token, '/api/v1/curriculum/catalog?current_only=true');
  const contexts = catalog.data?.contexts || [];
  const bound = contexts.find(
    (ctx) =>
      /cbse/i.test(ctx.board?.label || ctx.board?.code) &&
      String(ctx.grade?.code) === '10' &&
      /math/i.test(ctx.subject?.label || ctx.subject?.code),
  ) || contexts.find((ctx) => String(ctx.grade?.code) === '10') || contexts[0];

  let units = { status: 0, path: '', data: { units: [] } };
  let refinements = { status: 0, path: '', data: {} };
  if (bound) {
    const unitQuery = new URLSearchParams({
      board_code: bound.board.code,
      grade_code: bound.grade.code,
      subject_code: bound.subject.code,
      version_label: bound.version_label,
    });
    units = await apiGet(session.token, `/api/v1/curriculum/resolve-by-codes?${unitQuery}`);
    const unit = (units.data?.units || [])[0];
    if (unit) {
      const refQuery = new URLSearchParams({
        board_code: bound.board.code,
        grade_code: bound.grade.code,
        subject_code: bound.subject.code,
        version_label: bound.version_label,
        unit_code: unit.unit_code,
      });
      if (schoolId) refQuery.set('school_id', String(schoolId));
      refinements = await apiGet(
        session.token,
        `/api/v1/content/saved-books/curriculum-refinements?${refQuery}`,
      );
    }
  }

  const katex = ['mathematics', 'math', 'physics', 'chemistry'].includes(
    String(subject?.label || '').trim().toLowerCase(),
  )
    ? 'katex'
    : 'markdown';

  const offPayload = board && classItem && subject && topic
    ? {
        generation_type: 'assessment',
        board_id: board.id,
        board_name: board.label,
        class_id: classItem.id,
        class_name: classItem.label,
        subject_id: subject.id,
        subject_name: subject.label,
        topics: [topic.label],
        subtopics: [],
        language: 'en',
        difficulty: 'medium',
        num_questions: 5,
        additional_instructions: 'summary',
        school_id: schoolId,
        format_type: katex,
      }
    : null;

  const unit = (units.data?.units || [])[0];
  const onPayload = bound && unit
    ? {
        generation_type: 'assessment',
        topics: [],
        subtopics: [],
        language: 'en',
        difficulty: 'medium',
        num_questions: 5,
        school_id: schoolId,
        curriculum_context: {
          board_code: bound.board.code,
          grade_code: bound.grade.code,
          subject_code: bound.subject.code,
          version_label: bound.version_label,
          unit_code: unit.unit_code,
        },
      }
    : null;

  const generateOff = process.env.FROM_BOOKS_SKIP_GENERATE
    ? { skipped: true }
    : offPayload
      ? await maybePoll(
          session.token,
          await apiPost(session.token, '/api/v1/content/saved-books/generate', offPayload, {
            'Idempotency-Key': crypto.randomUUID(),
          }),
          schoolId,
        )
      : { skipped: 'missing_off_selection' };

  const generateOn = process.env.FROM_BOOKS_SKIP_GENERATE
    ? { skipped: true }
    : onPayload
      ? await maybePoll(
          session.token,
          await apiPost(session.token, '/api/v1/content/saved-books/generate', onPayload, {
            'Idempotency-Key': crypto.randomUUID(),
          }),
          schoolId,
        )
      : { skipped: 'missing_on_selection' };

  const report = {
    capturedAt: new Date().toISOString(),
    apiBase: getDevApiBase(),
    webRevision: 'Quiz-React origin/main 21f9a1d (PR #326 class-10 rebind)',
    account: { username: creds.username, userId: session.userId, role: session.role, schoolId },
    dropdowns: {
      boards: { status: boards.status, path: boards.path, items: summarizeItems(boardRows) },
      classes: { status: classes.status, path: classes.path, items: summarizeItems(classRows) },
      subjects: { status: subjects.status, path: subjects.path, items: summarizeItems(subjectRows) },
      topics: { status: topics.status, path: topics.path, items: summarizeItems(topicRows) },
      subtopics: {
        status: subtopics.status,
        path: subtopics.path,
        items: summarizeItems(items(subtopics.data)),
      },
    },
    alignmentOn: {
      catalogStatus: catalog.status,
      bound,
      unit: unit ? { unit_code: unit.unit_code, title: unit.title } : null,
      refinements: {
        status: refinements.status,
        path: refinements.path,
        topicCount: (refinements.data?.topics || []).length,
        subtopicCount: (refinements.data?.subtopics || []).length,
      },
    },
    payloads: { off: offPayload, on: onPayload },
    generate: {
      off: sanitizeGenerateResult(generateOff.data || generateOff),
      on: sanitizeGenerateResult(generateOn.data || generateOn),
      offHttp: generateOff.status,
      onHttp: generateOn.status,
    },
  };

  const outDir = join(repoRoot, 'docs', 'evidence');
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, 'from-books-saved-books-live-capture.json');
  writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ wrote: outFile, schoolId, board: board?.label, class: classItem?.label, subject: subject?.label, offQuiz: report.generate.off.quizCount, onQuiz: report.generate.on.quizCount }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
