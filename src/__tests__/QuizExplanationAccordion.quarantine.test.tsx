import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import QuizExplanationAccordion from '../components/QuizExplanationAccordion';

jest.mock('../core/services/sharedApi', () => ({
  getQuizExplanation: jest.fn(),
}));

jest.mock('../components/EducationalContent', () => {
  const { Text } = require('react-native');
  return ({ content }: { content: string }) => <Text>{content}</Text>;
});

jest.mock('../components/LoadingSpinner', () => 'LoadingSpinner');

const { getQuizExplanation } = jest.requireMock('../core/services/sharedApi');

const OPTIONS = [
  'the digital literacy campaign launched in 2015',
  'the cleanliness campaign launched on 2 October 2014',
  'the rural employment scheme launched in 2005',
  'the girl-child education campaign launched in 2015',
];

const colors = {
  surface: '#fff',
  card: '#fff',
  border: '#ccc',
  text: '#000',
  textSecondary: '#666',
  primary: '#0a0',
  danger: '#c00',
  success: '#080',
};

describe('QuizExplanationAccordion quarantine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hides conflicting reason / wrong_options / fact when explanation key contradicts verified answer', async () => {
    getQuizExplanation.mockResolvedValue({
      correct_answer: OPTIONS[2],
      explanation: {
        correct_reason: 'CONFLICTING_REASON_MUST_NOT_RENDER',
        wrong_options: {
          option1: 'CONFLICTING_WRONG_OPTION_MUST_NOT_RENDER',
        },
        educational_fact: 'CONFLICTING_FACT_MUST_NOT_RENDER',
      },
    });

    const { getByText, queryByText } = render(
      <QuizExplanationAccordion
        questionId="swachh-1"
        questionText="In the matching activity, which description is paired with Swachh Bharat Abhiyan?"
        options={OPTIONS}
        selectedAnswer={OPTIONS[0]}
        correctAnswer={OPTIONS[1]}
        clearTrigger={false}
        colors={colors}
      />,
    );

    fireEvent.press(getByText('Show Explanation'));

    await waitFor(
      () => {
        expect(getByText(/Explanation unavailable/i)).toBeTruthy();
      },
      { timeout: 10000 },
    );

    expect(getByText(OPTIONS[1])).toBeTruthy();
    expect(queryByText('CONFLICTING_REASON_MUST_NOT_RENDER')).toBeNull();
    expect(queryByText('CONFLICTING_WRONG_OPTION_MUST_NOT_RENDER')).toBeNull();
    expect(queryByText('CONFLICTING_FACT_MUST_NOT_RENDER')).toBeNull();
  }, 15000);

  it('quarantines generated answer and body when no verified persisted key exists', async () => {
    getQuizExplanation.mockResolvedValue({
      correct_answer: OPTIONS[1],
      explanation: {
        correct_reason: 'UNVERIFIED_REASON_MUST_NOT_RENDER',
        wrong_options: {
          option1: 'UNVERIFIED_WRONG_OPTION_MUST_NOT_RENDER',
        },
        educational_fact: 'UNVERIFIED_FACT_MUST_NOT_RENDER',
      },
    });

    const { getByText, queryByText } = render(
      <QuizExplanationAccordion
        questionId="swachh-nokey"
        questionText="In the matching activity, which description is paired with Swachh Bharat Abhiyan?"
        options={OPTIONS}
        selectedAnswer={OPTIONS[0]}
        clearTrigger={false}
        colors={colors}
      />,
    );

    fireEvent.press(getByText('Show Explanation'));

    await waitFor(
      () => {
        expect(getByText(/no verified assessment answer key/i)).toBeTruthy();
      },
      { timeout: 10000 },
    );

    expect(queryByText(OPTIONS[1])).toBeNull();
    expect(queryByText('UNVERIFIED_REASON_MUST_NOT_RENDER')).toBeNull();
    expect(queryByText('UNVERIFIED_WRONG_OPTION_MUST_NOT_RENDER')).toBeNull();
    expect(queryByText('UNVERIFIED_FACT_MUST_NOT_RENDER')).toBeNull();
  }, 15000);
});
