/**
 * AssessmentWorkspaceScreen – unified entry for Document + Handwritten assessment flows.
 *
 * Second slice: replaces shell tab panels with real, API-backed content.
 *   • Generate (preview) tab – source selector + AI settings + action buttons
 *   • Quizzes tab        – recent quizzes list with search, open, delete
 *   • Worksheets tab     – inline worksheet generation form + recent worksheet list
 *   • History tab        – combined quizzes + worksheets sorted by date
 */
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';
import {
  useAssessmentWorkspaceStore,
  type WorkspaceMode,
} from '@core/store/assessmentWorkspace.store';
import AssessmentCard, { type AssessmentCardItem } from '../components/AssessmentCard';
import {
  listUserAssessments,
  deleteUserAssessment,
  getUserAssessmentById,
  generateWorksheet,
  saveUserAssessment,
  type AssessmentListItem,
} from '../core/services/sharedApi';
import { sanitizeQuizQuestions } from '@core/utils/quizQuestionUtils';
import { loadDocumentAssessmentHistory } from '@core/services/documentAssessmentHistory.service';
import { useQuizNavAccessRedirect } from '@core/hooks/useQuizNavAccessRedirect';

interface Props {
  navigation: any;
  route?: {
    params?: {
      mode?: WorkspaceMode;
      centerTab?: 'preview' | 'quiz' | 'worksheet' | 'history';
    };
  };
}

const COUNT_OPTIONS = [5, 10, 15, 20] as const;
const WS_LEVELS = ['easy', 'medium', 'hard', 'advanced'] as const;

const DOCUMENT_SOURCE_OPTIONS = [
  { key: 'file', icon: 'document-attach-outline', label: 'Upload File' },
  { key: 'gallery', icon: 'images-outline', label: 'Gallery' },
  { key: 'library', icon: 'library-outline', label: 'From Books' },
  { key: 'camera', icon: 'camera-outline', label: 'Camera' },
] as const;

const HANDWRITTEN_FLOW_STEPS = [
  'Capture or pick handwritten page photos (max 5)',
  'OCR extracts text from your images',
  'Set class, subject, and quiz options, then generate',
] as const;

const DOCUMENT_FLOW_STEPS = [
  'Upload 1 PDF/DOC, pick up to 5 images from gallery/camera, or use the library',
  'Preview pages and select up to 5 to include',
  'Set quiz options and generate assessment or worksheet',
] as const;

// ── helpers ────────────────────────────────────────────────────────────────

function decodeQuizQuestions(raw: any[]): any[] {
  return sanitizeQuizQuestions(raw);
}

// ── screen ─────────────────────────────────────────────────────────────────

