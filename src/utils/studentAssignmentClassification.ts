/**
 * Student assignment row classification (Quiz-React parity).
 * Uses completion state, availability, start/end window, and has_time_limit.
 */

export type StudentAssignmentAvailability = 'active' | 'coming soon' | 'expired';

export type StudentAssignmentDisplayStatus =
  | 'completed'
  | 'missed'
  | 'in_progress'
  | 'pending'
  | 'upcoming';

export type StudentAssignmentClassifyInput = {
  recordStatus: null | string;
  started_at?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  has_time_limit?: boolean;
  is_active?: boolean;
  now?: Date;
};

export function deriveStudentAssignmentAvailability(
  input: Pick<
    StudentAssignmentClassifyInput,
    'start_time' | 'end_time' | 'has_time_limit' | 'is_active' | 'now'
  >,
): StudentAssignmentAvailability {
  const now = input.now ?? new Date();
  const hasTimeLimit = input.has_time_limit ?? true;

  if (input.is_active === false) {
    return 'expired';
  }

  if (!hasTimeLimit) {
    return input.is_active === false ? 'expired' : 'active';
  }

  const startMs = input.start_time ? new Date(input.start_time).getTime() : NaN;
  const endMs = input.end_time ? new Date(input.end_time).getTime() : NaN;

  if (!Number.isNaN(startMs) && now.getTime() < startMs) {
    return 'coming soon';
  }
  if (!Number.isNaN(endMs) && now.getTime() > endMs) {
    return 'expired';
  }
  return 'active';
}

export function deriveStudentAssignmentDisplayStatus(
  input: StudentAssignmentClassifyInput,
): StudentAssignmentDisplayStatus {
  const availability = deriveStudentAssignmentAvailability(input);
  const raw = input.recordStatus;

  if (raw === 'completed') {
    return 'completed';
  }

  const started = Boolean(input.started_at);
  const rawLower = raw != null ? String(raw).toLowerCase() : '';
  const inProgress =
    started || rawLower === 'in_progress' || rawLower === 'started';

  if (availability === 'expired') {
    return 'missed';
  }
  if (availability === 'coming soon') {
    return 'upcoming';
  }
  if (inProgress) {
    return 'in_progress';
  }
  return 'pending';
}

export function classifyStudentAssignmentRow(
  input: StudentAssignmentClassifyInput,
): {
  availability_status: StudentAssignmentAvailability;
  status: StudentAssignmentDisplayStatus;
  student_status: StudentAssignmentDisplayStatus;
} {
  const availability_status = deriveStudentAssignmentAvailability(input);
  const status = deriveStudentAssignmentDisplayStatus({
    ...input,
    recordStatus: input.recordStatus,
  });
  return {
    availability_status,
    status,
    student_status: status,
  };
}

export function canStudentStartAssignment(quiz: {
  status?: string;
  availability_status?: string;
}): boolean {
  return quiz.status === 'pending' && quiz.availability_status === 'active';
}

export function canStudentResumeAssignment(quiz: {
  status?: string;
  availability_status?: string;
}): boolean {
  return (
    (quiz.status === 'in_progress' || quiz.status === 'started') &&
    quiz.availability_status === 'active'
  );
}

export function isStudentAssignmentOngoing(quiz: {
  status?: string;
  availability_status?: string;
}): boolean {
  if (quiz.status === 'completed' || quiz.status === 'missed' || quiz.status === 'upcoming') {
    return false;
  }
  if (quiz.availability_status !== 'active') {
    return false;
  }
  return (
    quiz.status === 'pending' ||
    quiz.status === 'in_progress' ||
    quiz.status === 'started'
  );
}

export function isStudentAssignmentMissed(quiz: { status?: string }): boolean {
  return quiz.status === 'missed';
}

export function isStudentAssignmentCompleted(quiz: { status?: string }): boolean {
  return quiz.status === 'completed';
}
