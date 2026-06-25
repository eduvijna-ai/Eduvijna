/**
 * ImageAssessmentScreen — mobile parity with the web ImageAssessmentWorkspace.
 *
 * Flow:
 *   1. Upload  — pick image (gallery/camera), choose difficulty + language, Analyze.
 *                Library/search of previously analyzed images lives here too.
 *   2. Analyze — rich, structured AI analysis (summary, tags, keywords, elements,
 *                concepts, process, relationships, mathematics, applications).
 *                Sticky footer with AI settings + Generate Assessment / Worksheet.
 *   3. History — saved Quiz / Worksheet / Summary assessments grouped & tappable.
 *
 * API: /api/v1/analyze-image, /api/v1/image-assessments, /api/v1/quiz/generate,
 *      /api/v1/worksheet/generate, /api/v1/user-assessments.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@context/ThemeContext';
import { useAuth } from '@core/hooks/useAuth';
import useNotifications from '@core/hooks/useNotifications';
import MathRenderer from '../components/MathRenderer';
import LoadingSpinner from '../components/LoadingSpinner';
import GenerateWorksheetModal from '../components/GenerateWorksheetModal';
import {
  generateAIQuiz,
  generateWorksheet,
  saveUserAssessment,
  listUserAssessments,
  getUserAssessmentById,
  type AssessmentListItem,
} from '../core/services/sharedApi';
import {
  analyzeImage,
  fileToBase64,
  saveImageAssessment,
  listImageAssessments,
  getImageAssessment,
  linkImageAssessment,
  toDataUrl,
  buildMappedContext,
  buildQuizPrompt,
  buildWorksheetItext,
  IMAGE_LEVELS,
  IMAGE_LANGUAGES,
  type ImageAnalysisResponse,
  type ImageAssessmentItem,
  type ImageStudentLevel,
} from '../core/services/imageAssessmentApi';

type MainTab = 'upload' | 'analyze' | 'history';

interface HistoryEntry {
  id: string;
  assessmentId: number;
  title: string;
  subject?: string;
  lesson?: string;
  questionCount: number;
  createdAt: string;
  source?: string;
}

const COUNT_OPTIONS = [5, 10, 15, 20];

const formatDate = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
};

const toOptionLetter = (raw: string, options: string[]): 'A' | 'B' | 'C' | 'D' => {
  const upper = String(raw || '').trim().toUpperCase();
  if (['A', 'B', 'C', 'D'].includes(upper)) return upper as 'A' | 'B' | 'C' | 'D';
  const idx = options.map((o) => o.trim().toLowerCase()).findIndex((o) => o === String(raw || '').trim().toLowerCase());
  if (idx >= 0 && idx <= 3) return ['A', 'B', 'C', 'D'][idx] as 'A' | 'B' | 'C' | 'D';
  return 'A';
};

export default function ImageAssessmentScreen({ navigation }: any) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const { refreshAfterQuizGenerated } = useNotifications();

  const resolvedSchoolId = useMemo(() => {
    const toNum = (v: any): number | undefined => {
      if (v === null || v === undefined || v === '') return undefined;
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    return (
      toNum((user as any)?.school_id) ??
      toNum((user as any)?.schoolId) ??
      toNum((user as any)?.school?.id) ??
      toNum((user as any)?.profile?.school?.id) ??
      undefined
    );
  }, [user]);

  const [activeTab, setActiveTab] = useState<MainTab>('upload');

  // Upload / config
  const [studentLevel, setStudentLevel] = useState<ImageStudentLevel>('middle_school');
  const [language, setLanguage] = useState('en');
  const [questionCount, setQuestionCount] = useState(5);
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  // Selected image
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');
  const [imageMime, setImageMime] = useState('image/jpeg');
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);
  const [persistentImageId, setPersistentImageId] = useState<number | null>(null);

  // Analysis
  const [analysis, setAnalysis] = useState<ImageAnalysisResponse | null>(null);

  // Library
  const [library, setLibrary] = useState<ImageAssessmentItem[]>([]);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryLoading, setLibraryLoading] = useState(false);

  // History
  const [historyQuiz, setHistoryQuiz] = useState<HistoryEntry[]>([]);
  const [historyWorksheet, setHistoryWorksheet] = useState<HistoryEntry[]>([]);
  const [historySummary, setHistorySummary] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState<{ quiz: boolean; worksheet: boolean; summary: boolean }>({
    quiz: true,
    worksheet: false,
    summary: false,
  });

  // Status
  const [analyzing, setAnalyzing] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const [worksheetModalOpen, setWorksheetModalOpen] = useState(false);
  const [worksheetLoading, setWorksheetLoading] = useState(false);
  const [worksheetError, setWorksheetError] = useState('');
  const [loadingEntryId, setLoadingEntryId] = useState<string | null>(null);

  const ctx = useMemo(
    () => buildMappedContext(analysis, studentLevel, language, imageName),
    [analysis, studentLevel, language, imageName],
  );

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadLibrary = useCallback(async (search?: string) => {
    setLibraryLoading(true);
    try {
      const rows = await listImageAssessments(search);
      setLibrary(rows);
    } catch {
      setLibrary([]);
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const mapList = (list: AssessmentListItem[] = []): HistoryEntry[] =>
        [...list]
          .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
          .map((item) => ({
            id: `image-${item.id}`,
            assessmentId: item.id,
            title: item.title || 'Image Assessment',
            subject: item.subject,
            lesson: item.lesson,
            questionCount: item.question_count || 0,
            createdAt: item.created_at,
            source: item.source,
          }));

      const [quiz, worksheet, summary] = await Promise.all([
        listUserAssessments('image-quiz', 'Image'),
        listUserAssessments('worksheet', 'Img-Worksheet'),
        listUserAssessments(undefined, 'Img-Summary'),
      ]);
      setHistoryQuiz(mapList(quiz));
      setHistoryWorksheet(mapList(worksheet));
      setHistorySummary(mapList(summary));
    } catch {
      setHistoryQuiz([]);
      setHistoryWorksheet([]);
      setHistorySummary([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLibrary();
    loadHistory();
  }, [loadLibrary, loadHistory]);

  // ── Image picking ───────────────────────────────────────────────────────────

  const applyPickedImage = (uri: string, fileName?: string, mime?: string) => {
    setImageUri(uri);
    setImageName(fileName || uri.split('/').pop() || 'image.jpg');
    setImageMime(mime || 'image/jpeg');
    setAnalysis(null);
    setSelectedLibraryId(null);
    setPersistentImageId(null);
    setInlineError('');
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      applyPickedImage(asset.uri, asset.fileName || undefined, asset.mimeType || undefined);
    }
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Please allow camera access to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      applyPickedImage(asset.uri, asset.fileName || `photo-${Date.now()}.jpg`, asset.mimeType || undefined);
    }
  };

  // ── Analyze ───────────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!imageUri) {
      setInlineError('Please upload or select an image first.');
      return;
    }
    setAnalyzing(true);
    setInlineError('');
    setActiveTab('analyze');
    try {
      const data = await analyzeImage({ fileUri: imageUri, studentLevel, language });
      setAnalysis(data);

      // Persist the analyzed image so it appears in the library (web parity).
      try {
        const base64 = await fileToBase64(imageUri);
        const saved = await saveImageAssessment({
          image_name: imageName || 'image.jpg',
          mime_type: imageMime || 'image/png',
          image_base64: base64,
          student_level: studentLevel,
          language,
          analysis_payload: data,
          source: 'Image',
          school_id: resolvedSchoolId ?? null,
        });
        setPersistentImageId(saved.id);
        setSelectedLibraryId(`db-${saved.id}`);
        loadLibrary();
      } catch {
        // Non-blocking: analysis is still usable even if persistence fails.
      }
    } catch (e: any) {
      setInlineError(e?.response?.data?.detail || e?.message || 'Failed to analyze image.');
      setActiveTab('upload');
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Generate Assessment ─────────────────────────────────────────────────────

  const handleGenerateQuiz = async () => {
    if (!analysis) {
      setInlineError('Please analyze the image before generating an assessment.');
      return;
    }
    setQuizLoading(true);
    setInlineError('');
    try {
      const itext = buildQuizPrompt(analysis, ctx, additionalInstructions);
      const result = await generateAIQuiz({
        class: ctx.className,
        subject: ctx.subject,
        lesson: ctx.lesson,
        topic: ctx.topic,
        level: ctx.difficulty,
        language: ctx.language,
        count: questionCount,
        itext,
      });

      const rawQuiz: Array<{ correctAnswer?: string; answer?: string; options: string[]; question: string; explanation?: string }> =
        result?.quiz || [];
      if (!rawQuiz.length) {
        throw new Error('No questions were returned for this image.');
      }

      const flatQuestions = rawQuiz.map((item, idx) => {
        const options = Array.isArray(item.options) ? item.options.map((o) => String(o)) : [];
        const letter = toOptionLetter(String(item.correctAnswer || item.answer || ''), options);
        return {
          id: `q-${idx}`,
          question: item.question,
          options,
          correctAnswer: letter,
          answer: letter,
          explanation: item.explanation || null,
        };
      });

      await refreshAfterQuizGenerated();

      // Persist to history (web parity: source 'Image', type 'image-quiz').
      try {
        const saved = await saveUserAssessment({
          title: [ctx.subject, ctx.lesson].filter(Boolean).join(' - ') || 'Image Assessment',
          subject: ctx.subject,
          class_name: ctx.className,
          level: ctx.difficulty,
          lesson: ctx.lesson,
          assessment_type: 'image-quiz',
          source: 'Image',
          school_id: resolvedSchoolId ?? null,
          questions: rawQuiz.map((item) => {
            const options = Array.isArray(item.options) ? item.options.map((o) => String(o)) : [];
            const letter = toOptionLetter(String(item.correctAnswer || item.answer || ''), options);
            return {
              quiz: {
                question: item.question,
                options,
                answer: letter,
                explanation: item.explanation || '',
              },
              answer: letter,
            };
          }),
        });
        if (saved?.id && persistentImageId) {
          try {
            await linkImageAssessment(persistentImageId, saved.id);
          } catch {
            // Non-blocking link failure
          }
        }
        loadHistory();
      } catch {
        // Non-blocking save failure
      }

      navigation.navigate('QuizTakingScreen', {
        quizData: {
          id: result.quiz_id,
          title: `${ctx.lesson} Assessment`,
          questions: flatQuestions,
          class: ctx.className,
          subject: ctx.subject,
          difficulty: ctx.difficulty,
          lesson: ctx.lesson,
          thread_id: result.thread_id,
          thread_slug: result.thread_slug,
          reused_thread: result.reused_thread,
        },
        source: 'image',
        showShareButton: true,
        showActionButtons: true,
      });
    } catch (e: any) {
      setInlineError(e?.response?.data?.detail || e?.message || 'Failed to generate assessment.');
    } finally {
      setQuizLoading(false);
    }
  };

  // ── Generate Worksheet ──────────────────────────────────────────────────────

  const handleGenerateWorksheet = async (counts: {
    mcq: number;
    fitb: number;
    tf: number;
    shortQ: number;
    matching: number;
  }) => {
    if (!analysis) {
      setWorksheetError('Please analyze an image first.');
      return;
    }
    const total = counts.mcq + counts.fitb + counts.tf + counts.shortQ + counts.matching;
    if (total === 0) {
      setWorksheetError('Please select at least one question type.');
      return;
    }
    setWorksheetLoading(true);
    setWorksheetError('');
    try {
      const itext = buildWorksheetItext(analysis, language);
      const result = await generateWorksheet({
        class: ctx.className,
        subject: ctx.subject,
        lesson: ctx.lesson,
        level: ctx.worksheetLevel,
        itext,
        count: total,
        mcq_count: counts.mcq,
        fitb_count: counts.fitb,
        tf_count: counts.tf,
        short_q_count: counts.shortQ,
        matching_count: counts.matching,
        type: 'worksheet',
      });

      const wsData = result?.WorksheetData;
      const title = [ctx.subject, ctx.lesson].filter(Boolean).join(' - ') || 'Image Worksheet';
      if (wsData) {
        try {
          await saveUserAssessment({
            title,
            subject: ctx.subject,
            class_name: ctx.className,
            level: ctx.worksheetLevel,
            lesson: ctx.lesson,
            assessment_type: 'worksheet',
            source: 'Img-Worksheet',
            school_id: resolvedSchoolId ?? null,
            questions: [
              {
                quiz: { question: '__WS_DATA__' + JSON.stringify(wsData), options: [], answer: 'A' },
                answer: 'A',
              },
            ],
          });
          loadHistory();
        } catch {
          // Non-blocking save failure
        }
      }

      setWorksheetModalOpen(false);
      navigation.navigate('WorksheetScreen', { worksheetData: result, title });
    } catch (e: any) {
      setWorksheetError(e?.message || 'Failed to generate worksheet.');
    } finally {
      setWorksheetLoading(false);
    }
  };

  // ── Library / History selection ─────────────────────────────────────────────

  const selectLibraryItem = async (item: ImageAssessmentItem) => {
    try {
      const detail = item.id ? await getImageAssessment(item.id) : item;
      const data = detail || item;
      setImageUri(toDataUrl(data.mime_type, data.image_base64));
      setImageName(data.image_name);
      setImageMime(data.mime_type);
      setAnalysis((data.analysis_payload as ImageAnalysisResponse) || null);
      setSelectedLibraryId(`db-${data.id}`);
      setPersistentImageId(data.id);
      if (data.student_level) setStudentLevel(data.student_level as ImageStudentLevel);
      if (data.language) setLanguage(data.language);
      setInlineError('');
      setActiveTab(data.analysis_payload ? 'analyze' : 'upload');
    } catch {
      setInlineError('Failed to load saved image.');
    }
  };

  const openHistoryEntry = async (entry: HistoryEntry) => {
    if (entry.source === 'Img-Summary') return;
    setLoadingEntryId(entry.id);
    try {
      const detail = await getUserAssessmentById(entry.assessmentId);
      if (!detail) {
        Alert.alert('Error', 'Failed to load assessment details.');
        return;
      }

      if (entry.source === 'Img-Worksheet') {
        navigation.navigate('WorksheetScreen', {
          worksheetData: { questions: detail.questions },
          title: entry.title,
        });
        return;
      }

      const questions = (detail.questions || [])
        .map((item: any, idx: number) => {
          if (item?.quiz?.question) {
            const qText = String(item.quiz.question);
            if (qText.startsWith('__WS_DATA__')) return null;
            return {
              id: `q-${idx}`,
              question: item.quiz.question,
              options: item.quiz.options || [],
              correctAnswer: item.quiz.answer || 'A',
              answer: item.quiz.answer || 'A',
              explanation: item.quiz.explanation || null,
            };
          }
          return {
            id: item.id || `q-${idx}`,
            question: item.question || '',
            options: item.options || [],
            correctAnswer: item.correctAnswer || item.answer || 'A',
            answer: item.answer || item.correctAnswer || 'A',
            explanation: item.explanation || null,
          };
        })
        .filter(Boolean);

      navigation.navigate('QuizTakingScreen', {
        quiz: {
          id: detail.id,
          title: detail.title,
          class: detail.class_name,
          subject: detail.subject,
          difficulty: detail.level,
          lesson: detail.lesson,
          questions,
          duration: 30,
          has_time_limit: false,
        },
        source: 'history',
        assessmentId: detail.id,
      });
    } catch {
      Alert.alert('Error', 'Failed to load assessment details.');
    } finally {
      setLoadingEntryId(null);
    }
  };

  // ── Renderers ───────────────────────────────────────────────────────────────

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {([
        { key: 'upload', label: 'Upload', icon: 'cloud-upload-outline' },
        { key: 'analyze', label: 'Analyze', icon: 'sparkles-outline' },
        { key: 'history', label: 'History', icon: 'time-outline' },
      ] as const).map((t) => {
        const active = activeTab === t.key;
        return (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, active && styles.tabBtnActive]}
            onPress={() => setActiveTab(t.key)}
            activeOpacity={0.8}
          >
            <Ionicons name={t.icon as any} size={16} color={active ? colors.primary : colors.textSecondary} />
            <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderSelector = <T extends string>(
    label: string,
    value: T,
    options: Array<{ value: T; label: string }>,
    onChange: (v: T) => void,
  ) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.chipWrap}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange(opt.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderUploadTab = () => (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.tabContentInner}
      showsVerticalScrollIndicator={false}
    >
      {imageUri ? (
        <View style={styles.previewCard}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
          <View style={styles.previewMeta}>
            <Text style={styles.previewName} numberOfLines={1}>{imageName}</Text>
            <Text style={styles.previewSub}>
              {analysis ? 'Analyzed' : 'Ready to analyze'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => applyPickedImage('', '', '')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.dropZone} onPress={pickFromGallery} activeOpacity={0.85}>
          <Ionicons name="image-outline" size={44} color={colors.primary} />
          <Text style={styles.dropZoneTitle}>Upload an image</Text>
          <Text style={styles.dropZoneSub}>JPG, PNG, WEBP supported</Text>
        </TouchableOpacity>
      )}

      <View style={styles.pickerRow}>
        <TouchableOpacity style={[styles.pickBtn, styles.pickBtnPrimary]} onPress={pickFromGallery} activeOpacity={0.85}>
          <Ionicons name="images-outline" size={18} color={colors.buttonText} />
          <Text style={[styles.pickBtnText, { color: colors.buttonText }]}>Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pickBtn} onPress={pickFromCamera} activeOpacity={0.85}>
          <Ionicons name="camera-outline" size={18} color={colors.text} />
          <Text style={[styles.pickBtnText, { color: colors.text }]}>Camera</Text>
        </TouchableOpacity>
      </View>

      {renderSelector('Difficulty', studentLevel, IMAGE_LEVELS, setStudentLevel)}
      {renderSelector('Language', language, IMAGE_LANGUAGES, setLanguage)}

      {inlineError ? <Text style={styles.errorText}>{inlineError}</Text> : null}

      <TouchableOpacity
        style={[styles.primaryBtn, (!imageUri || analyzing) && styles.btnDisabled]}
        disabled={!imageUri || analyzing}
        onPress={handleAnalyze}
        activeOpacity={0.85}
      >
        {analyzing ? (
          <LoadingSpinner size={20} />
        ) : (
          <View style={styles.btnRow}>
            <Ionicons name="scan-outline" size={18} color={colors.buttonText} />
            <Text style={styles.primaryBtnText}>Analyze Image</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Library */}
      <View style={styles.librarySection}>
        <Text style={styles.sectionHeading}>YOUR IMAGE LIBRARY</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by image name…"
            placeholderTextColor={colors.placeholder}
            value={librarySearch}
            onChangeText={setLibrarySearch}
            onSubmitEditing={() => loadLibrary(librarySearch)}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={() => loadLibrary(librarySearch)} activeOpacity={0.85}>
            <Ionicons name="search" size={18} color={colors.buttonText} />
          </TouchableOpacity>
        </View>

        {libraryLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        ) : library.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="images-outline" size={28} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No saved images yet. Analyze an image to build your library.</Text>
          </View>
        ) : (
          library.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.libraryItem, selectedLibraryId === `db-${item.id}` && styles.libraryItemActive]}
              onPress={() => selectLibraryItem(item)}
              activeOpacity={0.85}
            >
              <Image source={{ uri: toDataUrl(item.mime_type, item.image_base64) }} style={styles.libraryThumb} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.libraryName} numberOfLines={1}>{item.image_name}</Text>
                <Text style={styles.librarySub}>
                  {item.analysis_payload ? 'Analyzed' : 'Uploaded'}
                </Text>
                <Text style={styles.libraryDate}>{formatDate(item.created_at)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderInfoCard = (title: string, icon: string, children: React.ReactNode) => (
    <View style={styles.infoCard} key={title}>
      <View style={styles.infoCardHeader}>
        <Text style={styles.infoCardIcon}>{icon}</Text>
        <Text style={styles.infoCardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );

  const renderAnalyzeTab = () => {
    if (analyzing) {
      return (
        <View style={styles.centerFill}>
          <LoadingSpinner size={40} />
          <Text style={styles.centerText}>Analyzing image…</Text>
        </View>
      );
    }
    if (!analysis) {
      return (
        <View style={styles.centerFill}>
          <Ionicons name="sparkles-outline" size={44} color={colors.textSecondary} />
          <Text style={styles.centerTitle}>No analysis yet</Text>
          <Text style={styles.centerText}>Upload an image and tap Analyze Image to see results here.</Text>
        </View>
      );
    }

    const tags = analysis.tags || {};
    const keywords = (analysis.keywords || tags.Keywords || tags.keywords || []) as string[];

    return (
      <View style={styles.analyzeWrap}>
        <ScrollView
          style={styles.tabContent}
          contentContainerStyle={styles.tabContentInner}
          showsVerticalScrollIndicator={false}
        >
          {imageUri ? (
            <View style={styles.analyzeHero}>
              <Image source={{ uri: imageUri }} style={styles.analyzeHeroImg} resizeMode="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.analyzeHeroTitle}>Image Analysis</Text>
                {!!ctx.subject && <Text style={styles.analyzeHeroMeta}>Subject: {ctx.subject}</Text>}
                {!!analysis.topic && <Text style={styles.analyzeHeroMeta} numberOfLines={1}>Topic: {analysis.topic}</Text>}
              </View>
            </View>
          ) : null}

          {!!analysis.summary && renderInfoCard('Analysis Summary', '📝', (
            <MathRenderer text={analysis.summary} colors={colors} />
          ))}

          {(analysis.subject || analysis.topic || Object.keys(tags).length > 0) && renderInfoCard('Tags', '🏷️', (
            <View style={styles.tagGrid}>
              {[
                ['Subject', String(analysis.subject || tags.Subject || tags.subject || '-')],
                ['Topic', String(analysis.topic || tags.Topic || tags.topic || '-')],
                ['SubTopic', String(tags.SubTopic || tags.subtopic || '-')],
                ['Type', String(tags.Type || tags.type || '-')],
                ['Difficulty', String(tags.Difficulty || tags.difficulty || '-')],
                ['Language', String(tags.Language || tags.language || language)],
              ].map(([k, v]) => (
                <View key={k} style={styles.tagItem}>
                  <Text style={styles.tagKey}>{k}</Text>
                  <Text style={styles.tagVal}>{v}</Text>
                </View>
              ))}
            </View>
          ))}

          {keywords.length > 0 && renderInfoCard('Keywords', '🔑', (
            <View style={styles.keywordWrap}>
              {keywords.map((kw, i) => (
                <View key={`${kw}-${i}`} style={styles.keywordChip}>
                  <Text style={styles.keywordText}>{String(kw)}</Text>
                </View>
              ))}
            </View>
          ))}

          {Array.isArray(analysis.elements) && analysis.elements.length > 0 && renderInfoCard('Detected Elements', '🔍', (
            <View style={{ gap: 10 }}>
              {analysis.elements.map((el, i) => (
                <View key={`${el.label}-${i}`} style={styles.subCard}>
                  <Text style={styles.subCardTitle}>{i + 1}. {el.label}</Text>
                  <MathRenderer text={el.description} colors={colors} />
                  {!!el.role && <Text style={styles.subCardMeta}>Role: {el.role}</Text>}
                </View>
              ))}
            </View>
          ))}

          {Array.isArray(analysis.summary_points) && analysis.summary_points.length > 0 && renderInfoCard('Key Points', '📌', (
            <View style={{ gap: 6 }}>
              {analysis.summary_points.map((p, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <View style={{ flex: 1 }}><MathRenderer text={p} colors={colors} /></View>
                </View>
              ))}
            </View>
          ))}

          {Array.isArray(analysis.concepts) && analysis.concepts.length > 0 && renderInfoCard('Concepts', '🧠', (
            <View style={{ gap: 10 }}>
              {analysis.concepts.map((c, i) => (
                <View key={`${c.name}-${i}`} style={styles.subCard}>
                  <Text style={styles.subCardTitle}>{c.name}</Text>
                  <MathRenderer text={c.explanation} colors={colors} />
                  {!!c.importance && <Text style={styles.subCardMeta}>Importance: {c.importance}</Text>}
                </View>
              ))}
            </View>
          ))}

          {Array.isArray(analysis.process) && analysis.process.length > 0 && renderInfoCard('Process', '🔄', (
            <View style={{ gap: 8 }}>
              {analysis.process.map((p, i) => (
                <View key={i} style={styles.subCard}>
                  <Text style={styles.subCardTitle}>{i + 1}. {p.step}</Text>
                  <MathRenderer text={p.explanation} colors={colors} />
                </View>
              ))}
            </View>
          ))}

          {Array.isArray(analysis.relationships) && analysis.relationships.length > 0 && renderInfoCard('Relationships', '🔗', (
            <View style={{ gap: 6 }}>
              {analysis.relationships.map((r, i) => (
                <Text key={i} style={styles.relText}>
                  <Text style={styles.relBold}>{r.from}</Text> → <Text style={styles.relBold}>{r.to}</Text>: {r.relation}
                </Text>
              ))}
            </View>
          ))}

          {analysis.mathematics?.detected && renderInfoCard('Mathematics', '➗', (
            <View style={{ gap: 8 }}>
              {(analysis.mathematics.expressions || []).map((ex, i) => (
                <View key={i} style={styles.subCard}>
                  <MathRenderer text={ex.latex} colors={colors} />
                  <MathRenderer text={ex.meaning} colors={colors} />
                </View>
              ))}
            </View>
          ))}

          {Array.isArray(analysis.applications) && analysis.applications.length > 0 && renderInfoCard('Applications', '🚀', (
            <View style={{ gap: 8 }}>
              {analysis.applications.map((a, i) => (
                <View key={i} style={styles.subCard}>
                  <Text style={styles.subCardTitle}>{a.use_case}</Text>
                  <MathRenderer text={a.explanation} colors={colors} />
                </View>
              ))}
            </View>
          ))}

          {/* AI Settings */}
          {renderInfoCard('AI Settings', '🤖', (
            <View style={{ gap: 12 }}>
              <View>
                <Text style={styles.fieldLabel}>Number of Questions</Text>
                <View style={styles.chipWrap}>
                  {COUNT_OPTIONS.map((count) => (
                    <TouchableOpacity
                      key={count}
                      style={[styles.countChip, questionCount === count && styles.chipActive]}
                      onPress={() => setQuestionCount(count)}
                    >
                      <Text style={[styles.chipText, questionCount === count && styles.chipTextActive]}>{count}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View>
                <Text style={styles.fieldLabel}>Additional Instructions</Text>
                <TextInput
                  style={[styles.searchInput, styles.textArea]}
                  placeholder="Guide the generated questions with extra context"
                  placeholderTextColor={colors.placeholder}
                  value={additionalInstructions}
                  onChangeText={setAdditionalInstructions}
                  multiline
                  textAlignVertical="top"
                />
              </View>
              <View style={styles.mappedBox}>
                <Text style={styles.mappedRow}><Text style={styles.mappedKey}>Mapped Subject: </Text>{ctx.subject}</Text>
                <Text style={styles.mappedRow}><Text style={styles.mappedKey}>Mapped Lesson: </Text>{ctx.lesson}</Text>
                <Text style={styles.mappedRow}><Text style={styles.mappedKey}>Difficulty: </Text>{ctx.difficulty}</Text>
              </View>
            </View>
          ))}

          {inlineError ? <Text style={styles.errorText}>{inlineError}</Text> : null}
        </ScrollView>

        {/* Sticky action footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(12, insets.bottom + 8) }]}>
          <TouchableOpacity
            style={[styles.primaryBtn, quizLoading && styles.btnDisabled]}
            disabled={quizLoading}
            onPress={handleGenerateQuiz}
            activeOpacity={0.85}
          >
            {quizLoading ? (
              <LoadingSpinner size={20} />
            ) : (
              <View style={styles.btnRow}>
                <Ionicons name="sparkles" size={18} color={colors.buttonText} />
                <Text style={styles.primaryBtnText}>Generate Assessment</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, quizLoading && styles.btnDisabled]}
            disabled={quizLoading}
            onPress={() => {
              setWorksheetError('');
              setWorksheetModalOpen(true);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>📄 Generate Worksheet</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHistorySection = (
    title: string,
    icon: string,
    entries: HistoryEntry[],
    key: 'quiz' | 'worksheet' | 'summary',
    emptyText: string,
  ) => {
    const open = historyOpen[key];
    return (
      <View style={styles.historyGroup} key={key}>
        <TouchableOpacity
          style={styles.historyGroupHeader}
          onPress={() => setHistoryOpen((p) => ({ ...p, [key]: !p[key] }))}
          activeOpacity={0.8}
        >
          <View style={styles.btnRow}>
            <Text style={styles.infoCardIcon}>{icon}</Text>
            <Text style={styles.historyGroupTitle}>{title}</Text>
            <View style={styles.countBadge}><Text style={styles.countBadgeText}>{entries.length}</Text></View>
          </View>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
        </TouchableOpacity>
        {open && (
          <View style={{ padding: 10, gap: 8 }}>
            {entries.length === 0 ? (
              <Text style={styles.emptyText}>{emptyText}</Text>
            ) : (
              entries.map((entry) => {
                const isLoading = loadingEntryId === entry.id;
                const isSummary = entry.source === 'Img-Summary';
                return (
                  <TouchableOpacity
                    key={entry.id}
                    style={styles.historyCard}
                    disabled={isLoading || isSummary}
                    onPress={() => openHistoryEntry(entry)}
                    activeOpacity={0.85}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.historyTitle} numberOfLines={1}>{entry.title}</Text>
                      {!!entry.lesson && <Text style={styles.historyLesson} numberOfLines={1}>{entry.lesson}</Text>}
                      <Text style={styles.libraryDate}>{formatDate(entry.createdAt)}</Text>
                    </View>
                    <View style={styles.historyBadge}>
                      <Text style={styles.historyBadgeText}>
                        {isLoading ? '…' : isSummary ? 'Summary' : `${entry.questionCount} Q`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </View>
    );
  };

  const renderHistoryTab = () => {
    const total = historyQuiz.length + historyWorksheet.length + historySummary.length;
    return (
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={styles.tabContentInner}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={historyLoading} onRefresh={loadHistory} tintColor={colors.primary} />}
      >
        {historyLoading && total === 0 ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : total === 0 ? (
          <View style={styles.centerFill}>
            <Ionicons name="time-outline" size={40} color={colors.textSecondary} />
            <Text style={styles.centerTitle}>No image history yet</Text>
            <Text style={styles.centerText}>Generated image assessments will appear here.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {renderHistorySection('Quiz Assessment', '📝', historyQuiz, 'quiz', 'No quiz assessments yet')}
            {renderHistorySection('Worksheet', '📄', historyWorksheet, 'worksheet', 'No worksheets yet')}
            {renderHistorySection('Summary', '📋', historySummary, 'summary', 'No summaries yet')}
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Image Assessment</Text>
        <Text style={styles.headerSub}>Analyze images & generate quizzes / worksheets</Text>
      </View>
      {renderTabBar()}
      {activeTab === 'upload' && renderUploadTab()}
      {activeTab === 'analyze' && renderAnalyzeTab()}
      {activeTab === 'history' && renderHistoryTab()}

      <GenerateWorksheetModal
        visible={worksheetModalOpen}
        onClose={() => {
          setWorksheetModalOpen(false);
          setWorksheetError('');
        }}
        onGenerate={handleGenerateWorksheet}
        loading={worksheetLoading}
        presetClass={ctx.className}
        presetSubject={ctx.subject}
        presetLesson={ctx.lesson}
        error={worksheetError}
      />
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerBar: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 10,
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    tabBar: {
      flexDirection: 'row',
      marginHorizontal: 12,
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: 9,
    },
    tabBtnActive: { backgroundColor: colors.primary + '18' },
    tabBtnText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    tabBtnTextActive: { color: colors.primary },
    tabContent: { flex: 1 },
    tabContentInner: { padding: 16, paddingBottom: 40 },

    // Upload
    dropZone: {
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.border,
      borderRadius: 14,
      paddingVertical: 32,
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
    },
    dropZoneTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 8 },
    dropZoneSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    previewCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 10,
      borderRadius: 14,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    previewImage: { width: 64, height: 64, borderRadius: 10, backgroundColor: colors.inputBackground },
    previewMeta: { flex: 1, minWidth: 0 },
    previewName: { fontSize: 14, fontWeight: '600', color: colors.text },
    previewSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    pickerRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    pickBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBackground,
    },
    pickBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
    pickBtnText: { fontSize: 13, fontWeight: '600' },

    field: { marginTop: 16 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBackground,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
    chipTextActive: { color: colors.buttonText },
    countChip: {
      minWidth: 52,
      alignItems: 'center',
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBackground,
    },

    primaryBtn: {
      marginTop: 18,
      backgroundColor: colors.primary,
      borderRadius: 12,
      minHeight: 50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtnText: { color: colors.buttonText, fontSize: 15, fontWeight: '700' },
    btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    secondaryBtn: {
      marginTop: 10,
      borderRadius: 12,
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.cardBackground,
    },
    secondaryBtnText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
    btnDisabled: { opacity: 0.5 },
    errorText: { color: colors.error || '#DC2626', fontSize: 13, marginTop: 12, lineHeight: 18 },

    // Library
    librarySection: { marginTop: 26 },
    sectionHeading: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.6, marginBottom: 10 },
    searchRow: { flexDirection: 'row', gap: 8 },
    searchInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 14,
      backgroundColor: colors.cardBackground,
    },
    textArea: { minHeight: 80, flex: undefined },
    searchBtn: {
      width: 46,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyBox: { alignItems: 'center', padding: 24, gap: 8 },
    emptyText: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
    libraryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBackground,
      marginTop: 8,
    },
    libraryItemActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
    libraryThumb: { width: 46, height: 46, borderRadius: 8, backgroundColor: colors.inputBackground },
    libraryName: { fontSize: 13, fontWeight: '600', color: colors.text },
    librarySub: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
    libraryDate: { fontSize: 10, color: colors.textSecondary, marginTop: 1 },

    // Analyze
    analyzeWrap: { flex: 1 },
    analyzeHero: {
      flexDirection: 'row',
      gap: 12,
      padding: 12,
      borderRadius: 14,
      backgroundColor: colors.cardBackground,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      marginBottom: 14,
      alignItems: 'center',
    },
    analyzeHeroImg: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.inputBackground },
    analyzeHeroTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    analyzeHeroMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
    infoCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 14,
    },
    infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    infoCardIcon: { fontSize: 16 },
    infoCardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tagItem: {
      width: '47%',
      padding: 10,
      borderRadius: 10,
      backgroundColor: colors.inputBackground,
    },
    tagKey: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
    tagVal: { fontSize: 13, color: colors.text, marginTop: 2 },
    keywordWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    keywordChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.primary + '14',
    },
    keywordText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
    subCard: {
      padding: 12,
      borderRadius: 10,
      backgroundColor: colors.inputBackground,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    subCardTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
    subCardMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 4, fontWeight: '600' },
    bulletRow: { flexDirection: 'row', gap: 8 },
    bulletDot: { fontSize: 14, color: colors.primary, lineHeight: 20 },
    relText: { fontSize: 13, color: colors.text, lineHeight: 20 },
    relBold: { fontWeight: '700' },
    mappedBox: { padding: 12, borderRadius: 10, backgroundColor: colors.inputBackground, gap: 4 },
    mappedRow: { fontSize: 12, color: colors.text },
    mappedKey: { fontWeight: '700', color: colors.textSecondary },

    footer: {
      paddingHorizontal: 16,
      paddingTop: 10,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },

    // History
    historyGroup: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.cardBackground,
      overflow: 'hidden',
    },
    historyGroupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      backgroundColor: colors.inputBackground,
    },
    historyGroupTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
    countBadge: { backgroundColor: colors.border, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
    countBadgeText: { fontSize: 10, color: colors.textSecondary, fontWeight: '700' },
    historyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    historyTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
    historyLesson: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    historyBadge: { backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
    historyBadgeText: { fontSize: 11, color: colors.buttonText, fontWeight: '700' },

    centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
    centerTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    centerText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  });
