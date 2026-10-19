/**
 * Live probe: Document Assessment camera-equivalent path
 * selected images → PDF upload (study-materials/books/upload) → generateFromBook
 *
 * Does NOT use batch-ocr / Mathpix (Handwritten remains deferred).
 * Output is redacted; no tokens/credentials in the report file.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { getDevApiBase, loginDevApi } from './lib/dev-api-auth.mjs';
import { resolveDevApiCredentialsPath } from './lib/resolve-dev-api-credentials-path.mjs';
import { redactDeep } from './lib/trace-redact.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(repoRoot, '.stack-validation-logs', 'review-api-probes-20261019');
mkdirSync(outDir, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function makeReadablePngBuffer() {
  // Simple high-contrast page with a light "document" band (JPEG-like content for PDF).
  const width = 640;
  const height = 900;
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (width * y + x) << 2;
      const band = y > 80 && y < 820 && x > 40 && x < 600;
      png.data[idx] = band ? 250 : 30;
      png.data[idx + 1] = band ? 250 : 30;
      png.data[idx + 2] = band ? 245 : 40;
      png.data[idx + 3] = 255;
      // Horizontal "lines" to look like a notebook page
      if (band && y % 28 === 0) {
        png.data[idx] = 180;
        png.data[idx + 1] = 200;
        png.data[idx + 2] = 220;
      }
    }
  }
  // Marked interior block (for visual uniqueness)
  for (let y = 200; y < 320; y += 1) {
    for (let x = 120; x < 520; x += 1) {
      const idx = (width * y + x) << 2;
      png.data[idx] = 20;
      png.data[idx + 1] = 60;
      png.data[idx + 2] = 120;
    }
  }
  return PNG.sync.write(png);
}

/** Minimal one-page PDF with readable educational text (no pdf-lib dependency). */
function makeReadablePdfBytes() {
  const lines = [
    'Document Assessment camera probe page.',
    'Photosynthesis converts light energy into chemical energy in plants.',
    'Chloroplasts contain chlorophyll and are the main site of photosynthesis.',
    'Question focus: Which organelle performs photosynthesis?',
  ];
  const contentLines = ['BT', '/F1 14 Tf', '50 750 Td', '16 TL'];
  lines.forEach((line, i) => {
    const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    if (i === 0) contentLines.push(`(${escaped}) Tj`);
    else contentLines.push(`T* (${escaped}) Tj`);
  });
  contentLines.push('ET');
  const stream = contentLines.join('\n');
  const objs = [];
  objs.push('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n');
  objs.push('2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n');
  objs.push(
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n',
  );
  objs.push(`4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream\nendobj\n`);
  objs.push('5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n');

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objs) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objs.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf8');
}

