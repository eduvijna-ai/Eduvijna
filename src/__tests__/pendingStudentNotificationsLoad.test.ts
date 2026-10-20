import {
  canApplyPendingNotificationsResult,
  getPendingStudentNotificationsLoadGeneration,
  invalidatePendingStudentNotificationsLoads,
  loadPendingStudentNotifications,
  usesTeacherNotificationsPath,
} from '../core/services/pendingStudentNotificationsLoad';

describe('pendingStudentNotificationsLoad', () => {
  beforeEach(() => {
    invalidatePendingStudentNotificationsLoads();
  });

  it('treats instructor and teacher as the teacher notifications path', () => {
    expect(usesTeacherNotificationsPath('instructor')).toBe(true);
    expect(usesTeacherNotificationsPath('teacher')).toBe(true);
    expect(usesTeacherNotificationsPath('admin')).toBe(true);
    expect(usesTeacherNotificationsPath('student')).toBe(false);
  });

  it('one refresh / concurrent identical scope produces one underlying load', async () => {
    let checkCalls = 0;
    let lookupCalls = 0;
    const fetchCheckRecord = jest.fn(async () => {
      checkCalls += 1;
      await new Promise((r) => setTimeout(r, 40));
      return { result: [] };
    });
    const loadClassroomLookup = jest.fn(async () => {
      lookupCalls += 1;
      return {
        status: 'ok' as const,
        scopeKey: '70::1',
        map: new Map<string, string>(),
      };
    });

    const scope = { userId: '70', schoolId: 1, role: 'student' };
    const getCurrentScope = () => scope;

    const [a, b] = await Promise.all([
      loadPendingStudentNotifications(scope, { getCurrentScope, fetchCheckRecord, loadClassroomLookup }),
      loadPendingStudentNotifications(scope, { getCurrentScope, fetchCheckRecord, loadClassroomLookup }),
    ]);

    expect(a.kind).toBe('ok');
    expect(b.kind).toBe('ok');
    expect(checkCalls).toBe(1);
    expect(lookupCalls).toBe(1);
    expect(fetchCheckRecord).toHaveBeenCalledTimes(1);
  });

  it('account switch during a pending request yields stale and does not apply to the new session', async () => {
    let resolveCheck!: (value: { result: unknown[] }) => void;
    const fetchCheckRecord = jest.fn(
      () =>
        new Promise<{ result: unknown[] }>((resolve) => {
          resolveCheck = resolve;
        }),
    );
    const loadClassroomLookup = jest.fn(async () => ({
      status: 'ok' as const,
      scopeKey: '70::1',
      map: new Map<string, string>([['c1', 'Class 1']]),
    }));

    let liveScope: { userId: string; schoolId: number; role: string } = {
      userId: '70',
      schoolId: 1,
      role: 'student',
    };
    const getCurrentScope = () => liveScope;

    const pending = loadPendingStudentNotifications(
      { userId: '70', schoolId: 1, role: 'student' },
      { getCurrentScope, fetchCheckRecord, loadClassroomLookup },
    );

    // Switch account while first load is in flight.
    liveScope = { userId: '99', schoolId: 2, role: 'student' };
    invalidatePendingStudentNotificationsLoads();

    resolveCheck({ result: [] });
    const first = await pending;

    expect(first.kind).toBe('stale');
    expect(canApplyPendingNotificationsResult(first, getCurrentScope)).toBe(false);

    const second = await loadPendingStudentNotifications(
      { userId: '99', schoolId: 2, role: 'student' },
      {
        getCurrentScope,
        fetchCheckRecord: async () => ({ result: [] }),
        loadClassroomLookup: async () => ({
          status: 'ok' as const,
          scopeKey: '99::2',
          map: new Map(),
        }),
      },
    );
    expect(second.kind).toBe('ok');
    if (second.kind === 'ok') {
      expect(second.data.scopeKey).toContain('99::2');
      expect(second.data.generation).toBe(getPendingStudentNotificationsLoadGeneration());
    }
    expect(canApplyPendingNotificationsResult(second, getCurrentScope)).toBe(true);
  });

  it('marks error results stale after logout invalidate so alerts must not fire', async () => {
    let rejectCheck!: (err: Error) => void;
    const fetchCheckRecord = jest.fn(
      () =>
        new Promise<never>((_, reject) => {
          rejectCheck = reject;
        }),
    );

    let liveScope: { userId: string; schoolId: number; role: string } | null = {
      userId: '70',
      schoolId: 1,
      role: 'student',
    };

    const pending = loadPendingStudentNotifications(
      { userId: '70', schoolId: 1, role: 'student' },
      {
        getCurrentScope: () => liveScope,
        fetchCheckRecord,
        loadClassroomLookup: async () => ({
          status: 'ok' as const,
          scopeKey: '70::1',
          map: new Map(),
        }),
      },
    );

    liveScope = null;
    invalidatePendingStudentNotificationsLoads();
    rejectCheck(new Error('network'));
    const result = await pending;
    expect(result.kind).toBe('stale');
    expect(canApplyPendingNotificationsResult(result, () => liveScope)).toBe(false);
  });
});
