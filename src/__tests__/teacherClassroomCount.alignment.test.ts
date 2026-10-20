import {
  mapClassWiseStudentsToClassrooms,
  resolveAuthoritativeClassroomCount,
} from '../core/store/teacherDashboard.store';

describe('teacher classroom summary vs ClassesList alignment', () => {
  it('counts unique classroom_id entries from class_wise_students (not quiz uniqueness)', () => {
    const rows = [
      { classroom_id: 'c1', classroom_name: '4A Math', total_count: 10 },
      { classroom_id: 'c2', classroom_name: '4B Math', total_count: 12 },
      { classroom_id: 'c3', classroom_name: '5A Sci', total_count: 8 },
      { classroom_id: 'c4', classroom_name: '5B Sci', total_count: 9 },
      { classroom_id: 'c5', classroom_name: '6A Eng', total_count: 11 },
      // Duplicate id must not inflate count
      { classroom_id: 'c1', classroom_name: '4A Math', total_count: 10 },
    ];
    const classrooms = mapClassWiseStudentsToClassrooms(rows);
    expect(classrooms).toHaveLength(5);
    expect(classrooms.map((c) => c.classroom_id).sort()).toEqual([
      'c1',
      'c2',
      'c3',
      'c4',
      'c5',
    ]);
  });

  it('skips rows without a stable classroom identity', () => {
    expect(
      mapClassWiseStudentsToClassrooms([
        { classroom_name: 'Orphan' },
        { classroom_id: 'ok', classroom_name: 'OK' },
      ]),
    ).toHaveLength(1);
  });

  it('always uses unique classroom identities (never unverified reported totals)', () => {
    expect(
      resolveAuthoritativeClassroomCount({
        uniqueClassrooms: 5,
        reportedTotal: 5,
        hasMore: false,
      }),
    ).toBe(5);
    // Divergent total (e.g. assignment rows) must not inflate/deflate the KPI.
    expect(
      resolveAuthoritativeClassroomCount({
        uniqueClassrooms: 5,
        reportedTotal: 12,
        hasMore: false,
      }),
    ).toBe(5);
    expect(
      resolveAuthoritativeClassroomCount({
        uniqueClassrooms: 6,
        reportedTotal: 4,
        hasMore: false,
      }),
    ).toBe(6);
  });
});
