import { loadStudentDashboardQuizzes } from './studentDashboardData.service';
import { useStudentAssignmentDashboardStore } from '../store/studentAssignmentDashboard.store';

/** Refetch check-record dashboard rows for the active student (post-submit / focus). */
export async function refreshStudentAssignmentDashboard(studentId: string): Promise<void> {
  const store = useStudentAssignmentDashboardStore.getState();
  const generation = store.beginLoad(studentId);
  const { quizzes } = await loadStudentDashboardQuizzes(studentId);
  store.commitLoad(studentId, generation, quizzes as never);
}
