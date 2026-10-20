import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import WebNavigation from '../platforms/web/navigation/WebNavigation';
import { executeStudentAssignedQuizViewResults } from '@core/services/assessmentQuizStart.service';

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
        id: 'g1',
        type: 'quiz_graded',
        title: 'Graded',
        data: { quiz_id: 44 },
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

describe('WebNavigation quiz_graded routing', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('resolves missing session_id before opening results', async () => {
    const onNavigate = jest.fn();
    const { getByTestId } = render(
      <WebNavigation activeScreen="dashboard" onNavigate={onNavigate}>
        <></>
      </WebNavigation>,
    );
    fireEvent.press(getByTestId('open-bell'));
    fireEvent.press(getByTestId('notification-item'));

    await waitFor(() => {
      expect(executeStudentAssignedQuizViewResults).toHaveBeenCalledWith(
        expect.objectContaining({
          quizId: 44,
          sessionId: 'sess-resolved',
        }),
        expect.any(Object),
      );
    });
  });
});
