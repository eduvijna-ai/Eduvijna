import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import WebNavigation from '../platforms/web/navigation/WebNavigation';
import { handleOpenQuiz } from '../core/services/openQuizHandler';
jest.mock('../core/services/openQuizHandler', () => ({
  handleOpenQuiz: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@core/services/gradedNotificationRouting.service', () => ({
  resolveStudentGradedAssignmentSession: jest.fn().mockResolvedValue({
    kind: 'resolved',
    sessionId: 'sess-resolved',
    classroomId: 'class-1',
  }),
}));

jest.mock('@core/services/assessmentQuizStart.service', () => ({
  executeStudentAssignedQuizViewResults: jest.fn().mockResolvedValue({ kind: 'view_results' }),
}));

jest.mock('@core/hooks/useAuth', () => ({
  useAuth: () => ({
    logout: jest.fn(),
    user: { id: 70, role: 'student', username: 'demo_student' },
  }),
}));

jest.mock('@core/store/user.store', () => ({
  useUserStore: (selector: (s: { user: unknown }) => unknown) =>
    selector({ user: { id: 70, role: 'student' } }),
}));

jest.mock('@core/hooks/useNotifications', () => ({
  __esModule: true,
  default: () => ({
    notifications: [
      {
        id: 'n1',
        type: 'quiz_assigned',
        title: 'Quiz',
        data: { session_id: 'sess-abc', quiz_id: 12 },
      },
    ],
    unreadCount: 1,
    loading: false,
    markNotificationRead: jest.fn().mockResolvedValue(undefined),
    markAllNotificationsRead: jest.fn(),
  }),
}));

jest.mock('../components/NotificationBell', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return function MockBell({ onPress }: { onPress: () => void }) {
    return (
      <TouchableOpacity testID="open-bell" onPress={onPress}>
        <Text>Bell</Text>
      </TouchableOpacity>
    );
  };
});

jest.mock('../components/NotificationsDropdown', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return function MockDropdown({ notifications, onNotificationClick }: any) {
    return (
      <TouchableOpacity
        testID="notification-item"
        onPress={() => onNotificationClick(notifications[0])}
      >
        <Text>Open</Text>
      </TouchableOpacity>
    );
  };
});

describe('WebNavigation notification bell', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('routes bell taps through handleOpenQuiz with session params', async () => {
    const onNavigate = jest.fn();
    const { getByTestId } = render(
      <WebNavigation activeScreen="dashboard" onNavigate={onNavigate}>
        <></>
      </WebNavigation>,
    );

    fireEvent.press(getByTestId('open-bell'));
    fireEvent.press(getByTestId('notification-item'));

    await waitFor(() => {
      expect(handleOpenQuiz).toHaveBeenCalledWith(
        'sess-abc',
        'notification',
        expect.objectContaining({ role: 'student' }),
        expect.objectContaining({ navigate: expect.any(Function) }),
      );
    });

    const adapter = (handleOpenQuiz as jest.Mock).mock.calls[0][3];
    adapter.navigate('QuizTakingScreen', { sessionId: 'sess-abc' });
    expect(onNavigate).toHaveBeenCalledWith('QuizTakingScreen', { sessionId: 'sess-abc' });
  });

});
