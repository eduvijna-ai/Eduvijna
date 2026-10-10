/**
 * Live dev-api document runtime workflow (disposable content, redacted output).
 * Upload + From Books paths; does not mutate Quiz-React.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';
import { optionalApiString } from './lib/optionalStringPayload.mjs';
import { redactDeep } from './lib/trace-redact.mjs';
import {
  discoverClassroomForStudent,
  linkSharedQuizToClassroom,
} from './lib/dev-api-disposable-assignment.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const credFile = join(repoRoot, '.dev-api-credentials.local.json');
const out = join(repoRoot, 'docs', 'development', 'e2e-fixtures', 'document-workflow-verification-redacted.json');
const runDir = join(repoRoot, '.dev-api-document-workflow-run');

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z5BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const QUIZ_REACT_DEPLOYED_REF = '31ae140f50ccc79079cdfc8c28f2d03b60fde7';

function step(name, status, detail = {}) {
  return { step: name, status, ...detail };
}

function extractQuestionsFromPayload(data) {
  const raw = data?.questions;
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.quizzes)) return raw.quizzes;
  if (Array.isArray(data?.quizzes)) return data.quizzes;
  const total = Number(data?.total_questions ?? 0);
  if (total > 0 && raw && typeof raw === 'object') {
    return Object.values(raw).filter((v) => v && typeof v === 'object');
  }
  return [];
}

async function apiJson(token, method, path, body, isForm = false) {
  const headers = { Authorization: `Bearer ${token}` };
  let fetchBody = body;
  if (isForm) {
    // body is FormData — caller sets headers
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    fetchBody = JSON.stringify(body);
  }
  const res = await fetch(`${getDevApiBase()}${path}`, {
    method,
    headers,
    body: fetchBody,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { _preview: text.slice(0, 200) };
  }
  return { status: res.status, ok: res.ok, data };
}

function buildWorksheetBody({ classLevel, subject, lesson, level, itext }) {
  return {
    class: optionalApiString(classLevel).trim() || 'General',
    subject: optionalApiString(subject).trim() || 'Document',
    lesson: optionalApiString(lesson).trim() || 'Selected content',
    level: optionalApiString(level) || 'medium',
    itext: optionalApiString(itext),
    count: 2,
    mcq_count: 2,
    fitb_count: 0,
    tf_count: 0,
    short_q_count: 0,
    long_q_count: 0,
    matching_count: 0,
    type: 'worksheet',
  };
}

async function main() {
  if (!existsSync(credFile)) {
    console.error('Missing .dev-api-credentials.local.json');
    process.exit(2);
  }
  const cfg = JSON.parse(readFileSync(credFile, 'utf8'));
  const report = {
    verifiedAt: new Date().toISOString(),
    apiBase: getDevApiBase(),
    quizReactDeployedReference: QUIZ_REACT_DEPLOYED_REF,
    steps: [],
    assertions: [],
    limitations: [],
    status: 'pending',
  };

  mkdirSync(runDir, { recursive: true });
  const instructor = await loginDevApi(
    cfg.accounts.instructor.username,
    cfg.accounts.instructor.password,
  );
  const student = await loginDevApi(cfg.accounts.student.username, cfg.accounts.student.password);
  report.steps.push(step('login_instructor_student', 'passed'));

  let classroomId = cfg.disposableQuiz?.classroomId;
  if (!classroomId) {
    try {
      classroomId = (await discoverClassroomForStudent(instructor.token, student.userId)).classroomId;
    } catch (error) {
      report.steps.push(
        step('disposable_classroom_setup', 'failed', {
          error: error?.message || String(error),
        }),
      );
      report.status = 'failed';
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, JSON.stringify(redactDeep(report), null, 2));
      console.error('Disposable classroom setup failed; aborting document workflow.');
      process.exit(1);
    }
  }
  if (!classroomId) {
    report.steps.push(step('disposable_classroom_setup', 'failed', { error: 'missing_classroom_id' }));
    report.status = 'failed';
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(redactDeep(report), null, 2));
    process.exit(1);
  }

  // --- From Books: list → generate → save → history → reopen ---
  const filesRes = await apiJson(
    instructor.token,
    'GET',
    '/api/v1/pdf-questions/files?source=Document',
  );
  report.steps.push(
    step('from_books_list_files', filesRes.ok ? 'passed' : 'failed', {
      httpStatus: filesRes.status,
      fileCount: filesRes.data?.files?.length ?? filesRes.data?.length ?? 0,
    }),
  );

  const files = filesRes.data?.files ?? filesRes.data ?? [];
  const book = Array.isArray(files)
    ? files.find((f) => Number(f.page_count ?? f.total_pages ?? 0) >= 1)
    : null;

  if (!book) {
    report.limitations.push('No server Document book with pages; From Books generate skipped.');
    report.steps.push(step('from_books_generate', 'skipped', { reason: 'no_book' }));
  } else {
    const docId = book.doc_id || book.file_id || book.id;
    const genBody = {
      doc_id: docId,
      page_numbers: [1],
      question_count: 1,
      difficulty: 'easy',
      subject: '',
      grade_level: '',
      lesson_title: '',
    };
    report.assertions.push({
      name: 'from_books_optional_strings_empty_not_null',
      passed: Object.values(genBody).every((v) => v !== null && v !== undefined),
    });
    const genRes = await apiJson(
      instructor.token,
      'POST',
      '/api/v1/study-materials/generate-from-book',
      genBody,
    );
    const questions = extractQuestionsFromPayload(genRes.data);
    let workflowQuestions = questions;
    let fromBooksSource = 'generate-from-book';
    if (!(genRes.ok && workflowQuestions.length > 0)) {
      const extractRes = await apiJson(
        instructor.token,
        'POST',
        '/api/v1/study-materials/extract-raw-content',
        { doc_id: docId, page_numbers: [1] },
      );
      const rawContent = String(extractRes.data?.raw_content || '').trim();
      if (rawContent.length > 40) {
        const strictRes = await apiJson(instructor.token, 'POST', '/api/v1/quiz/generate-strict', {
          content: rawContent.slice(0, 4000),
          language: 'English',
        });
        const strictQuiz = strictRes.data?.quiz ?? [];
        if (strictRes.ok && strictQuiz.length > 0) {
          workflowQuestions = strictQuiz;
          fromBooksSource = 'extract-raw-content+generate-strict';
        }
      }
      report.steps.push(
        step('from_books_extract_fallback', workflowQuestions.length > 0 ? 'passed' : 'failed', {
          httpStatus: extractRes.status,
          rawContentLength: rawContent.length,
          source: fromBooksSource,
        }),
      );
    }

    const genOk = workflowQuestions.length > 0;
    report.steps.push(
      step('from_books_generate_assessment', genOk ? 'passed' : 'failed', {
        httpStatus: genRes.status,
        questionCount: workflowQuestions.length,
        source: fromBooksSource,
      }),
    );

    if (genOk) {
      const title = `DEV_DOC_FB_${Date.now()}`;
      const saveRes = await apiJson(instructor.token, 'POST', '/api/v1/user-assessments', {
        title,
        subject: 'Document',
        class_name: 'Class 10',
        level: 'easy',
        lesson: optionalApiString(book.original_filename),
        assessment_type: 'quiz',
        source: 'Doc-Assessment',
        questions: workflowQuestions.slice(0, 1).map((q, i) => ({
          quiz: {
            question: q.question || q.quiz?.question || 'Q',
            options: q.options || q.quiz?.options || ['A', 'B'],
            answer: q.answer || q.correct_answer || q.correctAnswer || 'A',
          },
          answer: q.answer || q.correctAnswer || 'A',
        })),
      });
      const savedId = saveRes.data?.id ?? saveRes.data?.assessment_id;
      report.steps.push(
        step('from_books_save_history', saveRes.ok && savedId ? 'passed' : 'failed', {
          httpStatus: saveRes.status,
          savedId: savedId ? 'present' : 'missing',
        }),
      );

      if (savedId) {
        const reopen = await apiJson(
          instructor.token,
          'GET',
          `/api/v1/user-assessments/${savedId}`,
        );
        const reopenOk =
          reopen.ok &&
          (reopen.data?.id === savedId || String(reopen.data?.id) === String(savedId));
        report.steps.push(
          step('from_books_reopen_history', reopenOk ? 'passed' : 'failed', {
            httpStatus: reopen.status,
          }),
        );
        report.assertions.push({
          name: 'history_reopen_question_count',
          passed: reopenOk && (reopen.data?.questions?.length ?? 0) >= 1,
          questionCount: reopen.data?.questions?.length ?? 0,
        });
      }

      const wsBody = buildWorksheetBody({
        classLevel: '',
        subject: '',
        lesson: book.original_filename || 'Page 1',
        level: 'easy',
        itext: 'Disposable worksheet source text for dev-api workflow verify.',
      });
      const wsRes = await apiJson(instructor.token, 'POST', '/api/v1/worksheet/generate', wsBody);
      const wsOk = wsRes.ok && wsRes.data?.WorksheetData;
      report.steps.push(
        step('from_books_worksheet_generate', wsOk ? 'passed' : 'failed', {
          httpStatus: wsRes.status,
        }),
      );

      const sessionId = `dev_doc_share_${Date.now()}`;
      const shareRes = await apiJson(instructor.token, 'POST', '/api/v1/sharequiz', {
        topic: title,
        file_name: title,
        classroom_id: classroomId,
        instructor_id: instructor.userId,
        instructor_name: 'instructor',
        quiz_id: null,
        createdby: 'instructor',
        student_level: 'Class 5',
        session_id: sessionId,
        questions: {
          quizzes: workflowQuestions.slice(0, 1).map((q) => ({
            quiz: {
              question: q.question || q.quiz?.question || 'Q',
              options: q.options || q.quiz?.options || ['A', 'B', 'C', 'D'],
              answer: q.answer || q.correctAnswer || 'B',
              explanation: null,
            },
            answer: q.answer || q.correctAnswer || 'B',
          })),
        },
        status: 'active',
        question_count: 1,
        duration: 30,
        type: 'multiple_choice',
        is_public: false,
        is_timer: false,
        has_time_limit: false,
      });
      const quizId = shareRes.data?.quiz_id ?? shareRes.data?.data?.quiz_id;
      const resolvedSessionId = shareRes.data?.session_id || sessionId;
      let linkageOk = false;
      if (shareRes.ok && quizId) {
        try {
          await linkSharedQuizToClassroom({
            instructorToken: instructor.token,
            instructorId: instructor.userId,
            classroomId,
            quizId: Number(quizId),
            topic: title,
          });
          linkageOk = true;
        } catch (error) {
          report.limitations.push(`classroom_linkage_failed:${error?.message || 'unknown'}`);
        }
      }
      report.steps.push(
        step('classroom_share_assessment', shareRes.ok && quizId && linkageOk ? 'passed' : 'failed', {
          httpStatus: shareRes.status,
          linkageOk,
        }),
      );

      if (quizId && resolvedSessionId) {
        const vis = await apiJson(student.token, 'POST', '/api/v1/quiz/check-record', {
          p_check_type: 'pending',
          p_student_id: student.userId,
          p_session_id: resolvedSessionId,
        });
        const rows = vis.data?.result ?? [];
        const visible = rows.some(
          (r) => String(r.quiz_details?.session_id) === String(resolvedSessionId),
        );
        report.steps.push(
          step('student_visibility_pending', visible ? 'passed' : 'failed', {
            httpStatus: vis.status,
            rowCount: rows.length,
          }),
        );
      }
    }
  }

  // --- Upload path: multimodal generate (text ingest — 1x1 PNG yields zero questions on dev-api) ---
  const uploadNotes = [
    'Photosynthesis is the process plants use to convert light energy into chemical energy.',
    'Chlorophyll in chloroplasts absorbs sunlight; glucose and oxygen are typical products.',
    'Verify question: What organelle is the main site of photosynthesis in plant cells?',
  ].join('\n');
  const notesPath = join(runDir, 'dev-verify-notes.txt');
  writeFileSync(notesPath, uploadNotes, 'utf8');
  const form = new FormData();
  form.append(
    'files',
    new Blob([uploadNotes], { type: 'text/plain' }),
    'dev-verify-notes.txt',
  );
  form.append('question_count', '1');
  form.append('difficulty', 'easy');
  form.append('language', 'English');
  form.append('subject', optionalApiString(''));
  form.append('grade_level', optionalApiString(''));
  form.append('lesson_title', optionalApiString('Dev upload verify'));
  const uploadRes = await fetch(`${getDevApiBase()}/api/v1/assessment/generate-multimodal`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${instructor.token}` },
    body: form,
  });
  const uploadText = await uploadRes.text();
  let uploadData;
  try {
    uploadData = JSON.parse(uploadText);
  } catch {
    uploadData = { _preview: uploadText.slice(0, 200) };
  }
  const uploadQuestions = extractQuestionsFromPayload(uploadData);
  const uploadOk = uploadRes.ok && uploadQuestions.length > 0;
  report.steps.push(
    step('upload_multimodal_generate', uploadOk ? 'passed' : 'limited', {
      httpStatus: uploadRes.status,
      questionCount: uploadQuestions.length,
      totalQuestionsField: uploadData?.total_questions ?? null,
      data: redactDeep(uploadData),
    }),
  );
  if (!uploadOk) {
    report.limitations.push(
      'Multimodal upload returned zero questions on dev-api; strict text generator fallback exercised for upload-path coverage.',
    );
    const strictRes = await apiJson(instructor.token, 'POST', '/api/v1/quiz/generate-strict', {
      content:
        'Disposable dev-api upload-path fallback: photosynthesis is the process plants use to convert light to energy.',
      language: 'English',
    });
    const strictQuiz = strictRes.data?.quiz ?? [];
    const strictOk = strictRes.ok && Array.isArray(strictQuiz) && strictQuiz.length > 0;
    report.steps.push(
      step('upload_path_strict_generate_fallback', strictOk ? 'passed' : 'failed', {
        httpStatus: strictRes.status,
        questionCount: strictQuiz.length,
        note: 'Uses text strict generator when multimodal image ingest yields no questions.',
      }),
    );
  }

  const documentFailed = report.steps.some(
    (s) => s.status === 'failed' || s.status === 'limited',
  );
  report.status = documentFailed ? 'failed' : 'passed';

  mkdirSync(dirname(out), { recursive: true });
  const redactedReport = redactDeep({
    ...report,
    steps: report.steps.map((s) => ({
      ...s,
      data: s.data ? redactDeep(s.data) : undefined,
    })),
  });
  writeFileSync(out, JSON.stringify(redactedReport, null, 2));
  console.log(`Wrote ${out} (status=${report.status})`);
  process.exit(documentFailed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
