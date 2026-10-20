import {
  checkRecordAssignmentKey,
  checkRecordRowEffectiveStatus,
} from '../core/services/checkRecordAssignmentIdentity';
import { dedupeCheckRecordQuizzes } from '../core/services/studentCheckRecordDashboardLoader';

describe('checkRecordAssignmentIdentity', () => {
  it('keys nested quiz_details quiz_id and session_id with class scope', () => {
    const key = checkRecordAssignmentKey({
      classid: 'class-a',
      status: null,
      quiz_details: {
        quiz_id: 9,
        session_id: 'sess-1',
        topic: 'T',
        summary: '',
        start_time: '',
        end_time: '',
        duration: 0,
        has_time_limit: false,
        question_count: 1,
        questions: { quizzes: [] },
        status: 'active',
        is_active: true,
        is_public: false,
      },
    });
    expect(key).toBe('9::sess-1::class-a');
  });

  it('dedupe keeps distinct sessions for the same quiz_id', () => {
    const rows = dedupeCheckRecordQuizzes([
      {
        classid: 'c1',
        status: null,
        quiz_details: {
          quiz_id: 5,
          session_id: 's1',
          topic: 'A',
          summary: '',
          start_time: '2026-01-01T00:00:00Z',
          end_time: '',
          duration: 0,
          has_time_limit: false,
          question_count: 1,
          questions: { quizzes: [] },
          status: 'active',
          is_active: true,
          is_public: false,
          created_at: '2026-01-01T00:00:00Z',
        },
      },
      {
        classid: 'c1',
        status: null,
        quiz_details: {
          quiz_id: 5,
          session_id: 's2',
          topic: 'B',
          summary: '',
          start_time: '2026-01-02T00:00:00Z',
          end_time: '',
          duration: 0,
          has_time_limit: false,
          question_count: 1,
          questions: { quizzes: [] },
          status: 'active',
          is_active: true,
          is_public: false,
          created_at: '2026-01-02T00:00:00Z',
        },
      },
    ]);
    expect(rows).toHaveLength(2);
  });

  it('completed wins only for the same assignment identity', () => {
    const rows = dedupeCheckRecordQuizzes([
      {
        classid: 'c1',
        status: null,
        quiz_details: {
          quiz_id: 1,
          session_id: 's1',
          topic: 'pending',
          summary: '',
          start_time: '',
          end_time: '',
          duration: 0,
          has_time_limit: false,
          question_count: 1,
          questions: { quizzes: [] },
          status: 'active',
          is_active: true,
          is_public: false,
          created_at: '2026-01-03T00:00:00Z',
        },
      },
      {
        classid: 'c1',
        status: 'completed',
        quiz_details: {
          quiz_id: 1,
          session_id: 's1',
          topic: 'done',
          summary: '',
          start_time: '',
          end_time: '',
          duration: 0,
          has_time_limit: false,
          question_count: 1,
          questions: { quizzes: [] },
          status: 'completed',
          is_active: true,
          is_public: false,
          created_at: '2026-01-01T00:00:00Z',
        },
      },
      {
        classid: 'c1',
        status: null,
        quiz_details: {
          quiz_id: 1,
          session_id: 's2',
          topic: 'other session',
          summary: '',
          start_time: '',
          end_time: '',
          duration: 0,
          has_time_limit: false,
          question_count: 1,
          questions: { quizzes: [] },
          status: 'active',
          is_active: true,
          is_public: false,
          created_at: '2026-01-04T00:00:00Z',
        },
      },
    ]);
    expect(rows).toHaveLength(2);
    const s1 = rows.find((r) => r.quiz_details?.session_id === 's1');
    expect(checkRecordRowEffectiveStatus(s1!)).toBe('completed');
  });
});
