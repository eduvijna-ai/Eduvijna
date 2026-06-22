/**
 * TopicSummaryModal — mobile parity with web TopicSummaryModal.
 * Builds a combined prompt from class/subject/lesson/difficulty and calls
 * POST /api/v1/topicSummary.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';
import { generateTopicSummary, type TopicSummaryResponse } from '../core/services/sharedApi';

interface Props {
  visible: boolean;
  onClose: () => void;
  className?: string;
  subject?: string;
  lesson?: string;
  difficulty?: string;
  additionalInstructions?: string;
  autoGenerate?: boolean;
}

function buildCombinedPrompt(
  fields: Pick<Props, 'className' | 'subject' | 'lesson' | 'difficulty' | 'additionalInstructions'>,
): string {
  const parts: string[] = [];
  if (fields.className) parts.push(`Class: ${fields.className}`);
  if (fields.subject) parts.push(`Subject: ${fields.subject}`);
  if (fields.lesson) parts.push(`Lesson: ${fields.lesson}`);
  if (fields.difficulty) parts.push(`Difficulty: ${fields.difficulty}`);
  if (fields.additionalInstructions?.trim()) {
    parts.push(`Additional instructions: ${fields.additionalInstructions.trim()}`);
  }
  return parts.join('\n');
}

export default function TopicSummaryModal({
  visible,
  onClose,
  className,
  subject,
  lesson,
  difficulty,
  additionalInstructions = '',
  autoGenerate = true,
}: Props) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<TopicSummaryResponse | null>(null);
  const lastPromptRef = useRef('');

  const combinedPrompt = useMemo(
    () => buildCombinedPrompt({ className, subject, lesson, difficulty, additionalInstructions }),
    [className, subject, lesson, difficulty, additionalInstructions],
  );

  const runGenerate = useCallback(async (prompt: string) => {
    if (!prompt.trim()) {
      setError('Please enter lesson details to generate a summary.');
      return;
    }
    setLoading(true);
    setError('');
    setData(null);
    lastPromptRef.current = prompt;
    try {
      const result = await generateTopicSummary(prompt);
      setData(result);
    } catch (e: any) {
      setError(e?.message || 'Failed to generate topic summary. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      setLoading(false);
      setError('');
      setData(null);
      return;
    }
    if (autoGenerate && combinedPrompt.trim()) {
      runGenerate(combinedPrompt);
    }
  }, [visible, autoGenerate, combinedPrompt, runGenerate]);

  const subtitle = [className, subject, lesson].filter(Boolean).join(' • ');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Topic Summary</Text>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={2}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator>
            {loading ? (
              <View style={styles.centerBlock}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Generating summary…</Text>
              </View>
            ) : error ? (
              <View style={styles.centerBlock}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={[styles.retryBtn, { borderColor: colors.primary }]}
                  onPress={() => runGenerate(lastPromptRef.current || combinedPrompt)}
                >
                  <Text style={[styles.retryBtnText, { color: colors.primary }]}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : data ? (
              <>
                {data.title ? <Text style={styles.resultTitle}>{data.title}</Text> : null}
                {data.keywords?.length ? (
                  <Text style={styles.keywords}>
                    {data.keywords.slice(0, 8).join(' • ')}
                  </Text>
                ) : null}
                <Text style={styles.content}>{data.content}</Text>
              </>
            ) : (
              <View style={styles.centerBlock}>
                <Text style={styles.placeholderText}>
                  Enter lesson details in the form, then tap Generate Summary.
                </Text>
              </View>
            )}
          </ScrollView>

          {!loading && data ? (
            <TouchableOpacity
              style={[styles.regenerateBtn, { borderColor: colors.primary }]}
              onPress={() => runGenerate(combinedPrompt)}
            >
              <Text style={[styles.regenerateBtnText, { color: colors.primary }]}>Regenerate</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 24,
      maxHeight: '90%',
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
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    title: { fontSize: 18, fontWeight: '700', color: colors.text },
    subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    body: { flexGrow: 0, maxHeight: '75%' },
    centerBlock: { alignItems: 'center', paddingVertical: 32, gap: 12 },
    loadingText: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
    placeholderText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
    errorText: { color: colors.error || '#DC2626', fontSize: 14, textAlign: 'center', lineHeight: 20 },
    retryBtn: {
      marginTop: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    retryBtnText: { fontSize: 14, fontWeight: '700' },
    resultTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 8 },
    keywords: { fontSize: 12, color: colors.textSecondary, marginBottom: 12, lineHeight: 18 },
    content: { fontSize: 14, color: colors.text, lineHeight: 22 },
    regenerateBtn: {
      marginTop: 12,
      height: 46,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    regenerateBtnText: { fontSize: 15, fontWeight: '700' },
  });
