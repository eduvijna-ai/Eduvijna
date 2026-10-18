import { checkRecordToQuiz } from '../core/services/dashboardApi';
import { resolveClassroomDisplayName } from '../utils/classroomDisplayName';

describe('pending Notifications classroom name mapping', () => {
  const baseRow = {
    status: null as null,
    classid: 'class_b3261be7',
    student_id: 's1',
    quiz_details: {
      quiz_id: 1,
      topic: 'food.pdf',
      summary: '',
      session_id: 'sess-food',
      start_time: '2026-01-01T00:00:00.000Z',
      end_time: '2026-12-31T00:00:00.000Z',
      duration: 30,
      has_time_limit: true,
      question_count: 5,
      questions: { quizzes: [] },
      status: 'active',
      is_active: true,
      is_public: false,
    },
  };

  it('resolves Unknown Class without lookup when quiz_details omit classroom_name', () => {
    const quiz = checkRecordToQuiz(baseRow);
    expect(quiz.classroom_name).toBe('Unknown Class');
  });

  it('uses school-scoped lookup for pending check-record rows (Notifications path)', () => {
    const lookup = new Map([['class_b3261be7', '4A-Telugu']]);
    const quiz = checkRecordToQuiz(baseRow, { classroomNameLookup: lookup });
    expect(quiz.classroom_name).toBe('4A-Telugu');
    expect(quiz.session_id).toBe('sess-food');
    expect(quiz.classroom_id).not.toBe(quiz.session_id);
  });

  it('keeps classroom identity distinct from session_id even when name missing', () => {
    const quiz = checkRecordToQuiz(baseRow);
    expect(quiz.classroom_id).toBe('class_b3261be7');
    expect(quiz.session_id).toBe('sess-food');
    expect(
      resolveClassroomDisplayName(String(quiz.classroom_id), {
        recordName: quiz.classroom_name,
        lookup: new Map(),
      }),
    ).toBe('Unknown Class');
  });
});
