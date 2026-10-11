/** Distinguishes quiz assignment rosters from classroom-wide student analytics lists. */
export type StudentListMode = 'quiz_assignment' | 'classroom_roster';

export const STUDENT_LIST_MODE_PARAM = 'listMode';

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
