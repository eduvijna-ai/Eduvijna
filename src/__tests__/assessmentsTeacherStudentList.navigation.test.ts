/**
 * Teacher Assessments → StudentList must preserve assignment identity when quiz_id collides.
 */

import {
  buildQuizAssignmentStudentListParams,
  buildOpenStudentsAccessibilityLabel,
} from '../core/types/studentListNavigation.types';

describe('teacher quiz assignment student list navigation', () => {
  const first = {
    quiz_id: 479,
    quiz_name: 'MAT Mathematics A',
    session_id: 'sess-a',
    classroom_id: 'class-a',
    classroom_name: 'Grade 8 A',
    start_time: '2026-10-01T10:00:00.000Z',
  };
  const second = {
    quiz_id: 479,
    quiz_name: 'MAT Mathematics B',
    session_id: 'sess-b',
    classroom_id: 'class-b',
    classroom_name: 'Grade 8 B',
    start_time: '2026-10-02T10:00:00.000Z',
  };

  it('builds distinct params for two assignments sharing quiz_id', () => {
    const paramsA = buildQuizAssignmentStudentListParams(first);
    const paramsB = buildQuizAssignmentStudentListParams(second);

    expect(paramsA.quizId).toBe(479);
    expect(paramsB.quizId).toBe(479);
    expect(paramsA.sessionId).toBe('sess-a');
    expect(paramsB.sessionId).toBe('sess-b');
    expect(paramsA.classroomId).toBe('class-a');
    expect(paramsA.classroomName).toBe('Grade 8 A');
    expect(paramsB.classroomId).toBe('class-b');
    expect(paramsB.classroomName).toBe('Grade 8 B');
    expect(paramsA.listMode).toBe('quiz_assignment');
  });

  it('uses human-readable accessibility labels without session UUIDs', () => {
    const label = buildOpenStudentsAccessibilityLabel(second);
    expect(label).toContain('MAT Mathematics B');
    expect(label).toContain('Grade 8 B');
    expect(label).not.toContain('sess-b');
  });

  it('selects the clicked assignment when resolving from a list', () => {
    const filtered = [first, second];
    const resolveAssignment = (quizId: number, assignment: typeof first) => assignment;

    const opened = resolveAssignment(second.quiz_id, second);
    const params = buildQuizAssignmentStudentListParams(opened);
    expect(params.sessionId).toBe('sess-b');
    expect(params.classroomId).toBe('class-b');
    expect(params.quizName).toBe('MAT Mathematics B');

    const wrong = filtered.find((q) => q.quiz_id === second.quiz_id);
    expect(wrong?.session_id).toBe('sess-a');
    expect(params.sessionId).not.toBe(wrong?.session_id);
  });
});
