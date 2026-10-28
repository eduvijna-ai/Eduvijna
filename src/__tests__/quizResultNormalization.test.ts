import {
  normalizeAttendedQuizResponse,
  normalizeQuestionsAndAnswersFromLogData,
  resolvePersistedScore,
  resolvePersistedTimeSpentSeconds,
} from '../core/services/quizResultNormalization';
import type { AttendedQuizResponse } from '../core/types/attendedQuiz.types';

function attendedFixture(
  overrides: Partial<AttendedQuizResponse> = {},
): AttendedQuizResponse {
  return {
    student_id: 's1',
    classroom_id: 'session-a',
    quiz_id: 10,
    session_id: 'session-a',
    file_name: null,
    duration: 30,
    submitted_at: '2026-01-02T00:00:00.000Z',
    created_at: '2026-01-02T00:00:00.000Z',
    time_spent_seconds: 30,
    score: 50,
    counts: { total_questions: 2, questions_answered: 1, questions_skipped: 1 },
    items: [],
    ...overrides,
  };
}

const completeItems = [
  {
    question_id: 1,
    question: '2+2?',
    options: ['3', '4', '5', '6'],
    student_answer: 'B',
    answer_key: 'B',
    is_correct: true,
  },
  {
    question_id: 2,
    question: '3+3?',
    options: ['5', '6', '7', '8'],
    student_answer: null,
    answer_key: 'B',
    is_correct: false,
  },
];

