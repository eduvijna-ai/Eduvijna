import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import EducationalContent from './EducationalContent';
import LoadingSpinner from './LoadingSpinner';
import { getQuizExplanation } from '../core/services/sharedApi';
import {
  explanationAgreesWithVerifiedKey,
  normalizeSelectedAnswer,
  type PlayableQuizQuestion,
} from '@core/utils/answerMappingUtils';

// Types for the API request and response
interface ExplanationRequest {
  question_id: string;
  question_text: string;
  options: string[];
  selected_answer: string;
}

interface ExplanationResponse {
  question_id: string;
  correct_answer: string;
  explanation: {
    correct_reason: string;
    wrong_options: { [key: string]: string };
    educational_fact: string;
  };
}

// Component props interface
interface QuizExplanationAccordionProps {
  questionId: string;
  questionText: string;
  options: string[];
  selectedAnswer: string;
  correctAnswer?: string;
  clearTrigger: boolean; // Changes when a new quiz starts — triggers state reset
  colors: any; // Theme colors
}
const QuizExplanationAccordion: React.FC<QuizExplanationAccordionProps> = ({
  questionId,
  questionText,
  options,
  selectedAnswer,
  correctAnswer,
  clearTrigger,
  colors,
}) => {
  const [explanations, setExplanations] = useState<{ [key: string]: ExplanationResponse }>({});
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = React.useMemo(() => createStyles(colors), [colors]);

  // Reset state when clearTrigger changes (new quiz starts)
  useEffect(() => {
    setExplanations({});
    setIsOpen(false);
    setError(null);
  }, [clearTrigger]);

  const fetchExplanation = async () => {
    if (explanations[questionId]) {
      // Explanation already exists, just toggle accordion
      setIsOpen(!isOpen);
      return;
    }

    // Normalize before any network call so we can validate it first
    const normalizedSelectedAnswer = normalizeSelectedAnswer(selectedAnswer, options);

    // The API requires a non-empty selected_answer (matches web behavior where
    // the accordion is only rendered for answered questions).
    if (!normalizedSelectedAnswer) {
      setError('⚠️ Please select an answer before viewing the explanation.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {

      const requestBody: ExplanationRequest = {
        question_id: questionId,
        question_text: questionText,
        options: options,
        selected_answer: normalizedSelectedAnswer,
      };

      console.log('📤 Fetching explanation with payload:', requestBody);
      
      const data = await getQuizExplanation(requestBody);

      // Validate response structure
      if (!data || !data.explanation) {
        console.error('❌ Invalid explanation response:', data);
        throw new Error('Invalid response structure from API');
      }

      console.log('✅ Explanation received:', data);

      // Store explanation in state
      setExplanations((prev) => ({
        ...prev,
        [questionId]: data,
      }));

      setIsOpen(true);
    } catch (err: any) {
      console.error('❌ Failed to fetch explanation:', err);
      // err.response?.data?.detail can be a string, array, or object depending
      // on the server error format.  Always stringify safely.
      const rawDetail = err?.response?.data?.detail;
      let errorMessage: string;
      if (typeof rawDetail === 'string') {
        errorMessage = rawDetail;
      } else if (Array.isArray(rawDetail)) {
        errorMessage = rawDetail.map((d: any) => d?.msg || JSON.stringify(d)).join('; ');
      } else {
        errorMessage = err?.message || 'Unable to load explanation. Please try again.';
      }
      setError(`⚠️ ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = () => {
    if (explanations[questionId]) {
      setIsOpen(!isOpen);
    } else {
      fetchExplanation();
    }
  };

  const currentExplanation = explanations[questionId];
  const persistedKey = (correctAnswer && correctAnswer.trim().length > 0) ? correctAnswer.trim() : '';
  const verifiedQuestion: PlayableQuizQuestion = {
    question: questionText,
    options,
    correctAnswer: persistedKey || undefined,
    answer: persistedKey || undefined,
  };
  const apiCorrect = currentExplanation?.correct_answer?.trim() || '';
  const explanationContradictsKey =
    Boolean(persistedKey) &&
    Boolean(apiCorrect) &&
    !explanationAgreesWithVerifiedKey(verifiedQuestion, apiCorrect);
  // Without a verified persisted key, do not present generated correctness as authoritative.
  const explanationUnverified =
    !persistedKey && Boolean(currentExplanation);
  const quarantineExplanationBody = explanationContradictsKey || explanationUnverified;
  // Prefer verified attempt key only.
  const displayedCorrectAnswer = persistedKey || undefined;

  return (
    <View style={styles.container}>
      {/* Show Explanation Button */}
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleToggle}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <LoadingSpinner size={20} />
            <Text style={styles.buttonText}>Loading Explanation...</Text>
          </>
        ) : (
          <>
            <Text style={styles.buttonIcon}>
              {isOpen ? '▲' : '📚'}
            </Text>
            <Text style={styles.buttonText}>
              {currentExplanation ? (isOpen ? 'Hide Explanation' : 'Show Explanation') : 'Show Explanation'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Accordion Content */}
      {isOpen && currentExplanation && (
        <View style={styles.accordionContent}>
          {/* Correct Answer */}
          <View style={styles.correctAnswerSection}>
            <Text style={styles.correctAnswerHeader}>✅ Correct Answer</Text>
            {displayedCorrectAnswer ? (
              <View style={styles.mathBlock}>
                <EducationalContent content={displayedCorrectAnswer} />
              </View>
            ) : null}
            {quarantineExplanationBody ? (
              <Text style={styles.quarantineNote}>
                {explanationContradictsKey
                  ? 'Explanation unavailable: the explanation service conflicted with the verified assessment answer. Showing the verified answer only.'
                  : 'Explanation unavailable: no verified assessment answer key is available for this question.'}
              </Text>
            ) : (
              <View style={styles.mathBlock}>
                <EducationalContent content={currentExplanation.explanation.correct_reason} />
              </View>
            )}
          </View>

          {/* Incorrect Options — fully quarantined when explanation is untrusted */}
          {!quarantineExplanationBody
            ? Object.entries(currentExplanation.explanation.wrong_options).map(([option, reason]) => (
                <View key={option} style={styles.individualIncorrectSection}>
                  <Text style={styles.incorrectOptionHeader}>❌ {option.replace(/^option\d+\s*:?\s*/i, '')} — why it's wrong</Text>
                  <View style={styles.mathBlock}>
                    <EducationalContent content={reason as string} />
                  </View>
                </View>
              ))
            : null}

          {/* Educational Fact — quarantined with untrusted explanation content */}
          {!quarantineExplanationBody && currentExplanation.explanation.educational_fact ? (
            <View style={styles.educationalFactSection}>
              <Text style={styles.educationalFactHeader}>💡 Did you know?</Text>
              <View style={styles.mathBlock}>
                <EducationalContent content={currentExplanation.explanation.educational_fact} />
              </View>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      marginTop: 16,
    },
    button: {
      backgroundColor: colors.surface || colors.card,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonIcon: {
      fontSize: 18,
    },
    buttonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    errorContainer: {
      marginTop: 12,
      padding: 16,
      backgroundColor: '#fee2e2',
      borderLeftWidth: 4,
      borderLeftColor: '#ef4444',
      borderRadius: 8,
    },
    errorText: {
      color: '#991b1b',
      fontSize: 14,
      fontWeight: '500',
    },
    accordionContent: {
      marginTop: 4,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: 'hidden',
    },
    correctAnswerSection: {
      padding: 14,
      backgroundColor: '#dcfce7',
      borderLeftWidth: 4,
      borderLeftColor: '#10b981',
      marginBottom: 1,
    },
    correctAnswerHeader: {
      fontWeight: 'bold',
      fontSize: 14,
      color: '#065f46',
      marginBottom: 6,
    },
    quarantineNote: {
      marginTop: 8,
      marginBottom: 4,
      fontSize: 12,
      fontWeight: '600',
      color: '#92400e',
    },
    mathBlock: {
      marginTop: 4,
    },
    individualIncorrectSection: {
      padding: 14,
      backgroundColor: '#fee2e2',
      borderLeftWidth: 4,
      borderLeftColor: '#dc2626',
      marginBottom: 1,
    },
    incorrectOptionHeader: {
      fontWeight: 'bold',
      fontSize: 13,
      color: '#991b1b',
      marginBottom: 4,
    },
    educationalFactSection: {
      padding: 14,
      backgroundColor: '#dbeafe',
      borderLeftWidth: 4,
      borderLeftColor: '#3b82f6',
      marginBottom: 1,
    },
    educationalFactHeader: {
      fontWeight: 'bold',
      fontSize: 14,
      color: '#1e3a5f',
      marginBottom: 6,
    },
  });

export default QuizExplanationAccordion;
