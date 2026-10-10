/**
 * Live dev-api matrix: submitAssignedQuiz + cross-process checkpoint recovery.
 * Phases: EDUVIJNA_MATRIX_PHASE=1 (interrupt) then =2 (recover) in a fresh Jest process.
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as TokenStorage from '../core/services/tokenStorage';
import type { PlayableQuizQuestion } from '../core/utils/answerMappingUtils';
import * as sharedApi from '../core/services/sharedApi';
import { submitAssignedQuiz } from '../core/services/assignedQuizSubmission.service';
import { fetchPersistedQuizResult } from '../core/services/quizResultRetrieval.service';
import { readQuizSubmissionCheckpoint } from '../core/services/quizSubmissionCheckpoint';
import { apiClient, API_BASE_URL } from '../core/api/config';

const LIVE = process.env.EDUVIJNA_LIVE_DEV_API === '1';
const PHASE = process.env.EDUVIJNA_MATRIX_PHASE || '1';
const credPath = join(__dirname, '..', '..', '.dev-api-credentials.local.json');
const runDir = process.env.EDUVIJNA_LIVE_CHECKPOINT_DIR || join(__dirname, '..', '..', '.dev-api-submission-matrix-run');
const manifestPath = join(runDir, 'manifest.json');

type MatrixManifest = {
  apiBase: string;
  studentId: string;
  studentToken: string;
  instructorToken: string;
  quizId: number;
  sessionId: string;
  classroomId: string;
  topic: string;
  selectedAnswer: string;
};

function readManifest(): MatrixManifest {
  if (!existsSync(manifestPath)) {
    throw new Error('matrix_manifest_missing');
  }
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as MatrixManifest;
}

async function loadPlayableQuestions(sessionId: string, token: string) {
  const res = await apiClient.get('/api/v1/quiz', {
    params: { session_id: sessionId },
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = res.data?.quiz_data ?? res.data?.data ?? res.data;
  const quizzes = payload?.questions?.quizzes ?? payload?.quizzes ?? [];
  const rows = Array.isArray(quizzes) ? quizzes : [];
  return rows.map((row: any, index: number) => {
    const q = row.quiz ?? row;
    return {
      id: `q-${index}`,
      question: String(q.question ?? q.question_text ?? ''),
      options: (q.options ?? []) as string[],
      answer: String(q.answer ?? q.correct_answer ?? ''),
      correctAnswer: String(q.correctAnswer ?? q.answer ?? ''),
      explanation: q.explanation ?? null,
    };
  });
}

function buildSubmitInput(manifest: MatrixManifest, questions: PlayableQuizQuestion[]) {
  const selected = manifest.selectedAnswer;
  return {
    quizId: manifest.quizId,
    studentId: manifest.studentId,
    sessionId: manifest.sessionId,
    classroomId: manifest.classroomId,
    questions,
    selectedAnswers: { 0: selected },
    startedAtIso: new Date().toISOString(),
    scorePercent: 100,
    questionCount: questions.length,
    questionResults: { 0: true },
  };
}

const describeLive = LIVE && existsSync(credPath) ? describe : describe.skip;

describeLive(`assignedQuizSubmission dev-api live matrix phase ${PHASE}`, () => {
  jest.setTimeout(180_000);

  beforeAll(async () => {
    mkdirSync(runDir, { recursive: true });
    const manifest = readManifest();
    if (manifest.apiBase.replace(/\/$/, '') !== API_BASE_URL.replace(/\/$/, '')) {
      throw new Error(
        `api_origin_mismatch manifest=${manifest.apiBase} client=${API_BASE_URL}`,
      );
    }
    (TokenStorage.getAccessToken as jest.Mock).mockResolvedValue(manifest.studentToken);
  });

  if (PHASE === '1') {
    it('interrupts after attempt update and persists checkpoint to disk', async () => {
      const manifest = readManifest();
      const questions = await loadPlayableQuestions(manifest.sessionId, manifest.studentToken);
      if (questions.length === 0) {
        throw new Error('no_playable_questions');
      }

      const input = buildSubmitInput(manifest, questions);
      const actualSubmission = sharedApi.createQuizSubmission.bind(sharedApi);
      jest
        .spyOn(sharedApi, 'createQuizSubmission')
        .mockRejectedValueOnce(new Error('simulated_client_interrupt_after_attempt_update'))
        .mockImplementation((payload) => actualSubmission(payload));

      await expect(submitAssignedQuiz(input)).rejects.toMatchObject({
        name: 'AssignedQuizSubmissionError',
        phase: 'submission',
      });

      const checkpoint = await readQuizSubmissionCheckpoint(
        manifest.studentId,
        manifest.quizId,
        manifest.sessionId,
      );
      expect(checkpoint?.attemptUpdated).toBe(true);
      expect(checkpoint?.immutable).toBeTruthy();
      writeFileSync(join(runDir, 'phase1.ok'), '1');
    });
    return;
  }

  it('recovers via submitAssignedQuiz and asserts persisted submission + completed visibility', async () => {
    const manifest = readManifest();
    const questions = await loadPlayableQuestions(manifest.sessionId, manifest.studentToken);
    if (questions.length === 0) {
      throw new Error('no_playable_questions');
    }

    const input = buildSubmitInput(manifest, questions);
    const result = await submitAssignedQuiz(input);
    expect(result.alreadySubmitted || result.attemptId).toBeTruthy();

    const persisted = await fetchPersistedQuizResult({
      quizId: manifest.quizId,
      sessionId: manifest.sessionId,
      studentId: manifest.studentId,
      isTeacherView: false,
    });
    expect(persisted.status).toBe('ready');
    if (persisted.status === 'ready') {
      expect(String(persisted.data?.quiz_id ?? manifest.quizId)).toBe(String(manifest.quizId));
      expect(String(persisted.data?.session_id ?? manifest.sessionId)).toBe(manifest.sessionId);
      expect(String(persisted.data?.student_id ?? manifest.studentId)).toBe(manifest.studentId);
    }

    const checkRes = await fetch(`${manifest.apiBase}/api/v1/quiz/check-record`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${manifest.studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_check_type: 'completed',
        p_student_id: manifest.studentId,
        p_session_id: manifest.sessionId,
      }),
    });
    const checkBody = await checkRes.json();
    expect(checkRes.ok).toBe(true);
    const rows = checkBody.result ?? [];
    const hit = rows.find(
      (row: { quiz_details?: { quiz_id?: number; session_id?: string } }) =>
        String(row.quiz_details?.quiz_id) === String(manifest.quizId) &&
        String(row.quiz_details?.session_id) === manifest.sessionId,
    );
    expect(hit).toBeTruthy();

    writeFileSync(join(runDir, 'phase2.ok'), '1');
  });
});
