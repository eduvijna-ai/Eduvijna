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
import { useTheme } from '@context/ThemeContext';
import {
  DocumentUploadBook,
  extractRawContent,
  fetchBookPageImage,
  generateFromBook,
  generateMultimodalAssessmentFromDocument,
  isPdfAsset,
  MAX_QUIZ_PAGES,
  resolveServerBook,
} from '@core/services/documentUploadApi';
import { generateWorksheet, saveUserAssessment } from '@core/services/sharedApi';
import { markDocumentUploadSessionComplete } from '@core/services/documentUploadStorage';
import { useUserStore } from '@core/store/user.store';

const pageItems = (totalPages: number) =>
  Array.from({ length: Math.max(1, totalPages || 1) }, (_, i) => i + 1);

const QUESTION_OPTIONS = [5, 10, 15, 20] as const;
const DIFFICULTY_OPTIONS = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
] as const;

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
  const [classValue, setClassValue] = useState('');
  const [subject, setSubject] = useState('');
  const [lesson, setLesson] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set([1]));
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [loadingWorksheet, setLoadingWorksheet] = useState(false);
  const [error, setError] = useState('');
  const [thumbImages, setThumbImages] = useState<Record<number, string>>({});
  const [previewImages, setPreviewImages] = useState<Record<number, string>>({});
  const [loadingImages, setLoadingImages] = useState(false);
  const [resolvedPageCount, setResolvedPageCount] = useState<number | null>(null);
  const [imageDocIds, setImageDocIds] = useState<string[]>([]);
  const requestedImages = useRef<Set<string>>(new Set());

  const totalPages = resolvedPageCount ?? book?.totalPages ?? 1;
  const docId = book?.docId;

  useEffect(() => {
    if (!book) return;
    setLesson((prev) => prev || book.title || book.originalName || '');
  }, [book?.title, book?.originalName]);

  const resolvedClass = classValue.trim() || 'Class 10';
  const resolvedSubject = subject.trim() || 'Document';
  const resolvedLesson = lesson.trim() || book?.title || book?.originalName || 'Document Lesson';

  // Resolve accurate page count + library file_id for page images.
  useEffect(() => {
    if (!docId || !book) return;
    let cancelled = false;
    (async () => {
      const serverBook = await resolveServerBook(docId, book.originalName || book.title);
      if (cancelled) return;
      if (serverBook?.totalPages) {
        setResolvedPageCount(serverBook.totalPages);
      }
      const allIds = [docId, serverBook?.docId].filter(
        (id): id is string => !!id && id.trim().length > 0,
      );
      const uniqueIds = allIds.filter((id, index, list) => list.indexOf(id) === index);
      setImageDocIds(uniqueIds.length > 1 ? uniqueIds.slice(1) : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [docId, book?.originalName, book?.title]);

  // Load real page thumbnails + larger preview from server (study-materials / pdf-questions).
  useEffect(() => {
    if (!docId) return;
    let cancelled = false;
    setLoadingImages(true);

    const loadImage = async (p: number, size: 'mini' | 'medium') => {
      const key = `${p}:${size}`;
      if (requestedImages.current.has(key)) return;
      requestedImages.current.add(key);
      const [primaryId, ...alternateIds] = [docId, ...imageDocIds].filter(
        (id, index, list) => id && list.indexOf(id) === index,
      );
      const uri = await fetchBookPageImage(primaryId, p, size === 'mini' ? 'mini' : 'medium', alternateIds);
      if (cancelled) return;
      if (!uri) {
        requestedImages.current.delete(key);
        return;
      }
      if (size === 'mini') {
        setThumbImages((prev) => ({ ...prev, [p]: uri }));
      } else {
        setPreviewImages((prev) => ({ ...prev, [p]: uri }));
      }
    };

    const maxThumbs = Math.min(Math.max(1, totalPages), 24);
    (async () => {
      for (let p = 1; p <= maxThumbs; p += 1) {
        await loadImage(p, 'mini');
      }
      await loadImage(page, 'medium');
      if (!cancelled) setLoadingImages(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [docId, imageDocIds, totalPages, page]);

  const goBackHome = () => {
    navigation.navigate('DocumentUploadHomeScreen');
  };

  const handleGenerateQuiz = async () => {
    const pageNumbers = Array.from(selectedPages).sort((a, b) => a - b);
    const useServerBook =
      !!book?.docId && isPdfAsset(book.originalName, book.mimeType);

    if (!useServerBook && !book?.fileUri) {
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

      let questions: Array<{
        id: string;
        question: string;
        options: string[];
        correctAnswer: string;
        answer: string;
        explanation: string | null;
      }> = [];

      if (useServerBook && book.docId) {
        const result = await generateFromBook({
          docId: book.docId,
          pageNumbers,
          questionCount,
          difficulty,
          subject: resolvedSubject,
          gradeLevel: resolvedClass,
          lessonTitle: resolvedLesson,
        });
        questions = result.questions;
      } else if (book?.fileUri) {
        const result = await generateMultimodalAssessmentFromDocument({
          fileUri: book.fileUri,
          fileName: book.originalName || 'document.pdf',
          mimeType: book.mimeType || 'application/pdf',
          questionCount,
          difficulty,
          language: 'English',
          subject: resolvedSubject,
          gradeLevel: resolvedClass,
          lessonTitle: resolvedLesson,
          selectedPages: pageNumbers,
        });
        questions = result.quizData.questions;
      }

      if (!questions.length) {
        setError('Assessment generation returned no questions. Please try another file or configuration.');
        return;
      }

      await saveUserAssessment({
        title: book.title || book.originalName,
        subject: resolvedSubject,
        class_name: resolvedClass,
        level: difficulty,
        lesson: resolvedLesson,
        assessment_type: 'web-quiz',
        source: 'Document',
        school_id: schoolId,
        questions: questions.map((q) => ({
          quiz: {
            question: q.question,
            options: q.options,
            answer: q.correctAnswer,
            explanation: q.explanation,
          },
          answer: q.correctAnswer,
        })),
      });

      if (book?.id) {
        await markDocumentUploadSessionComplete(book.id);
      }

      navigation.navigate('DocumentUploadQuizScreen', {
        quizData: {
          id: book.docId || book.id,
          title: book.title || book.originalName,
          class: resolvedClass,
          subject: resolvedSubject,
          difficulty,
          lesson: resolvedLesson,
          questions,
          regenerationParams: {
            type: 'document-upload',
            fileName: book.originalName || 'document.pdf',
            grade: resolvedClass,
            subject: resolvedSubject,
            level: difficulty,
            lesson: resolvedLesson,
            count: questionCount,
            selectedPages: pageNumbers,
          },
        },
      });
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

      // Web parity: feed extracted page text into the worksheet generator as itext.
      // Only available when the book exists in the server study-materials store.
      let rawContent = '';
      if (book?.docId) {
        rawContent = await extractRawContent({
          docId: book.docId,
          pageNumbers: Array.from(selectedPages).sort((a, b) => a - b),
        });
      }

      const worksheet = await generateWorksheet({
        class: resolvedClass,
        subject: resolvedSubject,
        lesson: resolvedLesson,
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
        await saveUserAssessment({
          title: `${book?.title || 'Document'} Worksheet`,
          subject: wsData.Metadata?.Subject || 'Document',
          class_name: wsData.Metadata?.Class || 'Class 10',
          level: wsData.Metadata?.Difficulty || difficulty,
          lesson: wsData.Metadata?.Lesson || book?.title,
          assessment_type: 'worksheet',
          source: 'Doc-Worksheet',
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

      if (book?.id) {
        await markDocumentUploadSessionComplete(book.id);
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
    setError('');
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        next.delete(p);
      } else {
        if (next.size >= MAX_QUIZ_PAGES) {
          setError(`You can select up to ${MAX_QUIZ_PAGES} pages at a time.`);
          return prev;
        }
        next.add(p);
      }
      return next;
    });
  };

  const pageList = pageItems(totalPages);
  const previewUri = previewImages[page] || thumbImages[page];
  const showImageFallback = !previewUri && !loadingImages;

  const toggleSelectAll = () => {
    setError('');
    if (selectedPages.size > 0) {
      setSelectedPages(new Set());
      return;
    }
    // "Select All" is capped at the first MAX_QUIZ_PAGES pages (web parity).
    setSelectedPages(new Set(pageList.slice(0, MAX_QUIZ_PAGES)));
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="document-text" size={20} color="#DC2626" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle} numberOfLines={1}>{book.title || book.originalName}</Text>
            <Text style={styles.summaryMeta} numberOfLines={1}>
              Pages: {totalPages}{book.originalName ? ` · ${book.originalName}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.toolbar}>
          <View style={styles.pageNav}>
            <TouchableOpacity
              style={[styles.navBtn, page <= 1 && styles.navBtnDisabled]}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <Ionicons name="chevron-back" size={16} color={page <= 1 ? colors.textSecondary : colors.text} />
            </TouchableOpacity>
            <Text style={styles.pageNavText}>Page {page} of {totalPages}</Text>
            <TouchableOpacity
              style={[styles.navBtn, page >= totalPages && styles.navBtnDisabled]}
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <Ionicons name="chevron-forward" size={16} color={page >= totalPages ? colors.textSecondary : colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.zoomRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setZoom((z) => Math.max(60, z - 20))}>
              <Ionicons name="remove" size={16} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.zoomText}>{zoom}%</Text>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setZoom((z) => Math.min(200, z + 20))}>
              <Ionicons name="add" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.previewWrap}>
          {previewUri ? (
            <Image
              source={{ uri: previewUri }}
              style={[styles.previewImage, { transform: [{ scale: zoom / 100 }] }]}
              resizeMode="contain"
            />
          ) : showImageFallback ? (
            <View style={styles.previewPlaceholder}>
              {loadingImages ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="document-text-outline" size={40} color={colors.textSecondary} />
              )}
              <Text style={styles.previewPlaceholderText}>
                {loadingImages ? 'Loading page preview…' : `Page ${page} preview unavailable`}
              </Text>
            </View>
          ) : (
            <View style={styles.previewPlaceholder}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.previewPlaceholderText}>Loading page {page}…</Text>
            </View>
          )}
        </View>

        <View style={styles.selectionBar}>
          <Text style={styles.thumbHint} numberOfLines={2}>
            Tap thumbnails to preview, use the check icon to include pages (max {MAX_QUIZ_PAGES})
          </Text>
          <View style={styles.selectionMetaRow}>
            <Text style={styles.selectionCount}>
              Selected: {selectedPages.size} / {Math.min(MAX_QUIZ_PAGES, totalPages)} (max {MAX_QUIZ_PAGES})
            </Text>
            <TouchableOpacity style={styles.selectAllBtn} onPress={toggleSelectAll}>
              <Text style={styles.selectAllText}>{selectedPages.size > 0 ? 'Clear' : 'Select All'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
          {pageList.map((p) => {
            const isSelected = selectedPages.has(p);
            return (
              <View key={p} style={[styles.thumbItem, p === page && styles.thumbActive, isSelected && styles.thumbSelected]}>
                <TouchableOpacity style={styles.selectCheck} onPress={() => togglePageSelection(p)}>
                  <Ionicons name={isSelected ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={isSelected ? '#0E7490' : '#94A3B8'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPage(p)}>
                  {thumbImages[p] ? (
                    <Image source={{ uri: thumbImages[p] }} style={styles.thumbImage} />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Text style={styles.thumbPlaceholderText}>{p}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={[styles.thumbText, p === page && styles.thumbTextActive, isSelected && styles.thumbTextSelected]}>{p}</Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.generatorCard}>
          <Text style={styles.sectionTitle}>Step 3 · Generate Quiz</Text>
          <Text style={styles.sectionSub}>Configure options, then generate from selected pages</Text>

          <Text style={styles.label}>Class / Grade</Text>
          <TextInput
            value={classValue}
            onChangeText={setClassValue}
            placeholder="e.g., Class 10"
            style={styles.metaInput}
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>Subject</Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="e.g., Maths"
            style={styles.metaInput}
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>Lesson / Topic</Text>
          <TextInput
            value={lesson}
            onChangeText={setLesson}
            placeholder="e.g., Resume review"
            style={styles.metaInput}
            placeholderTextColor={colors.textSecondary}
          />

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

    summaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 10,
    },
    summaryIcon: {
      width: 38,
      height: 38,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FEE2E2',
    },
    summaryTitle: { color: colors.text, fontWeight: '700', fontSize: 14 },
    summaryMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },

    toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pageNav: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.card,
      paddingHorizontal: 6,
      paddingVertical: 4,
    },
    pageNavText: { color: colors.text, fontWeight: '700', fontSize: 13, minWidth: 92, textAlign: 'center' },
    navBtn: {
      width: 28,
      height: 28,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    navBtnDisabled: { opacity: 0.5 },
    zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    zoomText: { color: colors.text, fontWeight: '700', fontSize: 13, minWidth: 40, textAlign: 'center' },
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
    previewWrap: {
      width: '100%',
      height: 320,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewImage: {
      width: '100%',
      height: '100%',
    },
    previewPlaceholder: {
      flex: 1,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 16,
    },
    previewPlaceholderText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
    },
    thumbHint: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
    selectionBar: {
      marginTop: 4,
      gap: 8,
    },
    selectionMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    selectAllBtn: {
      flexShrink: 0,
      paddingHorizontal: 12,
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
      flex: 1,
      flexShrink: 1,
      color: colors.textSecondary,
      fontSize: 12,
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
    thumbPlaceholder: {
      width: 54,
      height: 58,
      borderRadius: 4,
      backgroundColor: colors.inputBackground,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    thumbPlaceholderText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
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
    metaInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.inputBackground || colors.card,
    },
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
