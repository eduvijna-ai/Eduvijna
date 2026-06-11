/**
 * AI Practice Test — configure an AI-generated practice set, then launch.
 * screens.md "AI Practice Test".
 */

import React, { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  FormField,
  SelectField,
  SegmentedControl,
  PrimaryButton,
  InfoBanner,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentNavigation } from '../../../hooks/useStudentNavigation';
import { useStudentData } from '../../../hooks/useStudentData';

const DIFFICULTY = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
];

const COUNTS = [
  { key: '5', label: '5' },
  { key: '10', label: '10' },
  { key: '20', label: '20' },
];

export default function AIPracticeTestScreen() {
  const theme = useTeacherTheme();
  const navigation = useStudentNavigation();
  const { academics } = useStudentData();
  const [subject, setSubject] = useState<string | null>(academics.subjects[0]?.id ?? null);
  const [topic, setTopic] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState('medium');
  const [count, setCount] = useState('10');

  const subjectOptions = academics.subjects.map((s) => ({ label: s.subject, value: s.id }));
  const topicOptions = [
    { label: 'Full Syllabus', value: 'full' },
    { label: 'Current Chapter', value: 'chapter' },
    { label: 'Weak Areas', value: 'weak' },
  ];
  const selectedSubject = academics.subjects.find((s) => s.id === subject);

  return (
    <TeacherScreen
      header={<ScreenHeader title="AI Practice Test" />}
      contentStyle={styles.content}
      footer={
        <PrimaryButton
          label={`Start ${count}-Question Test`}
          icon="play"
          variant="gradient"
          onPress={() => navigation.navigate('AIQuiz', { topic: selectedSubject?.subject })}
        />
      }
    >
      <InfoBanner tone="tip" icon="sparkles" title="AI-personalized practice" text="Questions adapt to your performance to target areas that need improvement." />

      <SurfaceCard style={styles.card}>
        <FormField label="Subject" required>
          <SelectField options={subjectOptions} value={subject} onChange={setSubject} placeholder="Select subject" />
        </FormField>
        <FormField label="Topic">
          <SelectField options={topicOptions} value={topic} onChange={setTopic} placeholder="Select topic" />
        </FormField>
        <FormField label="Difficulty">
          <SegmentedControl segments={DIFFICULTY} activeKey={difficulty} onChange={setDifficulty} />
        </FormField>
        <FormField label="Number of Questions">
          <SegmentedControl segments={COUNTS} activeKey={count} onChange={setCount} />
        </FormField>
      </SurfaceCard>

      <SurfaceCard style={[styles.summary, { backgroundColor: theme.colors.tintTeal }]}>
        <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>
          {count} {difficulty} questions on {selectedSubject?.subject ?? 'your subject'} will be generated.
        </Text>
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  card: { gap: 16 },
  summary: { alignItems: 'center' },
  summaryText: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