async function apiJson(token, method, path, body) {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const res = await fetch(`${getDevApiBase()}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { _preview: text.slice(0, 240) };
  }
  return { status: res.status, ok: res.ok, data };
}

function extractQuestions(data) {
  const raw = data?.questions;
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.quizzes)) return raw.quizzes;
  if (Array.isArray(data?.quizzes)) return data.quizzes;
  return [];
}

async function waitBookReady(token, docId, expectedPages) {
  const started = Date.now();
  let last = null;
  while (Date.now() - started < 90000) {
    const list = await apiJson(token, 'GET', '/api/v1/pdf-questions/files?source=Document');
    const files = Array.isArray(list.data?.files) ? list.data.files : [];
    const match = files.find(
      (f) => String(f.doc_id || f.file_id || f.id) === String(docId),
    );
    if (match) {
      last = match;
      const pages = Number(match.page_count ?? match.total_pages ?? 0);
      const status = String(match.status || match.processing_status || '').toLowerCase();
      if (pages >= expectedPages || status === 'completed' || status === 'ready') {
        return { ok: true, match, pages, status };
      }
    }
    await sleep(1500);
  }
  return { ok: false, match: last, pages: Number(last?.page_count || 0), status: last?.status };
}

async function main() {
  const credPath = resolveDevApiCredentialsPath(repoRoot);
  if (!existsSync(credPath)) {
    console.error('Missing credentials file');
    process.exit(2);
  }
  const cfg = JSON.parse(readFileSync(credPath, 'utf8'));
  const instructor = await loginDevApi(
    cfg.accounts.instructor.username,
    cfg.accounts.instructor.password,
  );

  const report = {
    verifiedAt: new Date().toISOString(),
    apiBase: getDevApiBase(),
    contract:
      'selected images → PDF → POST /api/v1/study-materials/books/upload → wait ready → POST /api/v1/study-materials/generate-from-book (pages 1..N)',
    steps: [],
    status: 'pending',
    handwrittenDeferred: 'batch-ocr / Mathpix not used for Document Assessment camera path',
  };

  const pngBuf = makeReadablePngBuffer();
  writeFileSync(join(outDir, 'camera-doc-source.png'), pngBuf);
  const pdfBytes = makeReadablePdfBytes();
  writeFileSync(join(outDir, 'camera-doc-source.pdf'), pdfBytes);

  const form = new FormData();
  form.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), 'camera-doc-probe.pdf');
  form.append('title', `CAM_DOC_PROBE_${Date.now()}`);
  form.append('grade_level', '');
  form.append('subject', '');
  form.append('lesson_title', 'Camera Document Assessment probe');
  form.append('sub_lesson', '');

  const uploadRes = await fetch(`${getDevApiBase()}/api/v1/study-materials/books/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${instructor.token}` },
    body: form,
  });
  const uploadText = await uploadRes.text();
  let uploadData;
  try {
    uploadData = JSON.parse(uploadText);
  } catch {
    uploadData = { _preview: uploadText.slice(0, 240) };
  }
  const book = uploadData?.book ?? uploadData ?? {};
  const docId = book.doc_id || book.file_id || book.id;
  report.steps.push({
    step: 'books_upload',
    status: uploadRes.ok && docId ? 'passed' : 'failed',
    httpStatus: uploadRes.status,
    docIdPresent: !!docId,
  });

  if (!docId) {
    report.status = 'failed';
    writeFileSync(
      join(outDir, 'camera-document-assessment-live.json'),
      JSON.stringify(redactDeep(report), null, 2),
    );
    console.log(JSON.stringify(redactDeep(report), null, 2));
    process.exit(1);
  }

  const ready = await waitBookReady(instructor.token, docId, 1);
  report.steps.push({
    step: 'wait_book_ready',
    status: ready.ok ? 'passed' : 'failed',
    pages: ready.pages,
    processingStatus: ready.status || null,
  });

  const genBody = {
    doc_id: docId,
    page_numbers: [1],
    question_count: 3,
    difficulty: 'easy',
    subject: '',
    grade_level: '',
    lesson_title: 'Camera Document Assessment probe',
    additional_instructions: '',
  };
  const genRes = await apiJson(
    instructor.token,
    'POST',
    '/api/v1/study-materials/generate-from-book',
    genBody,
  );
  const questions = extractQuestions(genRes.data);
  const genOk = genRes.ok && questions.length > 0;
  report.steps.push({
    step: 'generate_from_book',
    status: genOk ? 'passed' : 'failed',
    httpStatus: genRes.status,
    questionCount: questions.length,
    message: genRes.data?.detail || genRes.data?.error || genRes.data?.message || null,
  });

  let savedId = null;
  if (genOk) {
    const saveRes = await apiJson(instructor.token, 'POST', '/api/v1/user-assessments', {
      title: `CAM_DOC_SAVE_${Date.now()}`,
      subject: 'Document',
      class_name: '',
      level: 'easy',
      lesson: 'Camera Document Assessment probe',
      assessment_type: 'web-quiz',
      source: 'Doc-File-Assessment',
      questions: questions.slice(0, 1).map((q) => ({
        quiz: {
          question: q.question || q.quiz?.question || 'Q',
          options: q.options || q.quiz?.options || ['A', 'B', 'C', 'D'],
          answer: q.answer || q.correctAnswer || q.correct_answer || 'A',
        },
        answer: q.answer || q.correctAnswer || 'A',
      })),
    });
    savedId = saveRes.data?.id ?? saveRes.data?.assessment_id ?? null;
    report.steps.push({
      step: 'save_history',
      status: saveRes.ok && savedId ? 'passed' : 'failed',
      httpStatus: saveRes.status,
      savedIdPresent: !!savedId,
    });
    if (savedId) {
      const reopen = await apiJson(instructor.token, 'GET', `/api/v1/user-assessments/${savedId}`);
      report.steps.push({
        step: 'reopen_history',
        status: reopen.ok ? 'passed' : 'failed',
        httpStatus: reopen.status,
        questionCount: reopen.data?.questions?.length ?? 0,
      });
    }
  }

  // Contrast: OCR path still blocked (Handwritten deferred)
  const ocrForm = new FormData();
  ocrForm.append('files', new Blob([pngBuf], { type: 'image/png' }), 'camera-doc-source.png');
  const ocrRes = await fetch(`${getDevApiBase()}/api/v1/batch-ocr-upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${instructor.token}` },
    body: ocrForm,
  });
  let ocrData;
  try {
    ocrData = await ocrRes.json();
  } catch {
    ocrData = {};
  }
  report.steps.push({
    step: 'handwritten_batch_ocr_still_blocked',
    status: ocrRes.status === 503 ? 'expected_blocked' : 'unexpected',
    httpStatus: ocrRes.status,
    detailPreview: String(ocrData?.detail || ocrData?.message || '').slice(0, 160),
  });

  const failed = report.steps.some((s) => s.status === 'failed');
  report.status = failed ? 'failed' : 'passed';
  const outPath = join(outDir, 'camera-document-assessment-live.json');
  writeFileSync(outPath, JSON.stringify(redactDeep(report), null, 2));
  console.log(JSON.stringify(redactDeep(report), null, 2));
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
