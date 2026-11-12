import {
  navigatePushRootDestination,
  resolvePushRootNavigation,
} from '../platforms/mobile/navigation/pushNotificationRootNavigation';

describe('pushNotificationRootNavigation', () => {
  it('maps Notifications to nested Main tab route', () => {
    expect(resolvePushRootNavigation('Notifications')).toEqual({
      name: 'Main',
      params: { screen: 'Notifications' },
    });
  });

  it('preserves Assessments and QuizResultsScreen as root stack destinations', () => {
    expect(resolvePushRootNavigation('Assessments')).toEqual({ name: 'Assessments' });
    expect(
      resolvePushRootNavigation('QuizResultsScreen', { quizId: '9', isTeacherView: true }),
    ).toEqual({
      name: 'QuizResultsScreen',
      params: { quizId: '9', isTeacherView: true },
    });
  });

  it('forwards nested Main shape through navigatePushRootDestination', () => {
    const navigate = jest.fn();
    navigatePushRootDestination(navigate, 'Notifications');
    expect(navigate).toHaveBeenCalledWith('Main', { screen: 'Notifications' });
    navigate.mockClear();
    navigatePushRootDestination(navigate, 'Assessments');
    expect(navigate).toHaveBeenCalledWith('Assessments', undefined);
  });
});
