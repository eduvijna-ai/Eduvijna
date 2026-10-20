import { loadStudentDashboardQuizzes } from './studentDashboardData.service';
import { useStudentAssignmentDashboardStore } from '../store/studentAssignmentDashboard.store';

/** Bumped when list data must not be treated as fresh by focus debounce. */
let studentDashboardListEpoch = 0;

export function getStudentDashboardListEpoch(): number {
  return studentDashboardListEpoch;
}

export function markStudentDashboardListStale(): void {
  studentDashboardListEpoch += 1;
}

/** Refetch check-record dashboard rows for the active student (post-submit / focus). */
export async function refreshStudentAssignmentDashboard(studentId: string): Promise<void> {
  markStudentDashboardListStale();
  const store = useStudentAssignmentDashboardStore.getState();
  const generation = store.beginLoad(studentId);
  const { quizzes } = await loadStudentDashboardQuizzes(studentId);
  const committed = store.commitLoad(studentId, generation, quizzes as never);
  if (committed) {
    markStudentDashboardListStale();
  }
}
