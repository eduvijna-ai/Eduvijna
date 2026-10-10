import {
  collectAssignmentBoundaryTimes,
  reapplyStudentAssignmentClassification,
} from '../utils/reapplyStudentAssignmentClassification';

describe('reapplyStudentAssignmentClassification', () => {
  it('marks future start as upcoming at classification time', () => {
    const start = new Date(Date.now() + 60_000).toISOString();
    const row = reapplyStudentAssignmentClassification(
      {
        status: 'pending',
        start_time: start,
        end_time: new Date(Date.now() + 120_000).toISOString(),
        has_time_limit: true,
      },
      new Date(),
    );
    expect(row.status).toBe('upcoming');
    expect(row.availability_status).toBe('coming soon');
  });

  it('collects future boundary instants', () => {
    const start = new Date(Date.now() + 5_000).toISOString();
    const times = collectAssignmentBoundaryTimes(
      [{ start_time: start, end_time: null, has_time_limit: true }],
      new Date(),
    );
    expect(times.length).toBe(1);
    expect(times[0]).toBeGreaterThan(Date.now());
  });
});
