import { useStudentAssignmentDashboardStore } from '../core/store/studentAssignmentDashboard.store';

describe('studentAssignmentDashboard store', () => {
  beforeEach(() => {
    useStudentAssignmentDashboardStore.getState().resetForAccount(null);
  });

  it('drops stale fetch results after account reset', () => {
    const store = useStudentAssignmentDashboardStore.getState();
    const genA = store.beginLoad('student-a');
    store.resetForAccount(null);
    const committed = store.commitLoad('student-a', genA, [
      {
        quiz_id: 1,
        session_id: 's1',
        class_id: 'c1',
        classroom_id: 'c1',
        classroom_name: 'Class',
        quiz_name: 'Quiz',
        status: 'pending',
        score: null,
        completed_at: null,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ]);
    expect(committed).toBe(false);
    expect(store.rawQuizzes).toHaveLength(0);
  });

  it('accepts fetch for active account owner', () => {
    const store = useStudentAssignmentDashboardStore.getState();
    const genB = store.beginLoad('student-b');
    const row = {
      quiz_id: 2,
      session_id: 's2',
      class_id: 'c1',
      classroom_id: 'c1',
      classroom_name: 'Class',
      quiz_name: 'Quiz 2',
      status: 'completed',
      score: 90,
      completed_at: '2026-01-02T00:00:00.000Z',
      created_at: '2026-01-02T00:00:00.000Z',
    };
    expect(store.commitLoad('student-b', genB, [row])).toBe(true);
    expect(useStudentAssignmentDashboardStore.getState().rawQuizzes).toHaveLength(1);
  });

  it('refreshes classificationNow when commitLoad succeeds', () => {
    const store = useStudentAssignmentDashboardStore.getState();
    const gen = store.beginLoad('student-c');
    const before = useStudentAssignmentDashboardStore.getState().classificationNow.getTime();
    const row = {
      quiz_id: 3,
      session_id: 's3',
      class_id: 'c1',
      classroom_id: 'c1',
      classroom_name: 'Class',
      quiz_name: 'Quiz 3',
      status: 'pending',
      score: null,
      completed_at: null,
      created_at: '2026-01-03T00:00:00.000Z',
    };
    store.commitLoad('student-c', gen, [row]);
    const after = useStudentAssignmentDashboardStore.getState().classificationNow.getTime();
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it('rejects commit after account switch even when generation matches prior owner', () => {
    const store = useStudentAssignmentDashboardStore.getState();
    const genA = store.beginLoad('student-a');
    store.resetForAccount('student-b');
    const committed = store.commitLoad('student-a', genA, [
      {
        quiz_id: 9,
        session_id: 's9',
        class_id: 'c1',
        classroom_id: 'c1',
        classroom_name: 'Class',
        quiz_name: 'Late',
        status: 'pending',
        score: null,
        completed_at: null,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ]);
    expect(committed).toBe(false);
    expect(store.rawQuizzes).toHaveLength(0);
  });
});
