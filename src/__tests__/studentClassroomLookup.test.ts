import {
  clearClassroomLookupCache,
  effectiveClassroomNameMap,
  loadScopedStudentClassroomNameLookup,
} from '../core/services/studentClassroomLookup';

describe('scoped student classroom lookup', () => {
  beforeEach(() => {
    clearClassroomLookupCache();
  });

  it('returns ok with map on success and caches prior for the scope', async () => {
    const map = new Map([['class_aaa', '4A-Telugu']]);
    const first = await loadScopedStudentClassroomNameLookup(
      { userId: 's1', schoolId: 7 },
      { fetchFn: async () => map, retries: 0 },
    );
    expect(first.status).toBe('ok');
    if (first.status === 'ok') {
      expect(first.map.get('class_aaa')).toBe('4A-Telugu');
    }

    const failed = await loadScopedStudentClassroomNameLookup(
      { userId: 's1', schoolId: 7 },
      {
        fetchFn: async () => {
          throw new Error('network');
        },
        retries: 0,
      },
    );
    expect(failed.status).toBe('failed');
    if (failed.status === 'failed') {
      expect(failed.priorMap?.get('class_aaa')).toBe('4A-Telugu');
      expect(effectiveClassroomNameMap(failed).get('class_aaa')).toBe('4A-Telugu');
    }
  });

  it('does not reuse prior map across different account/school scopes', async () => {
    await loadScopedStudentClassroomNameLookup(
      { userId: 's1', schoolId: 7 },
      { fetchFn: async () => new Map([['class_aaa', '4A-Telugu']]), retries: 0 },
    );
    const other = await loadScopedStudentClassroomNameLookup(
      { userId: 's2', schoolId: 7 },
      {
        fetchFn: async () => {
          throw new Error('network');
        },
        retries: 0,
      },
    );
    expect(other.status).toBe('failed');
    if (other.status === 'failed') {
      expect(other.priorMap).toBeNull();
      expect(effectiveClassroomNameMap(other).size).toBe(0);
    }
  });

  it('retries once before failing', async () => {
    let calls = 0;
    const result = await loadScopedStudentClassroomNameLookup(
      { userId: 's1', schoolId: 1 },
      {
        retries: 1,
        fetchFn: async () => {
          calls += 1;
          if (calls === 1) throw new Error('transient');
          return new Map([['class_b', 'DEV_MATRIX']]);
        },
      },
    );
    expect(calls).toBe(2);
    expect(result.status).toBe('ok');
  });
});
