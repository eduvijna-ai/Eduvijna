import {
  computeStudentDashboardStats,
  dedupeStudentDashboardQuizzes,
  loadStudentDashboardQuizzes,
} from '../core/services/studentDashboardData.service';
import {
  checkRecordToQuiz,
  fetchQuizCheckRecord,
  fetchStudentClassroomNameLookup,
  fetchStudentQuizzes,
} from '../core/services/dashboardApi';

jest.mock('../core/services/dashboardApi', () => {
  const actual = jest.requireActual('../core/services/dashboardApi');
  return {
    ...actual,
    fetchQuizCheckRecord: jest.fn(),
    fetchStudentClassroomNameLookup: jest.fn(),
    fetchStudentQuizzes: jest.fn(),
  };
});

describe('studentDashboardData', () => {
  it('uses lookup when quiz_details omit classroom_name', () => {
    const row = checkRecordToQuiz(
      {
        status: null,
        classid: 'class_b3261be7',
        student_id: 's1',
        quiz_details: {
          quiz_id: 1,
          topic: 'Math',
          summary: '',
          session_id: 'sess-1',
          start_time: '2026-01-01T00:00:00.000Z',
          end_time: '2026-01-10T00:00:00.000Z',
          duration: 30,
          has_time_limit: true,
          question_count: 5,
          questions: { quizzes: [] },
          status: 'active',
          is_active: true,
          is_public: false,
        },
      },
      { classroomNameLookup: new Map([['class_b3261be7', '4A-Telugu']]) },
    );
    expect(row.classroom_name).toBe('4A-Telugu');
  });

  it('prefers classroom_name from quiz_details over raw class id', () => {
    const row = checkRecordToQuiz({
      status: null,
      classid: 'class_abc',
      student_id: 's1',
      quiz_details: {
        quiz_id: 1,
        topic: 'Math',
        summary: '',
        session_id: 'sess-1',
        start_time: '2026-01-01T00:00:00.000Z',
        end_time: '2026-01-10T00:00:00.000Z',
        duration: 30,
        has_time_limit: true,
        question_count: 5,
        questions: { quizzes: [] },
        status: 'active',
        is_active: true,
        is_public: false,
        classroom_name: 'Grade 8 — Algebra',
      },
    });
    expect(row.classroom_name).toBe('Grade 8 — Algebra');
  });

  it('does not use due date as completed_at when completion timestamp missing', () => {
    const row = checkRecordToQuiz({
      status: 'completed',
      classid: 'class_abc',
      student_id: 's1',
      quiz_details: {
        quiz_id: 2,
        topic: 'Done',
        summary: '',
        session_id: 'sess-2',
        start_time: '2026-01-01T00:00:00.000Z',
        end_time: '2026-01-10T00:00:00.000Z',
        duration: 30,
        has_time_limit: true,
        question_count: 5,
        questions: { quizzes: [] },
        status: 'active',
        is_active: true,
        is_public: false,
      },
    });
    expect(row.completed_at).toBeNull();
    expect(row.correct_answers).toBeUndefined();
  });

  it('dedupes by quiz_id + session_id keeping completed row', () => {
    const merged = dedupeStudentDashboardQuizzes([
      {
        quiz_id: 1,
        session_id: 's',
        class_id: 'c',
        classroom_id: 'c',
        classroom_name: 'Class',
        quiz_name: 'Q',
        status: 'pending',
        score: null,
        completed_at: null,
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        quiz_id: 1,
        session_id: 's',
        class_id: 'c',
        classroom_id: 'c',
        classroom_name: 'Class',
        quiz_name: 'Q',
        status: 'completed',
        score: 90,
        completed_at: '2026-01-02T00:00:00.000Z',
        created_at: '2026-01-02T00:00:00.000Z',
      },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].status).toBe('completed');
  });

  it('computes stats across pending and completed scopes', () => {
    const stats = computeStudentDashboardStats([
      {
        quiz_id: 1,
        session_id: 'a',
        class_id: 'c1',
        classroom_id: 'c1',
        classroom_name: 'A',
        quiz_name: 'One',
        status: 'pending',
        score: null,
        completed_at: null,
        created_at: '2026-01-01T00:00:00.000Z',
        availability_status: 'active',
        end_time: '2099-01-01T00:00:00.000Z',
      },
      {
        quiz_id: 2,
        session_id: 'b',
        class_id: 'c1',
        classroom_id: 'c1',
        classroom_name: 'A',
        quiz_name: 'Two',
        status: 'completed',
        score: 80,
        completed_at: '2026-01-02T00:00:00.000Z',
        created_at: '2026-01-02T00:00:00.000Z',
        time_spent_seconds: 120,
      },
    ] as any);
    expect(stats.total_quizzes).toBe(2);
    expect(stats.completed_count).toBe(1);
    expect(stats.pending_count).toBe(1);
    expect(stats.average_score).toBe(80);
  });

  it('preserves check-record rows when classroom lookup transport fails', async () => {
    const pendingRow = {
      status: null,
      classid: 'class_b3261be7',
      student_id: '70',
      quiz_details: {
        quiz_id: 11,
        topic: 'Lookup Resilience',
        summary: '',
        session_id: 'sess-resilience',
        start_time: '2026-01-01T00:00:00.000Z',
        end_time: '2099-01-01T00:00:00.000Z',
        duration: 30,
        has_time_limit: true,
        question_count: 3,
        questions: { quizzes: [] },
        status: 'active',
        is_active: true,
        is_public: false,
      },
    };
    (fetchQuizCheckRecord as jest.Mock).mockImplementation((_id: string, scope: string) =>
      Promise.resolve({ result: scope === 'pending' ? [pendingRow] : [] }),
    );
    (fetchStudentClassroomNameLookup as jest.Mock).mockRejectedValue(new Error('transport_failed'));
    (fetchStudentQuizzes as jest.Mock).mockResolvedValue({ data: [] });

    const { quizzes } = await loadStudentDashboardQuizzes('70');
    expect(quizzes).toHaveLength(1);
    expect(quizzes[0].quiz_name).toBe('Lookup Resilience');
    expect(String(quizzes[0].classroom_id)).toBe('class_b3261be7');
  });

  it('merges completed rows from student_total_details when check-record completed scope is empty', async () => {
    (fetchQuizCheckRecord as jest.Mock).mockResolvedValue({ result: [] });
    (fetchStudentClassroomNameLookup as jest.Mock).mockResolvedValue(new Map());
    (fetchStudentQuizzes as jest.Mock).mockResolvedValue({
      data: [
        {
          quiz_id: 479,
          session_id: 'a6882262-5c50-4cf5-a4a8-dc8786862916',
          classroom_id: 'class_4d82c60e',
          classroom_name: '4A-Mathematics',
          quiz_name: 'MAT_Mathematics_maths_20260827_1303',
          student_status: 'completed',
          status: 'completed',
          score: 60,
          completed_at: '2026-08-27T13:30:00.000Z',
          created_at: '2026-08-27T00:00:00.000Z',
          question_count: 10,
        },
      ],
    });

    const { quizzes, stats } = await loadStudentDashboardQuizzes('70');
    expect(quizzes).toHaveLength(1);
    expect(quizzes[0].status).toBe('completed');
    expect(stats.completed_count).toBe(1);
  });
});