describe('quizResultNormalization', () => {
  it('falls back when same-count identity has unrelated question texts', () => {
    const normalized = normalizeAttendedQuizResponse({
      submitted_at: '2026-10-28T00:00:00Z',
      score: 100,
      log_data: {
        answer_identity: {
          version: 1,
          questions: [
            {
              questionId: 'other',
              questionText: 'Completely different quiz question',
              optionsDisplayed: ['A', 'B', 'C', 'D'],
              correct: { originalIndex: 0, displayIndex: 0, displayText: 'A' },
              selected: { originalIndex: 0, displayIndex: 0, displayText: 'A' },
              isCorrect: true,
            },
          ],
        },
      },
      items: [
        {
          question: 'Attended real question',
          options: ['1', '2', '3', '4'],
          student_answer: '2',
          answer_key: '2',
          is_correct: true,
        },
      ],
    } as any);
    expect(normalized?.questions[0].question).toBe('Attended real question');
    expect(normalized?.userAnswers[0]).toBe('2');
  });

  it('falls back when identity questions are reordered vs attended items', () => {
    const normalized = normalizeAttendedQuizResponse({
      submitted_at: '2026-10-28T00:00:00Z',
      score: 50,
      log_data: {
        answer_identity: {
          version: 1,
          questions: [
            {
              questionId: 'q2',
              questionText: 'Second question',
              optionsDisplayed: ['a', 'b', 'c', 'd'],
              correct: { originalIndex: 1, displayIndex: 1, displayText: 'b' },
              selected: { originalIndex: 0, displayIndex: 0, displayText: 'a' },
              isCorrect: false,
            },
            {
              questionId: 'q1',
              questionText: 'First question',
              optionsDisplayed: ['1', '2', '3', '4'],
              correct: { originalIndex: 1, displayIndex: 1, displayText: '2' },
              selected: { originalIndex: 1, displayIndex: 1, displayText: '2' },
              isCorrect: true,
            },
          ],
        },
      },
      items: [
        {
          question: 'First question',
          options: ['1', '2', '3', '4'],
          student_answer: '2',
          answer_key: '2',
          is_correct: true,
        },
        {
          question: 'Second question',
          options: ['a', 'b', 'c', 'd'],
          student_answer: 'a',
          answer_key: 'b',
          is_correct: false,
        },
      ],
    } as any);
    expect(normalized?.questions[0].question).toBe('First question');
    expect(normalized?.userAnswers[0]).toBe('2');
    expect(normalized?.questions[1].question).toBe('Second question');
  });

  it('falls back to attended.items when answer_identity is partial or misaligned', () => {
    const normalized = normalizeAttendedQuizResponse({
      submitted_at: '2026-10-28T00:00:00Z',
      score: 50,
      time_spent_seconds: 12,
      log_data: {
        answer_identity: {
          version: 1,
          questions: [
            {
              questionId: 'only-one',
              questionText: 'Only one snapshot',
              optionsDisplayed: ['A', 'B'],
              correct: { originalIndex: 0, displayIndex: 0, displayText: 'A' },
              selected: { originalIndex: 1, displayIndex: 1, displayText: 'B' },
              isCorrect: false,
            },
          ],
        },
      },
      items: [
        {
          question: 'Q1',
          options: ['1', '2', '3', '4'],
          student_answer: '2',
          answer_key: '2',
          is_correct: true,
        },
        {
          question: 'Q2',
          options: ['a', 'b', 'c', 'd'],
          student_answer: 'a',
          answer_key: 'b',
          is_correct: false,
        },
      ],
    } as any);
    expect(normalized?.questions).toHaveLength(2);
    expect(normalized?.questions[0].question).toBe('Q1');
    expect(normalized?.userAnswers[0]).toBe('2');
  });

  it('ignores malformed answer_identity entries and uses attended items', () => {
    const normalized = normalizeAttendedQuizResponse({
      submitted_at: '2026-10-28T00:00:00Z',
      score: 0,
      log_data: {
        answer_identity: {
          version: 1,
          questions: [{ notAValidSnapshot: true }],
        },
      },
      items: [
        {
          question: 'Safe attended',
          options: ['x', 'y'],
          student_answer: 'x',
          answer_key: 'y',
          is_correct: false,
        },
      ],
    } as any);
    expect(normalized?.questions[0].question).toBe('Safe attended');
    expect(normalized?.userAnswers[0]).toBe('x');
  });

  it('prefers answer_identity over attended.items for reopen review model', () => {
    const identity = {
      version: 1 as const,
      questions: [
        {
          questionId: 'q-0',
          questionText: 'Swachh?',
          optionsDisplayed: ['A text', 'B text', 'C text', 'D text'],
          correct: { originalIndex: 1, displayIndex: 1, displayText: 'B text' },
          selected: { originalIndex: 0, displayIndex: 0, displayText: 'A text' },
          isCorrect: false,
        },
      ],
    };
    const normalized = normalizeAttendedQuizResponse({
      submitted_at: '2026-10-28T00:00:00Z',
      score: 0,
      time_spent_seconds: 12,
      log_data: {
        answer_identity: identity,
        answers: [
          {
            questionNumber: 1,
            question: 'Swachh?',
            options: ['A text', 'B text', 'C text', 'D text'],
            correctAnswer: 'B text',
            userAnswer: 'A',
            userAnswerText: 'A text',
            isCorrect: false,
          },
        ],
      },
      items: [
        {
          question: 'Swachh?',
          // Mutated / incomplete attended payload must not win over identity.
          options: ['C text', 'A text', 'B text', 'D text'],
          student_answer: 'A',
          answer_key: '',
          is_correct: true,
        },
      ],
    } as any);
    expect(normalized?.questions[0].options).toEqual(['A text', 'B text', 'C text', 'D text']);
    expect(normalized?.questions[0].correctOptionIndex).toBe(1);
    expect(normalized?.userAnswers[0]).toBe('A text');
    expect(normalized?.questions[0].attendedIsCorrect).toBe(false);
  });

  it('reconstructs questions and answers from complete log_data.answers', () => {
    const normalized = normalizeQuestionsAndAnswersFromLogData({
      answers: [
        {
          questionNumber: 1,
          question: '2+2?',
          options: ['3', '4', '5', '6'],
          correctAnswer: 'B',
          userAnswer: 'B',
          isCorrect: true,
        },
        {
          questionNumber: 2,
          question: '3+3?',
          options: ['5', '6', '7', '8'],
          correctAnswer: 'B',
          userAnswer: null,
          isCorrect: false,
        },
      ],
      score: 50,
    });

    expect(normalized?.questions).toHaveLength(2);
    expect(normalized?.questions[0].question).toBe('2+2?');
    expect(normalized?.userAnswers[0]).toBe('4');
    expect(normalized?.userAnswers[1]).toBe('');
    expect(normalized?.score).toBe(50);
  });

  it('does not reconstruct from sparse log-only answers', () => {
    expect(
      normalizeQuestionsAndAnswersFromLogData({
        answers: [{ userAnswer: 'A', isCorrect: false }],
        score: 0,
      }),
    ).toBeNull();
  });

  it('preserves score 0 and keeps absent score null', () => {
    expect(resolvePersistedScore(0, null)).toBe(0);
    expect(resolvePersistedScore(undefined, null)).toBeNull();
    expect(resolvePersistedScore(undefined, { score: 0 })).toBe(0);
  });

  it('preserves attended student_answer when matched log entry lacks usable answer', () => {
    const normalized = normalizeAttendedQuizResponse(
      attendedFixture({
        items: [
          {
            question_id: 1,
            question: '2+2?',
            options: ['3', '4'],
            student_answer: 'B',
            answer_key: 'B',
            is_correct: true,
          },
        ],
        log_data: {
          answers: [{ question: '2+2?', options: ['3', '4'], userAnswer: null }],
        },
      }),
    );
    expect(normalized?.userAnswers[0]).toBe('4');
  });

  it('preserves attended is_correct when answer_key is absent', () => {
    const normalized = normalizeAttendedQuizResponse(
      attendedFixture({
        items: [
          {
            question_id: 1,
            question: '2+2?',
            options: ['3', '4'],
            student_answer: 'B',
            answer_key: null,
            is_correct: true,
          },
        ],
        log_data: { answers: [] },
      }),
    );
    expect(normalized?.questions[0].attendedIsCorrect).toBe(true);
    expect(normalized?.questions[0].correctAnswer).toBe('');
  });

  it('preserves attended student_answer when log entry is whitespace-only', () => {
    const normalized = normalizeAttendedQuizResponse(
      attendedFixture({
        items: [
          {
            question_id: 1,
            question: '2+2?',
            options: ['3', '4'],
            student_answer: 'B',
            answer_key: 'B',
            is_correct: true,
          },
        ],
        log_data: {
          answers: [{ question: '2+2?', options: ['3', '4'], userAnswer: '   ' }],
        },
      }),
    );
    expect(normalized?.userAnswers[0]).toBe('4');
  });

  it('keeps genuine unanswered when log and attended are both empty', () => {
    const normalized = normalizeAttendedQuizResponse(
      attendedFixture({
        items: [
          {
            question_id: 1,
            question: '2+2?',
            options: ['3', '4'],
            student_answer: null,
            answer_key: 'B',
            is_correct: null,
          },
        ],
        log_data: {
          answers: [{ question: '2+2?', options: ['3', '4'], userAnswer: '' }],
        },
      }),
    );
    expect(normalized?.userAnswers[0]).toBe('');
  });

  it('uses log duration when attended time_spent_seconds is null', () => {
    expect(resolvePersistedTimeSpentSeconds(null, { duration: 88 })).toBe(88);
    const normalized = normalizeAttendedQuizResponse(
      attendedFixture({
        time_spent_seconds: null,
        log_data: { duration: 88, answers: [] },
        items: completeItems,
      }),
    );
    expect(normalized?.timeSpentSeconds).toBe(88);
  });

  it('uses complete items when log_data.answers is sparse', () => {
    const normalized = normalizeAttendedQuizResponse(
      attendedFixture({
        score: 50,
        items: completeItems,
        log_data: {
          answers: [{ userAnswer: 'B', isCorrect: true }],
        },
      }),
    );

    expect(normalized).not.toBeNull();
    expect(normalized?.questions).toHaveLength(2);
    expect(normalized?.questions[0].question).toBe('2+2?');
    expect(normalized?.questions[1].question).toBe('3+3?');
    expect(normalized?.userAnswers[0]).toBe('4');
    expect(normalized?.userAnswers[1]).toBe('');
  });

  it('preserves unanswered questions when the log omits those entries', () => {
    const normalized = normalizeAttendedQuizResponse(
      attendedFixture({
        counts: { total_questions: 3, questions_answered: 2, questions_skipped: 1 },
        items: [
          {
            question_id: 1,
            question: 'Capital of France?',
            options: ['Paris', 'Lyon', 'Nice', 'Lille'],
            student_answer: null,
            answer_key: 'A',
            is_correct: null,
          },
          {
            question_id: 2,
            question: '2+2?',
            options: ['3', '4', '5', '6'],
            student_answer: null,
            answer_key: 'B',
            is_correct: null,
          },
          {
            question_id: 3,
            question: 'Color of the sky?',
            options: ['Blue', 'Green', 'Red', 'Yellow'],
            student_answer: null,
            answer_key: 'A',
            is_correct: null,
          },
        ],
        log_data: {
          answers: [
            {
              questionNumber: 1,
              question: 'Capital of France?',
              options: ['Paris', 'Lyon', 'Nice', 'Lille'],
              correctAnswer: 'A',
              userAnswer: 'A',
              isCorrect: true,
            },
            {
              questionNumber: 3,
              question: 'Color of the sky?',
              options: ['Blue', 'Green', 'Red', 'Yellow'],
              correctAnswer: 'A',
              userAnswer: 'D',
              isCorrect: false,
            },
          ],
        },
      }),
    );

    expect(normalized?.questions).toHaveLength(3);
    expect(normalized?.userAnswers).toEqual(['Paris', '', 'Yellow']);
  });

  it('reconstructs complete log-only results when items are empty', () => {
    const normalized = normalizeAttendedQuizResponse(
      attendedFixture({
        items: [],
        log_data: {
          answers: [
            {
              questionNumber: 1,
              question: '2+2?',
              options: ['3', '4', '5', '6'],
              correctAnswer: 'B',
              userAnswer: 'B',
              isCorrect: true,
            },
            {
              questionNumber: 2,
              question: '3+3?',
              options: ['5', '6', '7', '8'],
              correctAnswer: 'B',
              userAnswer: null,
              isCorrect: false,
            },
          ],
          score: 50,
        },
      }),
    );

    expect(normalized?.questions).toHaveLength(2);
    expect(normalized?.questions[1].question).toBe('3+3?');
    expect(normalized?.userAnswers).toEqual(['4', '']);
  });

  it('returns null missing-data when items are empty and logs lack question structure', () => {
    expect(
      normalizeAttendedQuizResponse(
        attendedFixture({
          score: 0,
          items: [],
          log_data: { answers: [{ userAnswer: 'A', isCorrect: false }] },
        }),
      ),
    ).toBeNull();
  });

  it('preserves score 0 with complete items', () => {
    const normalized = normalizeAttendedQuizResponse(
      attendedFixture({
        score: 0,
        items: [
          {
            question_id: 1,
            question: '2+2?',
            options: ['3', '4', '5', '6'],
            student_answer: 'A',
            answer_key: 'B',
            is_correct: false,
          },
        ],
        log_data: { answers: [{ userAnswer: 'A', isCorrect: false }], score: 0 },
      }),
    );

    expect(normalized?.score).toBe(0);
    expect(normalized?.questions).toHaveLength(1);
    expect(normalized?.userAnswers[0]).toBe('3');
  });
});