export default function AssessmentWorkspaceScreen({ navigation, route }: Props) {
  const {
    mode,
    centerTab,
    aiSettings,
    setMode,
    setCenterTab,
    updateAiSettings,
  } = useAssessmentWorkspaceStore();

  const workspaceMode = route?.params?.mode ?? mode ?? 'document';
  useQuizNavAccessRedirect('AssessmentWorkspaceScreen', navigation, {
    workspaceMode,
  });
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  // ── route param → mode / tab sync ───────────────────────────────────────
  React.useEffect(() => {
    const routeMode = route?.params?.mode;
    if (routeMode && routeMode !== mode) setMode(routeMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.mode]);

  React.useEffect(() => {
    const routeTab = route?.params?.centerTab;
    if (routeTab && routeTab !== centerTab) setCenterTab(routeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.centerTab]);

  // ── list data ────────────────────────────────────────────────────────────
  const [quizList, setQuizList] = useState<AssessmentListItem[]>([]);
  const [worksheetList, setWorksheetList] = useState<AssessmentListItem[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [listSearch, setListSearch] = useState('');

  // ── worksheet form state ─────────────────────────────────────────────────
  const [wsClass, setWsClass] = useState('');
  const [wsSubject, setWsSubject] = useState('');
  const [wsLesson, setWsLesson] = useState('');
  const [wsLevel, setWsLevel] = useState<string>('medium');
  const [wsCount, setWsCount] = useState<number>(10);
  const [wsGenerating, setWsGenerating] = useState(false);

  // ── fetch data when active tab or mode changes ───────────────────────────
  const fetchTabData = useCallback(async (tab: typeof centerTab) => {
    if (tab === 'preview') return;
    setTabLoading(true);
    try {
      const sortByDate = (a: AssessmentListItem, b: AssessmentListItem) =>
        (b.created_at || '').localeCompare(a.created_at || '');

      if (mode === 'document') {
        const history = await loadDocumentAssessmentHistory();
        setQuizList(history.quizzes.sort(sortByDate));
        setWorksheetList(history.worksheets.sort(sortByDate));
        return;
      }

      // Handwritten mode: only handwritten-tagged assessments (matches
      // GET .../user-assessments?assessment_type=web-quiz&source=Handwritten).
      const [handwrittenQuizzes, handwrittenWorksheets] = await Promise.all([
        listUserAssessments('web-quiz', 'Handwritten'),
        listUserAssessments('worksheet', 'Handwritten'),
      ]);
      setQuizList((Array.isArray(handwrittenQuizzes) ? handwrittenQuizzes : []).sort(sortByDate));
      setWorksheetList(
        (Array.isArray(handwrittenWorksheets) ? handwrittenWorksheets : []).sort(sortByDate),
      );
    } catch (e) {
      console.error('fetchTabData:', e);
    } finally {
      setTabLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    fetchTabData(centerTab);
  }, [centerTab, mode, fetchTabData]);

  // Pre-fill worksheet form from AI settings when switching to worksheet tab
  useEffect(() => {
    if (centerTab === 'worksheet') {
      if (aiSettings.classValue) setWsClass(aiSettings.classValue);
      if (aiSettings.subject) setWsSubject(aiSettings.subject);
      if (aiSettings.lesson) setWsLesson(aiSettings.lesson);
      if (aiSettings.difficulty) setWsLevel(aiSettings.difficulty);
    }
    // Clear search when switching tabs
    setListSearch('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerTab]);

  // ── navigation helpers ───────────────────────────────────────────────────
  const openCurrentFlow = useCallback(() => {
    if (mode === 'document') {
      navigation.navigate('CreateDocumentQuizScreen', {
        fromWorkspace: true,
        workspacePreset: aiSettings,
      });
      return;
    }
    navigation.navigate('CreateHandwrittenQuizScreen', {
      fromWorkspace: true,
      workspacePreset: aiSettings,
    });
  }, [mode, aiSettings, navigation]);

  const handleOpenQuiz = useCallback(async (item: AssessmentCardItem) => {
    try {
      const detail = await getUserAssessmentById(item.id);
      if (!detail) { Alert.alert('Error', 'Could not load quiz.'); return; }
      const questions = decodeQuizQuestions(detail.questions || []);
      if (questions.length === 0) { Alert.alert('Empty', 'This quiz has no questions.'); return; }

      const launch = (initialResponses?: Record<string, string>) => {
        const quizPayload = {
          id: detail.id,
          title: detail.title,
          class: detail.class_name,
          subject: detail.subject,
          difficulty: detail.level,
          lesson: detail.lesson,
          questions,
          duration: 30,
          has_time_limit: false,
        };

        if (mode === 'document') {
          navigation.navigate('DocumentUploadQuizScreen', {
            quizData: quizPayload,
            source: 'history',
            workspaceMode: 'document',
            assessmentId: detail.id,
            initialResponses,
            showActionButtons: true,
            showShareButton: true,
          });
          return;
        }

        navigation.navigate('QuizTakingScreen', {
          quiz: quizPayload,
          assessmentId: detail.id,
          initialResponses,
          showActionButtons: true,
          showShareButton: true,
          source: 'history',
          workspaceMode: 'handwritten',
        });
      };

      const savedResponses = (detail as any).responses as Record<string, string> | undefined;
      if (savedResponses && Object.keys(savedResponses).length > 0) {
        Alert.alert(
          'Resume Assessment',
          'You have answers saved from a previous attempt. Would you like to restore them?',
          [
            { text: 'Start Fresh', style: 'cancel', onPress: () => launch(undefined) },
            { text: 'Restore', onPress: () => launch(savedResponses) },
          ],
        );
      } else {
        launch(undefined);
      }
    } catch {
      Alert.alert('Error', 'Failed to open quiz.');
    }
  }, [navigation]);

  const handleOpenWorksheet = useCallback(async (item: AssessmentCardItem) => {
    try {
      const detail = await getUserAssessmentById(item.id);
      if (!detail) { Alert.alert('Error', 'Could not load worksheet.'); return; }
      navigation.navigate('WorksheetScreen', {
        worksheetData: detail,
        title: item.title,
      });
    } catch {
      Alert.alert('Error', 'Failed to open worksheet.');
    }
  }, [navigation]);

  const handleDeleteItem = useCallback((item: AssessmentCardItem) => {
    Alert.alert('Delete', `Delete "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteUserAssessment(item.id);
          setQuizList((prev) => prev.filter((q) => q.id !== item.id));
          setWorksheetList((prev) => prev.filter((w) => w.id !== item.id));
        },
      },
    ]);
  }, []);

  // ── worksheet generation ─────────────────────────────────────────────────
  const handleGenerateWorksheet = useCallback(async () => {
    if (!wsClass.trim() || !wsSubject.trim() || !wsLesson.trim()) {
      Alert.alert('Missing Fields', 'Please fill in Class, Subject, and Lesson.');
      return;
    }
    setWsGenerating(true);
    try {
      const result = await generateWorksheet({
        class: wsClass.trim(),
        subject: wsSubject.trim(),
        lesson: wsLesson.trim(),
        level: wsLevel,
        count: wsCount,
        mcq_count: Math.ceil(wsCount * 0.4),
        fitb_count: Math.ceil(wsCount * 0.2),
        tf_count: Math.floor(wsCount * 0.1),
        short_q_count: Math.floor(wsCount * 0.2),
        matching_count: Math.floor(wsCount * 0.1),
        type: 'worksheet',
      });

      // Persist to history
      const wsData = result?.WorksheetData;
      if (wsData) {
        await saveUserAssessment({
          title: `${wsSubject.trim()} – ${wsLesson.trim()}`,
          subject: wsSubject.trim(),
          class_name: wsClass.trim(),
          level: wsLevel,
          lesson: wsLesson.trim(),
          assessment_type: 'worksheet',
          source: 'Worksheet',
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

      // Navigate to WorksheetScreen in view mode
      navigation.navigate('WorksheetScreen', {
        worksheetData: result,
        title: `${wsSubject.trim()} – ${wsLesson.trim()}`,
      });
    } catch (err: any) {
      Alert.alert('Generation Failed', err?.message || 'Please try again.');
    } finally {
      setWsGenerating(false);
    }
  }, [wsClass, wsSubject, wsLesson, wsLevel, wsCount, navigation]);

  // ── search filter ────────────────────────────────────────────────────────
  const filterBySearch = useCallback((list: AssessmentListItem[]) => {
    if (!listSearch.trim()) return list;
    const q = listSearch.trim().toLowerCase();
    return list.filter(
      (i) =>
        i.title?.toLowerCase().includes(q) ||
        i.subject?.toLowerCase().includes(q) ||
        i.lesson?.toLowerCase().includes(q),
    );
  }, [listSearch]);

  // ── meta text ────────────────────────────────────────────────────────────
  const modeTitle = mode === 'document' ? 'Document Assessment' : 'Handwritten Assessment';
  const modeSub =
    mode === 'document'
      ? 'Start by uploading a document — quiz settings come after you pick pages.'
      : 'Start handwritten flow — OCR and quiz settings come on the next screen.';

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(32, insets.bottom + 16) }]}
      >
        {/* ─── Header: mode switch ────────────────────────────────────── */}
        <View style={styles.headerCard}>
          <Text style={styles.title}>Assessment Workspace</Text>
          <Text style={styles.subTitle}>Unified entry for Document + Handwritten modules</Text>

          <View style={styles.modeSwitchRow}>
            {(['document', 'handwritten'] as WorkspaceMode[]).map((m) => {
              const isActive = mode === m;
              const icon = m === 'document' ? 'document-text-outline' : 'create-outline';
              return (
                <TouchableOpacity
                  key={m}
                  style={[styles.modeButton, isActive && styles.modeButtonActive]}
                  onPress={() => setMode(m)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={icon as any} size={16} color={isActive ? '#fff' : theme.colors.primary} />
                  <Text style={[styles.modeButtonText, isActive && styles.modeButtonTextActive]}>
                    {m === 'document' ? 'Document' : 'Handwritten'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.modeTitle}>{modeTitle}</Text>
          <Text style={styles.modeSub}>{modeSub}</Text>
        </View>

        {/* ─── Tab badges (single row, horizontal scroll) ─────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsRow}
        >
          {(
            [
              { key: 'preview', icon: 'sparkles-outline', label: 'Generate' },
              { key: 'quiz', icon: 'clipboard-outline', label: 'Quizzes' },
              { key: 'worksheet', icon: 'document-text-outline', label: 'Worksheets' },
              { key: 'history', icon: 'time-outline', label: 'History' },
            ] as const
          ).map(({ key: tab, icon, label }) => {
            const active = centerTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBadge, active && styles.tabBadgeActive]}
                onPress={() => setCenterTab(tab)}
                activeOpacity={0.85}
              >
                <View style={[styles.tabBadgeIconWrap, active && styles.tabBadgeIconWrapActive]}>
                  <Ionicons
                    name={icon as any}
                    size={12}
                    color={active ? '#fff' : theme.colors.primary}
                  />
                </View>
                <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ─── Tab panels ─────────────────────────────────────────────── */}
        {centerTab === 'preview' && renderPreviewTab()}
        {centerTab === 'quiz' && renderQuizTab()}
        {centerTab === 'worksheet' && renderWorksheetTab()}
        {centerTab === 'history' && renderHistoryTab()}
      </ScrollView>
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // SETUP (PREVIEW) TAB
  // ─────────────────────────────────────────────────────────────────────────
  function handleDocumentSourcePress(key: typeof DOCUMENT_SOURCE_OPTIONS[number]['key']) {
    if (key === 'library') {
      navigation.navigate('DocumentLibraryScreen');
      return;
    }
    navigation.navigate('DocumentUploadHomeScreen', {
      autoAction: key === 'file' ? 'upload' : key === 'gallery' ? 'gallery' : 'camera',
    });
  }

  function renderDocumentPreviewTab() {
    return (
      <>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Step 1 · Choose Document</Text>
          <Text style={styles.cardSubtitle}>Pick how you want to add your document</Text>
          <View style={styles.sourceRow}>
            {DOCUMENT_SOURCE_OPTIONS.map((src) => (
              <TouchableOpacity
                key={src.key}
                style={styles.sourceCard}
                onPress={() => handleDocumentSourcePress(src.key)}
                activeOpacity={0.75}
              >
                <View style={[styles.sourceIconBg, { backgroundColor: theme.colors.primary + '18' }]}>
                  <Ionicons name={src.icon as any} size={22} color={theme.colors.primary} />
                </View>
                <Text style={styles.sourceLabel}>{src.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>How it works</Text>
          {DOCUMENT_FLOW_STEPS.map((step, index) => (
            <View key={step} style={styles.flowStepRow}>
              <View style={styles.flowStepBadge}>
                <Text style={styles.flowStepBadgeText}>{index + 1}</Text>
              </View>
              <Text style={styles.flowStepText}>{step}</Text>
            </View>
          ))}
          <Text style={styles.flowNote}>
            Class, subject, difficulty, and question count are configured on the page preview screen — after your document is uploaded.
          </Text>
        </View>

        <View style={styles.actionsCard}>
          <Text style={styles.cardTitle}>Shortcuts</Text>
          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={() => navigation.navigate('DocumentUploadHistoryScreen')}
            >
              <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.secondaryActionText}>Upload History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={() => navigation.navigate('RecentAssessmentsScreen')}
            >
              <Ionicons name="clipboard-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.secondaryActionText}>Recent Assessments</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  function renderHandwrittenPreviewTab() {
    return (
      <>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Step 1 · Start Handwritten Flow</Text>
          <Text style={styles.cardSubtitle}>
            Capture notes or exam papers — OCR and quiz settings come on the next screen.
          </Text>
          <TouchableOpacity
            style={[styles.primaryAction, { marginTop: 12 }]}
            onPress={openCurrentFlow}
          >
            <Ionicons name="create-outline" size={18} color="#fff" />
            <Text style={styles.primaryActionText}>Start Handwritten Assessment</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>How it works</Text>
          {HANDWRITTEN_FLOW_STEPS.map((step, index) => (
            <View key={step} style={styles.flowStepRow}>
              <View style={styles.flowStepBadge}>
                <Text style={styles.flowStepBadgeText}>{index + 1}</Text>
              </View>
              <Text style={styles.flowStepText}>{step}</Text>
            </View>
          ))}
          <Text style={styles.flowNote}>
            Class, subject, difficulty, and question count are configured after OCR — not on this screen.
          </Text>
        </View>

        <View style={styles.actionsCard}>
          <Text style={styles.cardTitle}>Shortcuts</Text>
          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={() => navigation.navigate('RecentAssessmentsScreen')}
            >
              <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.secondaryActionText}>Recent Assessments</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={() => navigation.navigate('WorksheetScreen')}
            >
              <Ionicons name="document-text-outline" size={16} color="#059669" />
              <Text style={styles.secondaryActionText}>Worksheets</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  function renderPreviewTab() {
    return mode === 'document' ? renderDocumentPreviewTab() : renderHandwrittenPreviewTab();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // QUIZZES TAB
  // ─────────────────────────────────────────────────────────────────────────
  function renderQuizTab() {
    const filtered = filterBySearch(quizList);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Recent Quizzes</Text>
          <TouchableOpacity onPress={() => navigation.navigate('RecentAssessmentsScreen')}>
            <Text style={styles.viewAllText}>View All →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={14} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            value={listSearch}
            onChangeText={setListSearch}
            placeholder="Search quizzes…"
            placeholderTextColor={theme.colors.placeholder}
          />
          {listSearch ? (
            <TouchableOpacity onPress={() => setListSearch('')}>
              <Ionicons name="close-circle" size={14} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {tabLoading ? (
          <View style={styles.centerRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading quizzes…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyPanel}>
            <Ionicons name="clipboard-outline" size={40} color={theme.colors.border} />
            <Text style={styles.emptyTitle}>{listSearch ? 'No results' : 'No quizzes yet'}</Text>
            <Text style={styles.emptyBody}>
              {listSearch
                ? 'Try a different search term.'
                : mode === 'document'
                  ? 'Go to Generate to upload a document and create your first quiz.'
                  : 'Generate a document or AI quiz to see it here.'}
            </Text>
          </View>
        ) : (
          filtered.slice(0, 20).map((item) => (
            <AssessmentCard
              key={item.id}
              item={item as AssessmentCardItem}
              onPress={handleOpenQuiz}
              onDelete={handleDeleteItem}
            />
          ))
        )}

        {filtered.length > 20 && (
          <TouchableOpacity
            style={styles.viewMoreBtn}
            onPress={() => navigation.navigate('RecentAssessmentsScreen')}
          >
            <Text style={[styles.viewAllText, { textAlign: 'center' }]}>
              Show {filtered.length - 20} more →
            </Text>
          </TouchableOpacity>
        )}

        {mode !== 'document' && (
          <TouchableOpacity
            style={[styles.primaryAction, { marginTop: 12 }]}
            onPress={() => setCenterTab('preview')}
          >
            <Ionicons name="add-outline" size={16} color="#fff" />
            <Text style={styles.primaryActionText}>Create New Quiz</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WORKSHEETS TAB
  // ─────────────────────────────────────────────────────────────────────────
  function renderWorksheetTab() {
    const filtered = filterBySearch(worksheetList);

    return (
      <>
        {mode !== 'document' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Generate Worksheet</Text>

            <Text style={styles.label}>Class / Grade</Text>
            <TextInput
              value={wsClass}
              onChangeText={setWsClass}
              placeholder="e.g., Class 10"
              style={styles.input}
              placeholderTextColor={theme.colors.placeholder}
            />

            <Text style={styles.label}>Subject</Text>
            <TextInput
              value={wsSubject}
              onChangeText={setWsSubject}
              placeholder="e.g., Physics"
              style={styles.input}
              placeholderTextColor={theme.colors.placeholder}
            />

            <Text style={styles.label}>Lesson / Topic</Text>
            <TextInput
              value={wsLesson}
              onChangeText={setWsLesson}
              placeholder="e.g., Reflection of Light"
              style={styles.input}
              placeholderTextColor={theme.colors.placeholder}
            />

            <Text style={styles.label}>Difficulty Level</Text>
            <View style={styles.pillsRow}>
              {WS_LEVELS.map((l) => {
                const selected = wsLevel === l;
                return (
                  <TouchableOpacity
                    key={l}
                    style={[styles.pill, selected && styles.pillSelected]}
                    onPress={() => setWsLevel(l)}
                  >
                    <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                      {l.charAt(0).toUpperCase() + l.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Total Questions</Text>
            <View style={styles.pillsRow}>
              {COUNT_OPTIONS.map((c) => {
                const selected = wsCount === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.countPill, selected && styles.pillSelected]}
                    onPress={() => setWsCount(c)}
                  >
                    <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[
                styles.primaryAction,
                { marginTop: 16 },
                wsGenerating && styles.primaryActionDisabled,
              ]}
              onPress={handleGenerateWorksheet}
              disabled={wsGenerating}
            >
              {wsGenerating ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.primaryActionText}>Generating…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={18} color="#fff" />
                  <Text style={styles.primaryActionText}>Generate Worksheet</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Recent worksheets */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Worksheets</Text>
            <TouchableOpacity onPress={() => navigation.navigate('RecentAssessmentsScreen')}>
              <Text style={styles.viewAllText}>View All →</Text>
            </TouchableOpacity>
          </View>

          {tabLoading ? (
            <View style={styles.centerRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading worksheets…</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyPanel}>
              <Ionicons name="document-text-outline" size={40} color={theme.colors.border} />
              <Text style={styles.emptyTitle}>{listSearch ? 'No results' : 'No worksheets yet'}</Text>
              <Text style={styles.emptyBody}>
                {listSearch
                  ? 'Try a different search term.'
                  : mode === 'document'
                    ? 'Go to Generate to upload a document and create your first worksheet.'
                    : 'Generate your first worksheet above.'}
              </Text>
            </View>
          ) : (
            filtered.slice(0, 10).map((item) => (
              <AssessmentCard
                key={item.id}
                item={item as AssessmentCardItem}
                onPress={handleOpenWorksheet}
                onDelete={handleDeleteItem}
                accentColor="#059669"
              />
            ))
          )}
        </View>
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HISTORY TAB
  // ─────────────────────────────────────────────────────────────────────────
  function renderHistoryTab() {
    const combined = [
      ...quizList.map((q) => ({ ...q, _itemType: 'quiz' as const })),
      ...worksheetList.map((w) => ({ ...w, _itemType: 'worksheet' as const })),
    ].sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
    );

    const filtered = filterBySearch(combined);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Activity History</Text>
          <TouchableOpacity onPress={() => navigation.navigate('RecentAssessmentsScreen')}>
            <Text style={styles.viewAllText}>View All →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={14} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            value={listSearch}
            onChangeText={setListSearch}
            placeholder="Search history…"
            placeholderTextColor={theme.colors.placeholder}
          />
          {listSearch ? (
            <TouchableOpacity onPress={() => setListSearch('')}>
              <Ionicons name="close-circle" size={14} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {tabLoading ? (
          <View style={styles.centerRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading history…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyPanel}>
            <Ionicons name="time-outline" size={40} color={theme.colors.border} />
            <Text style={styles.emptyTitle}>{listSearch ? 'No results' : 'No history yet'}</Text>
            <Text style={styles.emptyBody}>
              {listSearch
                ? 'Try a different search term.'
                : 'Your generated quizzes and worksheets will appear here.'}
            </Text>
          </View>
        ) : (
          filtered.slice(0, 30).map((item) => (
            <AssessmentCard
              key={`${(item as any)._itemType}-${item.id}`}
              item={item as AssessmentCardItem}
              onPress={
                (item as any)._itemType === 'worksheet' ? handleOpenWorksheet : handleOpenQuiz
              }
              onDelete={handleDeleteItem}
            />
          ))
        )}

        {filtered.length > 30 && (
          <TouchableOpacity
            style={styles.viewMoreBtn}
            onPress={() => navigation.navigate('RecentAssessmentsScreen')}
          >
            <Text style={[styles.viewAllText, { textAlign: 'center' }]}>
              Show {filtered.length - 30} more →
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
}

// ── styles ──────────────────────────────────────────────────────────────────

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 14,
    gap: 10,
  },
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  subTitle: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
  },
  modeSwitchRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + '50',
    backgroundColor: colors.background,
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  modeTitle: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  modeSub: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  tabsScroll: {
    marginTop: 4,
    flexGrow: 0,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
  },
  tabBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 5,
    paddingLeft: 5,
    paddingRight: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  tabBadgeActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  tabBadgeIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeIconWrapActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.1,
  },
  tabBadgeTextActive: {
    color: '#fff',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: colors.text,
    backgroundColor: colors.background,
    fontSize: 13,
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.background,
  },
  countPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.background,
    minWidth: 44,
    alignItems: 'center',
  },
  pillSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '18',
  },
  pillText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  pillTextSelected: {
    color: colors.primary,
  },
  actionsCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  primaryAction: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.background,
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },

  // ── new tab-panel styles ─────────────────────────────────────────────────
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10,
    marginTop: 2,
  },
  flowStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 10,
  },
  flowStepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  flowStepBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  flowStepText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  flowNote: {
    marginTop: 12,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    fontStyle: 'italic',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  sourceRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  sourceCard: {
    flex: 1,
    minWidth: 90,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: 6,
  },
  sourceIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  primaryActionDisabled: {
    opacity: 0.6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.background,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyPanel: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 6,
  },
  emptyBody: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  viewMoreBtn: {
    paddingVertical: 10,
    marginTop: 4,
  },
});
