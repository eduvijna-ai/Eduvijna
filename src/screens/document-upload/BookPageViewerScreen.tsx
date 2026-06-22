/**
 * BookPageViewerScreen
 * Opened from DocumentLibraryScreen. Lets the teacher pick up to 5 pages of an
 * already-uploaded server book and generate a quiz or worksheet from them.
 *
 * Mirrors the web HandwrittenWorkspace right-panel generation controls.
 * Uses the app's standard ThemeContext palette.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@context/ThemeContext';
import { useUserStore } from '@core/store/user.store';
import {
  generateFromBook,
  extractRawContent,
  fetchBookPageImage,
  MAX_QUIZ_PAGES,
  type ServerBook,
  type DocumentUploadDifficulty,
} from '@core/services/documentUploadApi';
import { generateWorksheet, saveUserAssessment } from '@core/services/sharedApi';

const MAX_PAGES = MAX_QUIZ_PAGES;
const DIFFICULTIES: Array<{ key: DocumentUploadDifficulty; label: string }> = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
];
const COUNT_OPTIONS = [5, 10, 15, 20];

const normalizeErrorMessage = (err: any, fallback: string): string => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (typeof err?.message === 'string' && err.message.trim()) return err.message;
  return fallback;
};

export default function BookPageViewerScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const schoolId = useUserStore((s) => s.schoolId);

  const book: ServerBook | undefined = route.params?.book;

  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set([1]));
  const [difficulty, setDifficulty] = useState<DocumentUploadDifficulty>('medium');
  const [questionCount, setQuestionCount] = useState(10);
  const [subject, setSubject] = useState(book?.subject || '');
  const [grade, setGrade] = useState(book?.gradeLevel || '');
  const [lesson, setLesson] = useState(book?.lessonTitle || book?.title || '');
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [generatingWorksheet, setGeneratingWorksheet] = useState(false);
  const [error, setError] = useState('');
  const [thumbImages, setThumbImages] = useState<Record<number, string>>({});
  const [previewImages, setPreviewImages] = useState<Record<number, string>>({});
  const [loadingImages, setLoadingImages] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const requestedImages = useRef<Set<string>>(new Set());

  const docId = book?.docId;
  const totalPagesRaw = Math.max(1, book?.totalPages || 1);

  // Lazily load protected page thumbnails + a larger preview for the focused page.
  useEffect(() => {
    if (!docId) return;
    let cancelled = false;
    setLoadingImages(true);

    const loadImage = async (pageNum: number, size: 'mini' | 'medium') => {
      const key = `${pageNum}:${size}`;
      if (requestedImages.current.has(key)) return;
      requestedImages.current.add(key);
      const uri = await fetchBookPageImage(docId, pageNum, size === 'mini' ? 'mini' : 'medium');
      if (cancelled) return;
      if (!uri) {
        requestedImages.current.delete(key);
        return;
      }
      if (size === 'mini') {
        setThumbImages((prev) => ({ ...prev, [pageNum]: uri }));
      } else {
        setPreviewImages((prev) => ({ ...prev, [pageNum]: uri }));
      }
    };

    (async () => {
      const maxThumbs = Math.min(totalPagesRaw, 24);
      for (let p = 1; p <= maxThumbs; p += 1) {
        await loadImage(p, 'mini');
      }
      await loadImage(previewPage, 'medium');
      if (!cancelled) setLoadingImages(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [docId, totalPagesRaw, previewPage]);

  if (!book) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.emptyTitle}>No book selected</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalPages = Math.max(1, book.totalPages || 1);
  const pageList = Array.from({ length: Math.min(totalPages, 24) }, (_, i) => i + 1);

  const togglePage = (p: number) => {
    setError('');
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        next.delete(p);
      } else {
        if (next.size >= MAX_PAGES) {
          setError(`You can select up to ${MAX_PAGES} pages.`);
          return prev;
        }
        next.add(p);
      }
      return next;
    });
  };

  const orderedPages = () => Array.from(selectedPages).sort((a, b) => a - b);

  const handleGenerateQuiz = async () => {
    if (selectedPages.size === 0) {
      setError('Please select at least one page.');
      return;
    }
    setGeneratingQuiz(true);
    setError('');
    try {
      const result = await generateFromBook({
        docId: book.docId,
        pageNumbers: orderedPages(),
        questionCount,
        difficulty,
        subject: subject.trim(),
        gradeLevel: grade.trim(),
        lessonTitle: lesson.trim() || book.title,
      });

      if (!result.questions.length) {
        setError('No questions were generated from the selected pages. Try different pages.');
        return;
      }

      try {
        await saveUserAssessment({
          title: lesson.trim() || book.title,
          subject: subject.trim() || 'Document',
          class_name: grade.trim() || 'General',
          level: difficulty,
          lesson: lesson.trim() || book.title,
          assessment_type: 'web-quiz',
          source: 'Document',
          school_id: schoolId ?? null,
          questions: result.questions.map((q) => ({
            quiz: { question: q.question, options: q.options, answer: q.correctAnswer, explanation: q.explanation },
            answer: q.correctAnswer,
          })),
        });
      } catch {
        // non-blocking
      }

      navigation.navigate('QuizTakingScreen', {
        quizData: {
          title: lesson.trim() || book.title,
          questions: result.questions,
          class: grade.trim(),
          subject: subject.trim(),
          difficulty,
          lesson: lesson.trim() || book.title,
        },
        source: 'document',
        showShareButton: true,
        showActionButtons: true,
      });
    } catch (e: any) {
      setError(normalizeErrorMessage(e, 'Failed to generate quiz from this book.'));
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleGenerateWorksheet = async () => {
    if (selectedPages.size === 0) {
      setError('Please select at least one page.');
      return;
    }
    setGeneratingWorksheet(true);
    setError('');
    try {
      // Pull raw content first so the worksheet reflects the chosen pages
      // (web parity: extract-raw-content → itext fed into worksheet/generate).
      const rawContent = await extractRawContent({ docId: book.docId, pageNumbers: orderedPages() });

      const worksheet = await generateWorksheet({
        class: grade.trim() || 'General',
        subject: subject.trim() || 'Document',
        lesson: lesson.trim() || book.title,
        itext: rawContent,
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
        try {
          await saveUserAssessment({
            title: `${lesson.trim() || book.title} Worksheet`,
            subject: subject.trim() || 'Document',
            class_name: grade.trim() || 'General',
            level: difficulty,
            lesson: lesson.trim() || book.title,
            assessment_type: 'worksheet',
            source: 'Doc-Worksheet',
            school_id: schoolId ?? null,
            questions: [
              { quiz: { question: '__WS_DATA__' + JSON.stringify(wsData), options: [], answer: 'A' }, answer: 'A' },
            ],
          });
        } catch {
          // non-blocking
        }
      }

      navigation.navigate('WorksheetScreen', {
        worksheetData: worksheet,
        title: `${lesson.trim() || book.title} Worksheet`,
        selectedPages: orderedPages(),
      });
    } catch (e: any) {
      setError(normalizeErrorMessage(e, 'Failed to generate worksheet from this book.'));
    } finally {
      setGeneratingWorksheet(false);
    }
  };

  const busy = generatingQuiz || generatingWorksheet;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(24, insets.bottom + 16) }}>
        {/* Book header */}
        <View style={styles.bookHeader}>
          <View style={[styles.bookIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="book" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
            <Text style={styles.bookSub}>{totalPages} pages available</Text>
          </View>
        </View>

        {/* Focused page preview */}
        <View style={styles.previewWrap}>
          {previewImages[previewPage] || thumbImages[previewPage] ? (
            <Image
              source={{ uri: previewImages[previewPage] || thumbImages[previewPage] }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.previewPlaceholder}>
              {loadingImages ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="document-text-outline" size={36} color={colors.textSecondary} />
              )}
              <Text style={styles.previewPlaceholderText}>
                {loadingImages ? `Loading page ${previewPage}…` : `Page ${previewPage} preview unavailable`}
              </Text>
            </View>
          )}
        </View>

        {/* Page selection */}
        <Text style={styles.sectionTitle}>Select Pages</Text>
        <Text style={styles.sectionHint}>Tap a page to preview, tick the badge to include it. Choose up to {MAX_PAGES} pages ({selectedPages.size} selected)</Text>
        <View style={styles.pageGrid}>
          {pageList.map((p) => {
            const active = selectedPages.has(p);
            const focused = previewPage === p;
            const thumb = thumbImages[p];
            return (
              <TouchableOpacity
                key={p}
                style={[
                  styles.pageTile,
                  focused && { borderColor: colors.primary, borderWidth: 2 },
                  active && !thumb && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => {
                  setPreviewPage(p);
                  togglePage(p);
                }}
                disabled={busy}
              >
                {thumb ? (
                  <Image source={{ uri: thumb }} style={styles.pageThumb} resizeMode="cover" />
                ) : (
                  <Text style={[styles.pageTileText, active && { color: '#fff' }]}>{p}</Text>
                )}
                <View style={styles.pageNumBadge}>
                  <Text style={styles.pageNumBadgeText}>{p}</Text>
                </View>
                {active && (
                  <View style={styles.pageCheck}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Difficulty */}
        <Text style={styles.sectionTitle}>Difficulty</Text>
        <View style={styles.segmentRow}>
          {DIFFICULTIES.map((d) => {
            const active = difficulty === d.key;
            return (
              <TouchableOpacity
                key={d.key}
                style={[styles.segment, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setDifficulty(d.key)}
                disabled={busy}
              >
                <Text style={[styles.segmentText, active && { color: '#fff' }]}>{d.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Question count */}
        <Text style={styles.sectionTitle}>Number of Questions</Text>
        <View style={styles.segmentRow}>
          {COUNT_OPTIONS.map((c) => {
            const active = questionCount === c;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.segment, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setQuestionCount(c)}
                disabled={busy}
              >
                <Text style={[styles.segmentText, active && { color: '#fff' }]}>{c}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Metadata (pre-filled, editable) */}
        <Text style={styles.sectionTitle}>Details</Text>
        <Text style={styles.fieldLabel}>Subject</Text>
        <TextInput
          style={styles.input}
          value={subject}
          onChangeText={setSubject}
          placeholder="Subject"
          placeholderTextColor={colors.textSecondary}
          editable={!busy}
        />
        <Text style={styles.fieldLabel}>Grade / Class</Text>
        <TextInput
          style={styles.input}
          value={grade}
          onChangeText={setGrade}
          placeholder="Grade / Class"
          placeholderTextColor={colors.textSecondary}
          editable={!busy}
        />
        <Text style={styles.fieldLabel}>Lesson</Text>
        <TextInput
          style={styles.input}
          value={lesson}
          onChangeText={setLesson}
          placeholder="Lesson"
          placeholderTextColor={colors.textSecondary}
          editable={!busy}
        />

        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={colors.error || '#B91C1C'} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Actions */}
        <TouchableOpacity
          style={[styles.primaryBtn, busy && styles.disabledBtn]}
          onPress={handleGenerateQuiz}
          disabled={busy}
          activeOpacity={0.85}
        >
          {generatingQuiz ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="sparkles-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Generate Quiz</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, busy && styles.disabledBtn]}
          onPress={handleGenerateWorksheet}
          disabled={busy}
          activeOpacity={0.85}
        >
          {generatingWorksheet ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={18} color={colors.primary} />
              <Text style={styles.secondaryBtnText}>Generate Worksheet</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },

    bookHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 18,
    },
    bookIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    bookTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    bookSub: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },

    sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 4 },
    sectionHint: { fontSize: 12, color: colors.textSecondary, marginBottom: 10 },

    previewWrap: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.card,
      overflow: 'hidden',
      marginBottom: 16,
    },
    previewImage: { width: '100%', height: 280, backgroundColor: colors.inputBackground },
    previewPlaceholder: { height: 200, alignItems: 'center', justifyContent: 'center', gap: 8 },
    previewPlaceholderText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },

    pageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
    pageTile: {
      width: 58,
      height: 72,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    pageThumb: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
    pageTileText: { fontSize: 15, fontWeight: '700', color: colors.text },
    pageNumBadge: {
      position: 'absolute',
      bottom: 2,
      left: 2,
      backgroundColor: 'rgba(15,23,42,0.72)',
      borderRadius: 6,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    pageNumBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    pageCheck: {
      position: 'absolute',
      top: 2,
      right: 2,
      backgroundColor: 'rgba(255,255,255,0.92)',
      borderRadius: 9,
    },

    segmentRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    segment: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
    },
    segmentText: { fontSize: 13, fontWeight: '600', color: colors.text },

    fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 5, marginTop: 4 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 11,
      color: colors.text,
      fontSize: 14,
      marginBottom: 10,
    },

    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: (colors.error || '#DC2626') + '15',
      borderRadius: 10,
      padding: 10,
      marginVertical: 8,
    },
    errorText: { flex: 1, color: colors.error || '#B91C1C', fontSize: 13 },

    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      height: 52,
      borderRadius: 14,
      marginTop: 12,
    },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.primary,
      height: 50,
      borderRadius: 14,
      marginTop: 10,
    },
    secondaryBtnText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
    disabledBtn: { opacity: 0.6 },

    emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16 },
    retryBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
    retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  });
