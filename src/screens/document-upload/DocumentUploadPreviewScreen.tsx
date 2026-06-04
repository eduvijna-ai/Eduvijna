import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';
import {
  DocumentUploadBook,
  generateMultimodalAssessmentFromDocument,
} from '@core/services/documentUploadApi';
import { generateWorksheet, saveUserAssessment } from '@core/services/sharedApi';
import { useUserStore } from '@core/store/user.store';

const FALLBACK_THUMB = 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200';

const QUESTION_OPTIONS = [5, 10, 15, 20] as const;
const DIFFICULTY_OPTIONS = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
] as const;

const pageItems = (totalPages: number) =>
  Array.from({ length: Math.max(1, totalPages || 1) }, (_, i) => i + 1);

const normalizeErrorMessage = (err: any, fallback: string): string => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (detail && typeof detail === 'object') {
    if (typeof detail.message === 'string' && detail.message.trim()) {
      const extra = Array.isArray(detail.details)
        ? detail.details.join(', ')
        : typeof detail.details === 'string'
          ? detail.details
          : '';
      return extra ? `${detail.message} (${extra})` : detail.message;
    }
    try {
      return JSON.stringify(detail);
    } catch {
      return fallback;
    }
  }
  if (typeof err?.message === 'string' && err.message.trim()) return err.message;
  return fallback;
};

