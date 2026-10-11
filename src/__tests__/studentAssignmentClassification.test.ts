import {
  canStudentStartAssignment,
  classifyStudentAssignmentRow,
  deriveStudentAssignmentDisplayStatus,
} from '../utils/studentAssignmentClassification';

const activeWindow = {
  has_time_limit: true,
  is_active: true,
  start_time: '2020-01-01T00:00:00.000Z',
  end_time: '2099-01-01T00:00:00.000Z',
};

describe('studentAssignmentClassification', () => {
  it('keeps completed regardless of expired window', () => {
    const row = classifyStudentAssignmentRow({
      recordStatus: 'completed',
      ...activeWindow,
      end_time: '2020-01-02T00:00:00.000Z',
      now: new Date('2026-01-01T00:00:00.000Z'),
    });
    expect(row.status).toBe('completed');
  });

  it('marks expired pending as missed', () => {
    const row = classifyStudentAssignmentRow({
      recordStatus: null,
      ...activeWindow,
      end_time: '2024-01-01T00:00:00.000Z',
      now: new Date('2026-01-01T00:00:00.000Z'),
    });
    expect(row.status).toBe('missed');
    expect(row.availability_status).toBe('expired');
  });

  it('marks future pending as upcoming without start action', () => {
    const row = classifyStudentAssignmentRow({
      recordStatus: null,
      ...activeWindow,
      start_time: '2099-06-01T00:00:00.000Z',
      now: new Date('2026-01-01T00:00:00.000Z'),
    });
    expect(row.status).toBe('upcoming');
    expect(row.availability_status).toBe('coming soon');
    expect(canStudentStartAssignment(row)).toBe(false);
  });

  it('allows start only for active pending', () => {
    const row = classifyStudentAssignmentRow({
      recordStatus: null,
      ...activeWindow,
      now: new Date('2026-01-01T00:00:00.000Z'),
    });
    expect(row.status).toBe('pending');
    expect(canStudentStartAssignment(row)).toBe(true);
  });

  it('untimed assignments stay active when is_active', () => {
    const status = deriveStudentAssignmentDisplayStatus({
      recordStatus: null,
      has_time_limit: false,
      is_active: true,
      now: new Date('2026-01-01T00:00:00.000Z'),
    });
    expect(status).toBe('pending');
  });

  it('marks inactive timed assignments as expired (excluded from pending)', () => {
    const row = classifyStudentAssignmentRow({
      recordStatus: null,
      ...activeWindow,
      is_active: false,
      now: new Date('2026-01-01T00:00:00.000Z'),
    });
    expect(row.availability_status).toBe('expired');
    expect(row.status).toBe('missed');
  });

  it('in_progress within window stays ongoing', () => {
    const row = classifyStudentAssignmentRow({
      recordStatus: null,
      started_at: '2026-01-01T10:00:00.000Z',
      ...activeWindow,
      now: new Date('2026-01-01T12:00:00.000Z'),
    });
    expect(row.status).toBe('in_progress');
    expect(row.availability_status).toBe('active');
  });
});
