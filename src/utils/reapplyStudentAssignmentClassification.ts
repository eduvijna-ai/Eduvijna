import { classifyStudentAssignmentRow } from './studentAssignmentClassification';

export type AssignmentClockQuiz = {
  status?: string;
  student_status?: string;
  started_at?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  has_time_limit?: boolean;
  availability_status?: string;
};

export function reapplyStudentAssignmentClassification<T extends AssignmentClockQuiz>(
  quiz: T,
  now: Date = new Date(),
): T {
  const recordStatus = quiz.student_status ?? quiz.status ?? null;
  const classified = classifyStudentAssignmentRow({
    recordStatus,
    started_at: quiz.started_at,
    start_time: quiz.start_time,
    end_time: quiz.end_time,
    has_time_limit: quiz.has_time_limit,
    now,
  });
  return {
    ...quiz,
    availability_status: classified.availability_status,
    status: classified.status,
    student_status: classified.student_status,
  };
}

/** Next start/end instants (ms) strictly after `now` for timed assignments. */
export function collectAssignmentBoundaryTimes(
  quizzes: AssignmentClockQuiz[],
  now: Date = new Date(),
): number[] {
  const nowMs = now.getTime();
  const times: number[] = [];
  for (const quiz of quizzes) {
    if (quiz.has_time_limit === false) continue;
    for (const raw of [quiz.start_time, quiz.end_time]) {
      if (!raw) continue;
      const ms = new Date(raw).getTime();
      if (!Number.isNaN(ms) && ms > nowMs) {
        times.push(ms);
      }
    }
  }
  return times.sort((a, b) => a - b);
}
