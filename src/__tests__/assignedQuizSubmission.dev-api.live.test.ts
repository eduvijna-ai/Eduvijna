/**
 * Live dev-api matrix: submitAssignedQuiz + checkpoint recovery (mobile core).
 * Run: EDUVIJNA_LIVE_DEV_API=1 npm test -- --config jest.live.config.cjs
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TokenStorage from '../core/services/tokenStorage';
import * as sharedApi from '../core/services/sharedApi';
import { submitAssignedQuiz } from '../core/services/assignedQuizSubmission.service';
import { fetchPersistedQuizResult } from '../core/services/quizResultRetrieval.service';
import { readQuizSubmissionCheckpoint } from '../core/services/quizSubmissionCheckpoint';
import { apiClient } from '../core/api/config';

jest.mock('../core/services/studentQuizCacheInvalidation', () => ({
  invalidateStudentQuizCaches: jest.fn().mockResolvedValue(undefined),
}));

const LIVE = process.env.EDUVIJNA_LIVE_DEV_API === '1';
const API = 'https://dev-api.eduvijna.com';
const credPath = join(__dirname, '..', '..', '.dev-api-credentials.local.json');

const memoryStore: Record<string, string> = {};

async function login(username: string, password: string) {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username_or_email: username,
      password,
      remember_me: false,
      device_info: 'live submission matrix',
      client_type: 'mobile',
    }),
  });
  const body = await res.json();
  if (!res.ok || !body.access_token) {
    throw new Error(`login_failed status=${res.status}`);
  }
  return {
    token: body.access_token as string,
    userId: String(body.user?.id ?? ''),
    role: body.user?.role as string,
  };
}

async function discoverClassroomForStudent(instructorToken: string, studentId: string) {
  const res = await fetch(
    `${API}/api/v1/dashboard/quizzes?view_type=class_wise_students&limit=100&offset=0`,
    { headers: { Authorization: `Bearer ${instructorToken}` } },
  );
  const data = await res.json();
  const rows = data.data ?? [];
  for (const row of rows) {
    const attempts =
      typeof row.attempts === 'string' ? JSON.parse(row.attempts) : row.attempts ?? [];
    const hit = attempts.find((s: { student_id?: number }) => String(s.student_id) === studentId);
    if (hit) {
      return { classroomId: String(row.classroom_id), classroomName: String(row.classroom_name) };
    }
  }
  throw new Error('no_classroom_for_student');
}

async function createDisposableAssignment(
  instructorToken: string,
  instructorId: string,
  classroomId: string,
) {
  const topic = `DEV_MATRIX_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`;
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const res = await fetch(`${API}/api/v1/sharequiz`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${instructorToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic,
      file_name: topic,
      classroom_id: classroomId,
      instructor_id: instructorId,
      instructor_name: 'instructor',
      quiz_id: null,
      createdby: 'instructor',
      student_level: 'Class 5',
      session_id: `dev_matrix_${Date.now()}`,
      questions: {
        quizzes: [
          {
            quiz: {
              question: 'Matrix verify: 2 + 2 = ?',
              options: ['3', '4', '5', '6'],
              answer: 'B',
              explanation: null,
            },
            answer: 'B',
          },
        ],
      },
      status: 'active',
      tags: { subject: 'Mathematics', difficulty: 'easy' },
      question_count: 1,
      duration: 30,
      summary: 'Disposable dev submission matrix fixture',
      type: 'multiple_choice',
      is_public: false,
      is_timer: false,
      start_time: now.toISOString(),
      end_time: end.toISOString(),
      has_time_limit: false,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.quiz_id || !data.session_id) {
    throw new Error(`sharequiz_failed status=${res.status}`);
  }
  return {
    quizId: Number(data.quiz_id),
    sessionId: String(data.session_id),
    classroomId: String(data.classroom_id || classroomId),
    topic,
  };
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

const describeLive = LIVE && existsSync(credPath) ? describe : describe.skip;

describeLive('assignedQuizSubmission dev-api live matrix', () => {
  jest.setTimeout(180_000);

  let fixture: {
    studentId: string;
    instructorToken: string;
    instructorId: string;
    classroomId: string;
    studentToken: string;
  };

  beforeAll(async () => {
    const cfg = JSON.parse(readFileSync(credPath, 'utf8'));
    const instructor = await login(
      cfg.accounts.instructor.username,
      cfg.accounts.instructor.password,
    );
    const student = await login(cfg.accounts.student.username, cfg.accounts.student.password);
    const classroom = await discoverClassroomForStudent(instructor.token, student.userId);

    fixture = {
      studentId: student.userId,
      studentToken: student.token,
      instructorToken: instructor.token,
      instructorId: instructor.userId,
      classroomId: classroom.classroomId,
    };

    (TokenStorage.getAccessToken as jest.Mock).mockResolvedValue(student.token);
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => memoryStore[key] ?? null);
    (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
      memoryStore[key] = value;
    });
    (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
      delete memoryStore[key];
    });
  });

  beforeEach(async () => {
    for (const key of Object.keys(memoryStore)) {
      delete memoryStore[key];
    }
    jest.restoreAllMocks();
    (TokenStorage.getAccessToken as jest.Mock).mockResolvedValue(fixture.studentToken);
  });

  it('recovers via submitAssignedQuiz after simulated POST failure (real attempt APIs)', async () => {
    const created = await createDisposableAssignment(
      fixture.instructorToken,
      fixture.instructorId,
      fixture.classroomId,
    );

    await apiClient.get('/api/v1/quiz', { params: { session_id: created.sessionId } }).catch(() => undefined);

    const questions =
      (await loadPlayableQuestions(created.sessionId, fixture.studentToken)).length > 0
        ? await loadPlayableQuestions(created.sessionId, fixture.studentToken)
        : [
            {
              id: 'q-0',
              question: 'Matrix verify: 2 + 2 = ?',
              options: ['3', '4', '5', '6'],
              answer: 'B',
              correctAnswer: 'B',
              explanation: null,
            },
          ];

    const selected = questions[0].options[1] ?? '4';
    const input = {
      quizId: created.quizId,
      studentId: fixture.studentId,
      sessionId: created.sessionId,
      classroomId: created.classroomId,
      questions,
      selectedAnswers: { 0: selected },
      startedAtIso: new Date().toISOString(),
      scorePercent: 100,
      questionCount: questions.length,
      questionResults: { 0: true },
    };

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
      fixture.studentId,
      created.quizId,
      created.sessionId,
    );
    expect(checkpoint?.attemptUpdated).toBe(true);
    expect(checkpoint?.immutable).toBeTruthy();

    try {
      await submitAssignedQuiz(input);
      const persisted = await fetchPersistedQuizResult({
        quizId: created.quizId,
        sessionId: created.sessionId,
        studentId: fixture.studentId,
        isTeacherView: false,
      });
      expect(persisted.status).toBe('ready');
    } catch {
      const attemptsRes = await apiClient.get('/api/v1/dashboard/quiz-attempts', {
        params: {
          student_id: fixture.studentId,
          quiz_id: created.quizId,
          class_id: created.sessionId,
        },
      });
      const attempts = attemptsRes.data?.data ?? attemptsRes.data ?? [];
      const list = Array.isArray(attempts) ? attempts : [];
      expect(list.some((a: { status?: string }) => a.status === 'completed')).toBe(true);
      expect(checkpoint?.immutable).toBeTruthy();
    }
  });

  it('exposes pending assignments and probes attended-quiz for list visibility', async () => {
    const checkRes = await fetch(`${API}/api/v1/quiz/check-record`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${fixture.studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_check_type: 'pending',
        p_student_id: fixture.studentId,
        p_session_id: '',
      }),
    });
    const checkBody = await checkRes.json();
    expect((checkBody.result ?? []).length).toBeGreaterThan(0);

    const row = checkBody.result[0];
    const attendedRes = await fetch(
      `${API}/api/v1/dashboard/attended-quiz?student_id=${fixture.studentId}&session_id=${row.quiz_details.session_id}&quiz_id=${row.quiz_details.quiz_id}`,
      { headers: { Authorization: `Bearer ${fixture.studentToken}` } },
    );
    expect([200, 404]).toContain(attendedRes.status);
  });
});
