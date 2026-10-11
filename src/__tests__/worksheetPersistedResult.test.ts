import { tryNormalizeWorksheetAttended } from '../core/services/worksheetPersistedResult';
import type { AttendedQuizResponse } from '../core/types/attendedQuiz.types';

const worksheetData = {
  Metadata: { Class: '5', Subject: 'Math', Lesson: 'Algebra', Difficulty: 'medium' },
  Worksheet: {
    Section_D_Short_Questions: [{ id: 1, question: 'Define a prime number.' }],
  },
  AnswerKey: {
    Section_D_Short_Questions: [{ id: 1, modelAnswer: 'A whole number greater than 1 with no positive divisors except 1 and itself.' }],
  },
};

describe('tryNormalizeWorksheetAttended', () => {
  it('builds review rows for worksheet submissions with text answers', () => {
    const attended: AttendedQuizResponse = {
      student_id: 's1',
      classroom_id: 'class_a',
      quiz_id: 42,
      session_id: 'sess_a',
      file_name: null,
      duration: 0,
      submitted_at: '2026-08-27T00:00:00.000Z',
      created_at: null,
      time_spent_seconds: 120,
      score: 60,
      assessment_type: 'worksheet',
      worksheet_data: worksheetData,
      log_data: {
        assessment_type: 'worksheet',
        worksheet_answers: {
          Section_D_Short_Questions: [{ id: 1, answer: 'A number with only two factors' }],
        },
        evaluation: {
          percentage: 60,
          results: [
            {
              id: 1,
              section: 'Section_D_Short_Questions',
              isCorrect: true,
              marksObtained: 1,
              maxMarks: 1,
            },
          ],
        },
      },
      counts: { total_questions: 1, questions_answered: 1, questions_skipped: 0 },
      items: [],
    };

    const normalized = tryNormalizeWorksheetAttended(attended);
    expect(normalized).not.toBeNull();
    expect(normalized?.questions).toHaveLength(1);
    expect(normalized?.questions[0].options).toEqual([]);
    expect(normalized?.userAnswers[0]).toContain('two factors');
    expect(normalized?.score).toBe(60);
  });
});
