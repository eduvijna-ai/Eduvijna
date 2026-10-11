/** Distinguishes quiz assignment rosters from classroom-wide student analytics lists. */
export type StudentListMode = 'quiz_assignment' | 'classroom_roster';

export const STUDENT_LIST_MODE_PARAM = 'listMode';

/** Teacher assessment row used when opening a quiz assignment student roster. */
export type QuizAssignmentListSource = {
  quiz_id: number;
  quiz_name?: string;
  session_id?: string | null;
  classroom_id?: string | null;
  class_id?: string | null;
  classroom_name?: string | null;
  start_time?: string | null;
};

export type QuizAssignmentStudentListParams = {
  quizId: number;
  quizName: string;
  sessionId?: string;
  classroomId?: string;
  listMode: 'quiz_assignment';
};

export function buildQuizAssignmentStudentListParams(
  assignment: QuizAssignmentListSource,
): QuizAssignmentStudentListParams {
  return {
    quizId: assignment.quiz_id,
    quizName: assignment.quiz_name || 'Quiz',
    sessionId: assignment.session_id ? String(assignment.session_id) : undefined,
    classroomId: assignment.classroom_id
      ? String(assignment.classroom_id)
      : assignment.class_id
        ? String(assignment.class_id)
        : undefined,
    listMode: 'quiz_assignment',
  };
}

export function buildOpenStudentsAccessibilityLabel(assignment: QuizAssignmentListSource): string {
  const classroom = assignment.classroom_name?.trim() || 'class';
  const title = assignment.quiz_name?.trim() || 'assessment';
  if (assignment.start_time) {
    const when = new Date(assignment.start_time).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `View students for ${title} in ${classroom}, ${when}`;
  }
  return `View students for ${title} in ${classroom}`;
}

export function resolveStudentListMode(params: {
  listMode?: StudentListMode;
  quizId?: number | string | null;
}): StudentListMode {
  if (params.listMode === 'quiz_assignment' || params.listMode === 'classroom_roster') {
    return params.listMode;
  }
  if (params.quizId != null && params.quizId !== '') {
    return 'quiz_assignment';
  }
  return 'classroom_roster';
}
