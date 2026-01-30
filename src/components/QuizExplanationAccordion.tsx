import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import MathRenderer from './MathRenderer';
import LoadingSpinner from './LoadingSpinner';
import { getQuizExplanation } from '../core/services/sharedApi';

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
  clearTrigger: boolean; // Changes when a new quiz starts — triggers state reset
  colors: any; // Theme colors
}

/**
 * Normalizes the selected answer to ensure it's the full option string
 * Handles cases where answer might be "A", "B", etc. or the full text
 */
const normalizeSelectedAnswer = (selectedAnswer: string, options: string[]): string => {
  // If it's a letter (A, B, C, D), convert to the actual option text
  if (selectedAnswer.length === 1 && /[A-D]/i.test(selectedAnswer)) {
    const index = selectedAnswer.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
    return options[index] || selectedAnswer;
  }
  return selectedAnswer;
};

const QuizExplanationAccordion: React.FC<QuizExplanationAccordionProps> = ({
  questionId,
  questionText,
  options,
  selectedAnswer,
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

    setIsLoading(true);
    setError(null);

    try {
      // Normalize the selected answer to ensure it's always the full option string
      const normalizedSelectedAnswer = normalizeSelectedAnswer(selectedAnswer, options);

      const requestBody: ExplanationRequest = {
        question_id: questionId,
        question_text: questionText,
        options: options,
        selected_answer: normalizedSelectedAnswer,
      };

      console.log('Request Payload:', requestBody); // Log the request payload for debugging
      
      try {
        const data = await getQuizExplanation(requestBody);

        // Store explanation in state
        setExplanations((prev) => ({
          ...prev,
          [questionId]: data,
        }));

        setIsOpen(true);
      } catch (err) {
        setError('⚠️ Unable to load explanation');
      } finally {
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error fetching explanation:', err);
      setError('⚠️ Unable to load explanation');
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
          {/* Correct Answer Section */}
          <View style={styles.correctAnswerSection}>
            <View style={styles.headerRow}>
              <Text style={styles.headerIcon}>✅</Text>
              <View style={styles.headerTextContainer}>
                <Text style={styles.correctHeaderText}>Correct Answer:</Text>
                <View style={styles.correctAnswerTextContainer}>
                  <MathRenderer text={currentExplanation.correct_answer} colors={colors} inline={true} />
                </View>
              </View>
            </View>
            <View style={styles.reasonContainer}>
              <MathRenderer text={currentExplanation.explanation.correct_reason} colors={colors} inline={false} />
            </View>
          </View>

          {/* Wrong Options Section */}
          {Object.keys(currentExplanation.explanation.wrong_options).length > 0 && (
            <View style={styles.wrongOptionsSection}>
              <View style={styles.wrongOptionsHeader}>
                <Text style={styles.wrongOptionsIcon}>❌</Text>
                <Text style={styles.wrongOptionsHeaderText}>Why other options are incorrect:</Text>
              </View>
              <View style={styles.wrongOptionsList}>
                {Object.entries(currentExplanation.explanation.wrong_options).map(([option, reason]) => (
                  <View key={option} style={styles.wrongOptionItem}>
                    <View style={styles.wrongOptionHeader}>
                      <MathRenderer text={option} colors={colors} inline={true} />
                    </View>
                    <View style={styles.wrongOptionReason}>
                      <MathRenderer text={reason} colors={colors} inline={false} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Educational Fact Section */}
          {currentExplanation.explanation.educational_fact && (
            <View style={styles.educationalFactSection}>
              <View style={styles.educationalFactHeader}>
                <Text style={styles.educationalFactIcon}>📘</Text>
                <Text style={styles.educationalFactHeaderText}>Educational Fact</Text>
              </View>
              <View style={styles.educationalFactContent}>
                <MathRenderer text={currentExplanation.explanation.educational_fact} colors={colors} inline={false} />
              </View>
            </View>
          )}
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
      marginTop: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: 'hidden',
    },
    correctAnswerSection: {
      padding: 16,
      backgroundColor: '#dcfce7',
      borderLeftWidth: 4,
      borderLeftColor: '#10b981',
      marginBottom: 12,
      borderRadius: 8,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
      gap: 8,
    },
    headerIcon: {
      fontSize: 18,
    },
    headerTextContainer: {
      flex: 1,
    },
    correctHeaderText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#065f46',
      marginBottom: 4,
    },
    correctAnswerTextContainer: {
      marginTop: 4,
    },
    reasonContainer: {
      marginTop: 8,
    },
    wrongOptionsSection: {
      padding: 16,
      marginBottom: 12,
    },
    wrongOptionsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    wrongOptionsIcon: {
      fontSize: 18,
      marginRight: 8,
    },
    wrongOptionsHeaderText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    wrongOptionsList: {
      gap: 8,
    },
    wrongOptionItem: {
      padding: 12,
      backgroundColor: '#fee2e2',
      borderLeftWidth: 3,
      borderLeftColor: '#ef4444',
      borderRadius: 6,
    },
    wrongOptionHeader: {
      marginBottom: 4,
    },
    wrongOptionReason: {
      marginTop: 4,
    },
    educationalFactSection: {
      padding: 16,
      backgroundColor: '#dbeafe',
      borderLeftWidth: 4,
      borderLeftColor: '#3b82f6',
    },
    educationalFactHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    educationalFactIcon: {
      fontSize: 18,
      marginRight: 8,
    },
    educationalFactHeaderText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#1e40af',
    },
    educationalFactContent: {
      marginTop: 4,
    },
  });

export default QuizExplanationAccordion;
