import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@context/ThemeContext';
import EducationalContent from '../../components/EducationalContent';
import { saveUserAssessment } from '@core/services/sharedApi';
import { useUserStore } from '@core/store/user.store';
import { generateWorksheet } from '@core/services/sharedApi';
import {
  buildQuizDataFromPreview,
  normalizeGeneratedQuizQuestions,
  type CurriculumGeneratedPreviewParams,
} from '@core/utils/documentCurriculumGeneratedHandoff';

function assertPreviewParams(params: unknown): CurriculumGeneratedPreviewParams {
  const p = params as CurriculumGeneratedPreviewParams;
  if (!p?.curriculumMeta || !p?.generationResponse) {
    throw new Error('invalid_preview_params');
  }
  return p;
}

export default function DocumentCurriculumGeneratedPreviewScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const schoolId = useUserStore((s) => s.schoolId);

  const params = useMemo(() => assertPreviewParams(route?.params), [route?.params]);
  const questions = useMemo(
    () => normalizeGeneratedQuizQuestions(params.generationResponse),
    [params.generationResponse],
  );

  const [assessmentId, setAssessmentId] = useState<number | null>(
    params.assessmentId ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [worksheetLoading, setWorksheetLoading] = useState(false);

  const persistAssessment = useCallback(async (): Promise<number | null> => {
    if (assessmentId) return assessmentId;
    setSaving(true);
    try {
      const meta = params.curriculumMeta;
      const saved = await saveUserAssessment({
        title: meta.title,
        subject: meta.subjectLabel,
        class_name: meta.classLabel,
        level: meta.level,
        lesson: meta.topicTitles,
        assessment_type: params.source === 'Doc-File-Curriculum' ? 'document-quiz' : 'web-quiz',
        source: params.source,
        school_id: schoolId,
        questions: questions.map((q) => ({
          quiz: {
            question: q.question,
            options: q.options,
            answer: q.correctAnswer,
            explanation: q.explanation ?? '',
          },
          answer: q.correctAnswer,
        })),
      });
      const id = Number(saved?.id ?? saved?.assessment_id ?? saved);
      if (Number.isFinite(id)) {
        setAssessmentId(id);
        return id;
      }
      return null;
    } finally {
      setSaving(false);
    }
  }, [assessmentId, params, questions, schoolId]);

  const savedOnce = React.useRef(false);
  useEffect(() => {
    if (savedOnce.current || assessmentId) return;
    savedOnce.current = true;
    void persistAssessment();
  }, [assessmentId, persistAssessment]);

  const openQuiz = async () => {
    const id = await persistAssessment();
    navigation.navigate('DocumentUploadQuizScreen', {
      quizData: buildQuizDataFromPreview(params, questions, id),
      source: 'document-upload',
      workspaceMode: 'document',
      assessmentId: id,
      showActionButtons: true,
      showShareButton: true,
      returnScreen: 'DocumentCurriculumGeneratedPreviewScreen',
    });
  };

  const openWorksheet = async () => {
    if (!params.curriculumMeta.alignmentEnabled) {
      Alert.alert('Worksheet', 'Curriculum-aligned worksheets require Curriculum Alignment ON.');
      return;
    }
    setWorksheetLoading(true);
    try {
      const meta = params.curriculumMeta;
      const worksheet = await generateWorksheet({
        class: meta.classLabel,
        subject: meta.subjectLabel,
        lesson: meta.topicTitles,
        itext: meta.additionalInstructions,
        level: meta.level,
        count: meta.count,
        mcq_count: Math.ceil(meta.count * 0.4),
        fitb_count: Math.ceil(meta.count * 0.2),
        tf_count: Math.floor(meta.count * 0.1),
        short_q_count: Math.floor(meta.count * 0.2),
        matching_count: Math.floor(meta.count * 0.1),
        type: 'worksheet',
      });
      await persistAssessment();
      navigation.navigate('WorksheetScreen', {
        worksheetData: worksheet,
        title: `${meta.title} Worksheet`,
      });
    } catch (e: any) {
      Alert.alert('Worksheet failed', e?.message || 'Please try again.');
    } finally {
      setWorksheetLoading(false);
    }
  };

  if (!questions.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No generated questions to preview.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={2}>{params.curriculumMeta.title}</Text>
        <TouchableOpacity
          testID="curriculum-preview-open-history"
          onPress={() => navigation.navigate('DocumentUploadHistoryScreen')}
        >
          <Text style={styles.link}>History</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.meta} testID="curriculum-preview-meta">
        {params.source} · {params.curriculumMeta.alignmentEnabled ? 'Alignment ON' : 'Alignment OFF'} ·{' '}
        {questions.length} questions
      </Text>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120 }}>
        {questions.map((q, idx) => (
          <View key={q.id} style={styles.card} testID={`curriculum-preview-question-${idx}`}>
            <Text style={styles.qLabel}>Question {idx + 1}</Text>
            <EducationalContent content={q.question} />
            {q.options.map((opt, oi) => (
              <View key={oi} style={styles.optionRow}>
                <Text style={styles.optionLetter}>{String.fromCharCode(65 + oi)}.</Text>
                <EducationalContent content={opt} />
              </View>
            ))}
            {q.explanation ? (
              <View style={styles.explanation}>
                <Text style={styles.explanationLabel}>Explanation</Text>
                <EducationalContent content={q.explanation} />
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          testID="curriculum-preview-start-quiz"
          style={styles.primaryBtn}
          onPress={() => void openQuiz()}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Open assessment</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          testID="curriculum-preview-worksheet"
          style={styles.secondaryBtn}
          onPress={() => void openWorksheet()}
          disabled={worksheetLoading}
        >
          {worksheetLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.secondaryText}>Generate worksheet</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingBottom: 8,
    },
    title: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text },
    link: { fontSize: 13, color: colors.primary, fontWeight: '600' },
    meta: { fontSize: 12, color: colors.textSecondary, paddingHorizontal: 16, marginBottom: 4 },
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      backgroundColor: colors.card,
    },
    qLabel: { fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 6 },
    optionRow: { flexDirection: 'row', gap: 6, marginTop: 6, alignItems: 'flex-start' },
    optionLetter: { fontWeight: '700', color: colors.textSecondary, width: 18 },
    explanation: { marginTop: 10, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    explanationLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 16,
      paddingTop: 10,
      backgroundColor: colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      gap: 8,
    },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
    },
    primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    secondaryBtn: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    secondaryText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    errorText: { color: colors.text, marginBottom: 12 },
  });
}
