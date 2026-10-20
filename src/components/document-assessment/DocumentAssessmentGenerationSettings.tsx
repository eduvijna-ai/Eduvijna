/**
 * Shared document generation settings — Difficulty + Number of Questions only.
 * Optional Class/Subject/Lesson are intentionally omitted from this workspace.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { DocumentUploadDifficulty } from '@core/services/documentUploadApi';

const DIFFICULTIES: Array<{ key: DocumentUploadDifficulty; label: string }> = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
];
const COUNT_OPTIONS = [5, 10, 15, 20] as const;

type Colors = {
  text: string;
  textSecondary: string;
  border: string;
  card: string;
  primary: string;
};

type Props = {
  title: string;
  subtitle: string;
  difficulty: DocumentUploadDifficulty;
  questionCount: number;
  onDifficultyChange: (d: DocumentUploadDifficulty) => void;
  onQuestionCountChange: (n: number) => void;
  colors: Colors;
  disabled?: boolean;
};

export default function DocumentAssessmentGenerationSettings({
  title,
  subtitle,
  difficulty,
  questionCount,
  onDifficultyChange,
  onQuestionCountChange,
  colors,
  disabled,
}: Props) {
  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>{subtitle}</Text>

      <Text style={[styles.label, { color: colors.text }]}>Difficulty Level</Text>
      <View style={styles.pillRow}>
        {DIFFICULTIES.map((option) => {
          const active = difficulty === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.pill,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary : colors.card,
                },
              ]}
              onPress={() => onDifficultyChange(option.key)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Difficulty ${option.label}`}
            >
              <Text style={[styles.pillText, { color: active ? '#fff' : colors.text }]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.label, { color: colors.text }]}>Number of Questions</Text>
      <View style={styles.pillRow}>
        {COUNT_OPTIONS.map((n) => {
          const active = questionCount === n;
          return (
            <TouchableOpacity
              key={n}
              style={[
                styles.pill,
                styles.countPill,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary : colors.card,
                },
              ]}
              onPress={() => onQuestionCountChange(n)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${n} questions`}
            >
              <Text style={[styles.pillText, { color: active ? '#fff' : colors.text }]}>{n}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  title: { fontSize: 17, fontWeight: '700' },
  sub: { fontSize: 12, lineHeight: 17 },
  label: { fontWeight: '600', fontSize: 13, marginTop: 2 },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 64,
    alignItems: 'center',
  },
  countPill: { minWidth: 52 },
  pillText: { fontWeight: '700', fontSize: 13 },
});
