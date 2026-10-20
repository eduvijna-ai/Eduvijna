import { resolveStudentListMode } from '../core/types/studentListNavigation.types';

describe('resolveStudentListMode', () => {
  it('prefers explicit quiz_assignment when quizId and classroomId are both present', () => {
    expect(
      resolveStudentListMode({
        listMode: 'quiz_assignment',
        quizId: 479,
      }),
    ).toBe('quiz_assignment');
  });

  it('defaults to quiz_assignment when quizId is set without listMode', () => {
    expect(resolveStudentListMode({ quizId: 10 })).toBe('quiz_assignment');
  });

  it('uses classroom_roster when only classroom context is provided', () => {
    expect(resolveStudentListMode({ quizId: null })).toBe('classroom_roster');
  });
});
