/**
 * AI Quiz — a lightweight AI quiz runner (question, options, progress, result).
 * screens.md "AI Quiz". Sample questions are local placeholders until the AI
 * generation API is wired up.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  TeacherScreen,
  StudentModuleHeader,
  SurfaceCard,
  ProgressBar,
  PrimaryButton,
  DonutChart,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentNavigation } from '../../../hooks/useStudentNavigation';
import type { StudentStackParamList } from '../../../types/navigation';

interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

const QUESTIONS: QuizQuestion[] = [
  { id: 'q1', prompt: 'What is the value of x in 2x + 5 = 15?', options: ['3', '5', '7', '10'], correctIndex: 1 },
  { id: 'q2', prompt: 'Which organelle is the powerhouse of the cell?', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi body'], correctIndex: 2 },
  { id: 'q3', prompt: 'The capital of India is?', options: ['Mumbai', 'New Delhi', 'Kolkata', 'Chennai'], correctIndex: 1 },
];

export default function AIQuizScreen() {
  const theme = useTeacherTheme();
  const navigation = useStudentNavigation();
  const route = useRoute<RouteProp<StudentStackParamList, 'AIQuiz'>>();
  const topic = route.params?.topic ?? 'Mixed Practice';

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = QUESTIONS[index];
  const progress = ((index + (selected != null ? 1 : 0)) / QUESTIONS.length) * 100;

  const handleNext = () => {
    if (selected == null) return;
    const correct = selected === question.correctIndex;
    const nextScore = correct ? score + 1 : score;
    setScore(nextScore);
    if (index < QUESTIONS.length - 1) {
      setIndex(index + 1);
      setSelected(null);
    } else {
      setFinished(true);
    }
  };

  if (finished) {
    const pct = Math.round((score / QUESTIONS.length) * 100);
    return (
      <TeacherScreen header={<StudentModuleHeader title="AI Quiz" />} contentStyle={styles.content}>
        <SurfaceCard style={styles.resultCard}>
          <DonutChart
            size={150}
            strokeWidth={18}
            centerValue={`${pct}%`}
            centerLabel="Score"
            segments={[
              { value: pct, color: theme.colors.success },
              { value: 100 - pct, color: theme.colors.surfaceAlt },
            ]}
          />
          <Text style={[styles.resultTitle, { color: theme.colors.textPrimary }]}>
            {score} / {QUESTIONS.length} correct
          </Text>
          <Text style={[styles.resultSub, { color: theme.colors.textSecondary }]}>
            {pct >= 70 ? 'Great work! Keep practicing to master the topic.' : 'Good effort — review and try again to improve.'}
          </Text>
        </SurfaceCard>
        <PrimaryButton label="Done" variant="gradient" onPress={() => navigation.goBack()} />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={<StudentModuleHeader title="AI Quiz" />}
      contentStyle={styles.content}
      footer={<PrimaryButton label={index === QUESTIONS.length - 1 ? 'Finish' : 'Next'} icon="arrow-forward" variant="gradient" disabled={selected == null} onPress={handleNext} />}
    >
      <View style={styles.progressHead}>
        <Text style={[styles.progressLabel, { color: theme.colors.textSecondary }]}>{topic}</Text>
        <Text style={[styles.progressCount, { color: theme.colors.primary }]}>Question {index + 1} of {QUESTIONS.length}</Text>
      </View>
      <ProgressBar percent={progress} height={8} />

      <SurfaceCard style={styles.questionCard}>
        <Text style={[styles.question, { color: theme.colors.textPrimary }]}>{question.prompt}</Text>
      </SurfaceCard>

      <View style={styles.options}>
        {question.options.map((option, optionIndex) => {
          const active = selected === optionIndex;
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.option,
                {
                  backgroundColor: active ? theme.colors.tintTeal : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setSelected(optionIndex)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={option}
            >
              <View style={[styles.optionMark, { borderColor: active ? theme.colors.primary : theme.colors.border, backgroundColor: active ? theme.colors.primary : 'transparent' }]}>
                {active ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
              </View>
              <Text style={[styles.optionText, { color: theme.colors.textPrimary }]}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 13, fontWeight: '600' },
  progressCount: { fontSize: 13, fontWeight: '700' },
  questionCard: { paddingVertical: 20 },
  question: { fontSize: 17, fontWeight: '700', lineHeight: 24 },
  options: { gap: 12 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, borderWidth: 1.5 },
  optionMark: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  optionText: { fontSize: 15, fontWeight: '600' },
  resultCard: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  resultTitle: { fontSize: 20, fontWeight: '800' },
  resultSub: { fontSize: 13, textAlign: 'center', lineHeight: 19, paddingHorizontal: 12 },
});
