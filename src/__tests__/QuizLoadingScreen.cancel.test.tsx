import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import QuizLoadingScreen from '../screens/QuizLoadingScreen';
import {
  __resetOpenQuizRequestGuardForTests,
  beginOpenQuizRequest,
  isOpenQuizRequestCurrent,
} from '../core/services/openQuizRequestGuard';

jest.mock('@context/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        background: '#fff',
        text: '#000',
        textSecondary: '#666',
        primary: '#0a0',
        border: '#ccc',
      },
    },
  }),
}));

jest.mock('@platforms/mobile/navigation/navigateToAppMainTab', () => ({
  navigateToAppMainTab: jest.fn(),
}));

const { navigateToAppMainTab } = jest.requireMock(
  '@platforms/mobile/navigation/navigateToAppMainTab',
);

describe('QuizLoadingScreen Cancel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetOpenQuizRequestGuardForTests();
  });

  it('Cancel uses screen navigation adapter and invalidates open-quiz request', () => {
    const gen = beginOpenQuizRequest();
    const navigate = jest.fn();
    const replace = jest.fn();
    const dispatch = jest.fn();

    const { getByLabelText } = render(
      <QuizLoadingScreen
        navigation={{ navigate, replace, dispatch }}
        route={{ params: { message: 'Validating quiz...' } }}
      />,
    );

    fireEvent.press(getByLabelText('Cancel quiz validation'));

    expect(isOpenQuizRequestCurrent(gen)).toBe(false);
    expect(dispatch).toHaveBeenCalled();
    expect(navigateToAppMainTab).not.toHaveBeenCalled();
  });
});