export default function DocumentUploadPreviewScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const schoolId = useUserStore((s) => s.schoolId);

  const book: DocumentUploadBook | undefined = route?.params?.book;

  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set([1]));
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [loadingWorksheet, setLoadingWorksheet] = useState(false);
  const [error, setError] = useState('');

  const totalPages = book?.totalPages || 1;

  const goBackHome = () => {
    navigation.navigate('DocumentUploadHomeScreen');
  };

  const handleGenerateQuiz = async () => {
    if (!book?.fileUri) {
      setError('Original file reference is not available. Please upload again from Document Upload Home.');
      return;
    }

    if (selectedPages.size === 0) {
      setError('Please select at least one page to generate the assessment.');
      return;
    }

    try {
      setError('');
      setLoadingQuiz(true);
      const result = await generateMultimodalAssessmentFromDocument({
        fileUri: book.fileUri,
        fileName: book.originalName || 'document.pdf',
        mimeType: book.mimeType || 'application/pdf',
        questionCount,
        difficulty,
        language: 'English',
        subject: 'Document',
        gradeLevel: 'Class 10',
        lessonTitle: book.title || 'Document Quiz',
        selectedPages: Array.from(selectedPages).sort((a, b) => a - b),
      });

      if (!result.quizData.questions.length) {
        setError('Assessment generation returned no questions. Please try another file or configuration.');
        return;
      }

      await saveUserAssessment({
        title: book.title || book.originalName,
        subject: 'Document',
        class_name: 'Class 10',
        level: difficulty,
        lesson: book.title || 'Document Lesson',
        assessment_type: 'quiz',
        source: 'DocumentUpload',
        school_id: schoolId,
        questions: result.quizData.questions.map((q) => ({
          quiz: {
            question: q.question,
            options: q.options,
            answer: q.correctAnswer,
            explanation: q.explanation,
          },
          answer: q.correctAnswer,
        })),
      });

      navigation.navigate('DocumentUploadQuizScreen', { quizData: result.quizData });
    } catch (e: any) {
      setError(normalizeErrorMessage(e, 'Failed to generate quiz.'));
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleGenerateWorksheet = async () => {
    if (selectedPages.size === 0) {
      setError('Please select at least one page before generating worksheet.');
      return;
    }

    try {
      setError('');
      setLoadingWorksheet(true);
      const worksheet = await generateWorksheet({
        class: 'Class 10',
        subject: 'Document',
        lesson: book?.title || 'Document Lesson',
        level: difficulty,
        count: questionCount,
        mcq_count: Math.ceil(questionCount * 0.4),
        fitb_count: Math.ceil(questionCount * 0.2),
        tf_count: Math.floor(questionCount * 0.1),
        short_q_count: Math.floor(questionCount * 0.2),
        matching_count: Math.floor(questionCount * 0.1),
        type: 'worksheet',
      });

      const wsData = worksheet?.WorksheetData;
      if (wsData) {
        await saveUserAssessment({
          title: `${book?.title || 'Document'} Worksheet`,
          subject: wsData.Metadata?.Subject || 'Document',
          class_name: wsData.Metadata?.Class || 'Class 10',
          level: wsData.Metadata?.Difficulty || difficulty,
          lesson: wsData.Metadata?.Lesson || book?.title,
          assessment_type: 'worksheet',
          source: 'DocumentUpload',
          school_id: schoolId,
          questions: [
            {
              quiz: {
                question: '__WS_DATA__' + JSON.stringify(wsData),
                options: [],
                answer: 'A',
              },
              answer: 'A',
            },
          ],
        });
      }

      navigation.navigate('WorksheetScreen', {
        worksheetData: worksheet,
        title: `${book?.title || 'Document'} Worksheet`,
        selectedPages: Array.from(selectedPages).sort((a, b) => a - b),
      });
    } catch (e: any) {
      setError(normalizeErrorMessage(e, 'Failed to generate worksheet.'));
    } finally {
      setLoadingWorksheet(false);
    }
  };

  if (!book) {
    return (
      <View style={styles.centerEmpty}>
        <Text style={styles.emptyTitle}>No document selected</Text>
        <TouchableOpacity style={styles.primaryAction} onPress={goBackHome}>
          <Text style={styles.primaryActionText}>Back to Upload</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const togglePageSelection = (p: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        next.delete(p);
      } else {
        next.add(p);
      }
      return next;
    });
  };

  const pageList = pageItems(totalPages);
  const allSelected = pageList.every((p) => selectedPages.has(p));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedPages(new Set());
      return;
    }
    setSelectedPages(new Set(pageList));
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.dropdownBtn}>
            <Text style={styles.dropdownText}>Page {page} of {totalPages}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.zoomRow}>
            <Text style={styles.zoomText}>{zoom}%</Text>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setZoom((z) => Math.max(50, z - 10))}>
              <Ionicons name="remove" size={16} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setZoom((z) => Math.min(200, z + 10))}>
              <Ionicons name="add" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <Image source={{ uri: book.thumbnailUri || FALLBACK_THUMB }} style={styles.previewImage} resizeMode="cover" />

        <View style={styles.selectionBar}>
          <Text style={styles.thumbHint}>Tap thumbnails to jump, use check icon to select pages</Text>
          <TouchableOpacity style={styles.selectAllBtn} onPress={toggleSelectAll}>
            <Text style={styles.selectAllText}>{allSelected ? 'Clear' : 'Select All'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.selectionCount}>Selected: {selectedPages.size} / {totalPages}</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
          {pageList.map((p) => {
            const isSelected = selectedPages.has(p);
            return (
              <View key={p} style={[styles.thumbItem, p === page && styles.thumbActive, isSelected && styles.thumbSelected]}>
                <TouchableOpacity style={styles.selectCheck} onPress={() => togglePageSelection(p)}>
                  <Ionicons name={isSelected ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={isSelected ? '#0E7490' : '#94A3B8'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPage(p)}>
                  <Image source={{ uri: book.thumbnailUri || FALLBACK_THUMB }} style={styles.thumbImage} />
                </TouchableOpacity>
                <Text style={[styles.thumbText, p === page && styles.thumbTextActive, isSelected && styles.thumbTextSelected]}>{p}</Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.generatorCard}>
          <Text style={styles.sectionTitle}>Generate Quiz</Text>
          <Text style={styles.sectionSub}>Create quiz from uploaded content</Text>

          <Text style={styles.label}>Difficulty Level</Text>
          <View style={styles.pillRow}>
            {DIFFICULTY_OPTIONS.map((option) => {
              const active = difficulty === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.pillBtn, active && styles.pillBtnActive]}
                  onPress={() => setDifficulty(option.key)}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Number of Questions</Text>
          <View style={styles.pillRow}>
            {QUESTION_OPTIONS.map((count) => {
              const active = questionCount === count;
              return (
                <TouchableOpacity
                  key={count}
                  style={[styles.pillBtn, active && styles.pillBtnActive]}
                  onPress={() => setQuestionCount(count)}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>{count}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#B91C1C" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity style={[styles.primaryAction, (loadingQuiz || selectedPages.size === 0) && styles.disabled]} onPress={handleGenerateQuiz} disabled={loadingQuiz || selectedPages.size === 0}>
            {loadingQuiz ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="flash-outline" size={16} color="#fff" />}
            <Text style={styles.primaryActionText}>{loadingQuiz ? 'Generating Assessment...' : 'Generate Assessment'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.worksheetBtn, loadingWorksheet && styles.disabled]}
          onPress={handleGenerateWorksheet}
          disabled={loadingWorksheet}
        >
          {loadingWorksheet ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="document-text-outline" size={16} color={colors.primary} />}
          <Text style={styles.worksheetBtnText}>{loadingWorksheet ? 'Generating Worksheet...' : 'Generate Worksheet'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 12, gap: 10, paddingBottom: 24 },
    toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dropdownBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.card,
      paddingHorizontal: 10,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dropdownText: { color: colors.text, fontWeight: '700', fontSize: 13 },
    zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    zoomText: { color: colors.text, fontWeight: '700', fontSize: 13 },
    iconBtn: {
      width: 30,
      height: 30,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },
    previewImage: {
      width: '100%',
      height: 320,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
    },
    thumbHint: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
    selectionBar: {
      marginTop: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    selectAllBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 8,
      backgroundColor: colors.card,
    },
    selectAllText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 12,
    },
    selectionCount: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
      marginBottom: 2,
    },
    thumbRow: { gap: 8 },
    thumbItem: {
      width: 64,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 4,
      backgroundColor: colors.card,
      alignItems: 'center',
      position: 'relative',
    },
    thumbActive: { borderColor: '#38BDF8', backgroundColor: '#E0F2FE' },
    thumbSelected: { borderColor: '#0E7490', backgroundColor: '#ECFEFF' },
    selectCheck: {
      position: 'absolute',
      top: 2,
      left: 2,
      zIndex: 2,
      backgroundColor: 'rgba(255,255,255,0.92)',
      borderRadius: 10,
    },
    thumbImage: { width: 54, height: 58, borderRadius: 4, backgroundColor: colors.inputBackground },
    thumbText: { marginTop: 3, fontSize: 11, color: colors.textSecondary },
    thumbTextActive: { color: colors.primary, fontWeight: '700' },
    thumbTextSelected: { color: '#0E7490', fontWeight: '700' },

    generatorCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.card,
      padding: 12,
      gap: 8,
      marginTop: 4,
    },
    sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
    sectionSub: { color: colors.textSecondary, fontSize: 13 },
    label: { color: colors.text, fontWeight: '600', fontSize: 13, marginTop: 4 },
    pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    pillBtn: {
      minWidth: 72,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    pillBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    pillText: { color: colors.text, fontWeight: '600', fontSize: 13 },
    pillTextActive: { color: '#fff' },

    primaryAction: {
      marginTop: 8,
      minHeight: 46,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    primaryActionText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    worksheetBtn: {
      minHeight: 44,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    worksheetBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
    disabled: { opacity: 0.65 },

    errorBox: {
      borderWidth: 1,
      borderColor: '#FCA5A5',
      backgroundColor: '#FEF2F2',
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    errorText: { color: '#B91C1C', fontSize: 12, flex: 1 },

    centerEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20, backgroundColor: colors.background },
    emptyTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  });
