/**
 * GenerateWorksheetModal
 * Lets the user pick question-type counts, then generate a worksheet from the
 * current assessment's metadata. Mirrors the web GenerateWorksheetModal so a
 * worksheet can be produced directly from an AI-generated quiz.
 *
 * UI uses the app's standard ThemeContext palette to stay visually consistent
 * with the rest of the mobile application.
 */
import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fullScreenModalOverlay, getFullScreenModalProps } from './fullScreenModal';
import { useTheme } from '@context/ThemeContext';

export interface WorksheetQuestionTypeCount {
  type: 'MCQ' | 'Fill in the Blanks' | 'True/False' | 'Short Answer' | 'Match the Following';
  count: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onGenerate: (counts: {
    mcq: number;
    fitb: number;
    tf: number;
    shortQ: number;
    matching: number;
  }) => void;
  loading?: boolean;
  presetClass?: string;
  presetSubject?: string;
  presetLesson?: string;
  error?: string;
}

const QUESTION_TYPES: Array<{ key: keyof CountsState; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'mcq', label: 'Multiple Choice', icon: 'list-outline' },
  { key: 'fitb', label: 'Fill in the Blanks', icon: 'create-outline' },
  { key: 'tf', label: 'True / False', icon: 'checkmark-done-outline' },
  { key: 'shortQ', label: 'Short Answer', icon: 'chatbox-ellipses-outline' },
  { key: 'matching', label: 'Match the Following', icon: 'git-compare-outline' },
];

interface CountsState {
  mcq: number;
  fitb: number;
  tf: number;
  shortQ: number;
  matching: number;
}

const DEFAULT_COUNTS: CountsState = { mcq: 5, fitb: 3, tf: 2, shortQ: 0, matching: 0 };

export default function GenerateWorksheetModal({
  visible,
  onClose,
  onGenerate,
  loading = false,
  presetClass,
  presetSubject,
  presetLesson,
  error,
}: Props) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const insets = useSafeAreaInsets();
  const sheetBottomPad = Math.max(insets.bottom + 16, Platform.OS === 'android' ? 32 : 20);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [counts, setCounts] = useState<CountsState>(DEFAULT_COUNTS);

  const total = counts.mcq + counts.fitb + counts.tf + counts.shortQ + counts.matching;

  const adjust = (key: keyof CountsState, delta: number) => {
    setCounts((prev) => ({
      ...prev,
      [key]: Math.max(0, Math.min(20, prev[key] + delta)),
    }));
  };

  return (
    <Modal visible={visible} onRequestClose={onClose} {...getFullScreenModalProps('slide')}>
      <View style={[fullScreenModalOverlay, styles.overlay]}>
        <View style={[styles.sheet, { paddingBottom: sheetBottomPad }]}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Generate Worksheet</Text>
              {(presetSubject || presetLesson) ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {[presetClass, presetSubject, presetLesson].filter(Boolean).join(' • ')}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionCaption}>QUESTION TYPES</Text>
            {QUESTION_TYPES.map(({ key, label, icon }) => (
              <View key={key} style={styles.typeRow}>
                <View style={styles.typeLabelWrap}>
                  <View style={[styles.typeIcon, { backgroundColor: colors.primary + '18' }]}>
                    <Ionicons name={icon} size={16} color={colors.primary} />
                  </View>
                  <Text style={styles.typeLabel}>{label}</Text>
                </View>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={[styles.stepperBtn, { borderColor: colors.border }]}
                    onPress={() => adjust(key, -1)}
                    disabled={loading}
                  >
                    <Ionicons name="remove" size={16} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{counts[key]}</Text>
                  <TouchableOpacity
                    style={[styles.stepperBtn, { borderColor: colors.border }]}
                    onPress={() => adjust(key, 1)}
                    disabled={loading}
                  >
                    <Ionicons name="add" size={16} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total questions</Text>
              <Text style={[styles.totalValue, { color: total > 0 ? colors.primary : colors.textSecondary }]}>
                {total}
              </Text>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.generateBtn,
              { backgroundColor: total > 0 && !loading ? colors.primary : colors.border },
            ]}
            disabled={total === 0 || loading}
            onPress={() =>
              onGenerate({
                mcq: counts.mcq,
                fitb: counts.fitb,
                tf: counts.tf,
                shortQ: counts.shortQ,
                matching: counts.matching,
              })
            }
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.buttonText || '#fff'} />
            ) : (
              <Text style={[styles.generateBtnText, { color: colors.buttonText || '#fff' }]}>
                Generate Worksheet
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      backgroundColor: 'rgba(15, 23, 42, 0.55)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 10,
      maxHeight: '85%',
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.border,
      marginBottom: 14,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    title: { fontSize: 18, fontWeight: '700', color: colors.text },
    subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    body: { marginBottom: 12 },
    sectionCaption: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.6,
      marginBottom: 10,
    },
    typeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    typeLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    typeIcon: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    typeLabel: { fontSize: 14, fontWeight: '500', color: colors.text },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepperBtn: {
      width: 30,
      height: 30,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperValue: { fontSize: 15, fontWeight: '700', color: colors.text, minWidth: 20, textAlign: 'center' },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    totalLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
    totalValue: { fontSize: 20, fontWeight: '800' },
    errorText: { color: colors.error || '#DC2626', fontSize: 13, marginTop: 10 },
    generateBtn: {
      height: 52,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    generateBtnText: { fontSize: 16, fontWeight: '700' },
  });
