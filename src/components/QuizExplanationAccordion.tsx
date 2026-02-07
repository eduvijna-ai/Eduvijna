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
      const errorMessage = err?.response?.data?.detail || err?.message || 'Unable to load explanation';
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
            <Text style={styles.correctAnswerHeader}>Correct Answer:</Text>
            <Text style={styles.correctAnswerText}>{currentExplanation.correct_answer}</Text>
            <Text style={styles.correctReasonText}>{currentExplanation.explanation.correct_reason}</Text>
          </View>

          {/* Incorrect Options Section */}
          {Object.entries(currentExplanation.explanation.wrong_options).map(([option, reason]) => (
            <View key={option} style={styles.individualIncorrectSection}>
              <Text style={styles.incorrectOptionHeader}>Why option {option} is incorrect:</Text>
              <Text style={styles.incorrectOptionText}>{reason}</Text>
            </View>
          ))}
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
      padding: 16,
      backgroundColor: '#dcfce7',
      borderLeftWidth: 4,
      borderLeftColor: '#10b981',
      marginBottom: 12,
      borderRadius: 8,
    },
    correctAnswerHeader: {
      fontWeight: 'bold',
      fontSize: 16,
      color: '#065f46',
    },
    correctAnswerText: {
      fontSize: 14,
      color: '#065f46',
      marginTop: 8,
    },
    correctReasonText: {
      fontSize: 14,
      color: '#065f46',
      marginTop: 4,
    },
    individualIncorrectSection: {
      padding: 16,
      backgroundColor: '#fee2e2',
      borderLeftWidth: 4,
      borderLeftColor: '#dc2626',
      borderRadius: 8,
      marginBottom: 12,
    },
    incorrectOptionHeader: {
      fontWeight: 'bold',
      fontSize: 16,
      color: '#991b1b',
    },
    incorrectOptionText: {
      fontSize: 14,
      color: '#991b1b',
      marginTop: 4,
    },
  });

export default QuizExplanationAccordion;
