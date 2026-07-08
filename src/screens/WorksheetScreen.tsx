/**
 * Worksheet Screen
 * - Create mode: form to configure and generate a worksheet
 * - View mode: display the generated worksheet with print/share support
 */
import React, { useState, useLayoutEffect, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  BackHandler,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ModalDropdownField from '../components/ModalDropdownField';
import * as Print from 'expo-print';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';
import { useDropdowns } from '../context/DropdownContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ShareQuizModal from '../components/ShareQuizModal';
import ShareOptionsModal from '../components/ShareOptionsModal';
import { generateWorksheet, saveUserAssessment } from '../core/services/sharedApi';
import { useUserStore } from '../core/store/user.store';
import {
  buildWorksheetShareQuestions,
  countWorksheetQuestions,
  worksheetShareTopic,
} from '../core/utils/worksheetShareUtils';

/**
 * Same preprocess as MathRenderer / web quiz MathRenderer:
 * fix double-escaped backslashes and convert \( \) / \[ \] delimiters.
 */
function preprocessLatex(text: string): string {
  if (!text) return '';
  let processed = text.replace(/\\\\([a-zA-Z{,;!> ])/g, '\\$1');
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_m, c) => `$${c}$`);
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_m, c) => `$$${c}$$`);
  return processed;
}

/** Escape HTML then leave LaTeX `$...$` intact for KaTeX auto-render. */
function escapeHtml(raw: unknown): string {
  return preprocessLatex(String(raw ?? ''))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type ScreenMode = 'create' | 'view';

const LEVELS = [
  { id: 'beginner', name: 'Beginner' },
  { id: 'elementary', name: 'Elementary' },
  { id: 'intermediate', name: 'Intermediate' },
  { id: 'advanced', name: 'Advanced' },
  { id: 'expert', name: 'Expert' },
];

const COUNT_OPTIONS = ['5', '10', '15', '20'];

const WS_DATA_MARKER = '__WS_DATA__';

/**
 * Normalise worksheet payload from either:
 *  - a fresh generateWorksheet API response ({ WorksheetData: ... })
 *  - a saved user-assessment record (worksheet JSON embedded in questions[0])
 */
function normalizeWorksheetResult(raw: any): any | null {
  if (!raw) return null;

  if (raw.WorksheetData?.Worksheet || raw.WorksheetData?.Metadata) {
    return raw;
  }

  if (raw.Worksheet || raw.Metadata) {
    return { WorksheetData: raw };
  }

  let questions = Array.isArray(raw.questions) ? raw.questions : [];
  if (typeof raw.questions === 'string') {
    try {
      const parsed = JSON.parse(raw.questions);
      if (Array.isArray(parsed)) questions = parsed;
    } catch {
      // ignore
    }
  }

  for (const entry of questions) {
    const quiz = entry?.quiz ?? entry;
    const qText =
      (typeof quiz === 'object' && quiz !== null ? quiz.question : undefined) ??
      entry?.question ??
      '';
    if (typeof qText === 'string' && qText.startsWith(WS_DATA_MARKER)) {
      try {
        const parsed = JSON.parse(qText.slice(WS_DATA_MARKER.length));
        return { WorksheetData: parsed };
      } catch {
        // try next entry
      }
    }
  }

  return null;
}

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

interface WorksheetFormState {
  classId: string;
  subjectId: string;
  lesson: string;
  level: string;
  itext: string;
  count: string;
}

function buildHtml(
  worksheet: any,
  answerKey?: any,
  themeColors?: { text?: string; background?: string; card?: string; border?: string; textSecondary?: string },
): string {
  const textColor = themeColors?.text ?? '#111827';
  const bgColor = themeColors?.background ?? '#ffffff';
  const cardColor = themeColors?.card ?? '#f9fafb';
  const borderColor = themeColors?.border ?? '#e5e7eb';
  const mutedColor = themeColors?.textSecondary ?? '#6b7280';

  const secA: any[] = worksheet?.Section_A_MCQ || [];
  const secB: any[] = worksheet?.Section_B_Fill_in_the_Blank || [];
  const secC: any[] = worksheet?.Section_C_True_False || [];
  const secD: any[] = worksheet?.Section_D_Short_Questions || [];
  const secE = worksheet?.Section_E_Matching || {};
  const mcqAnswers: any[] = answerKey?.Section_A_MCQ || [];
  const shortAnswers: any[] = answerKey?.Section_D_Short_Questions || [];

  const sectionCard = (title: string, body: string, accent = '#0891B2') => `
    <div class="section" style="background:${cardColor};border:1px solid ${borderColor}">
      <div class="section-label" style="color:${accent}">${escapeHtml(title)}</div>
      ${body}
    </div>`;

  const mcqRows = secA
    .map(
      (q: any, i: number) => `
      <div class="q">
        <p class="q-text"><b>${i + 1}.</b> ${escapeHtml(q.question)}</p>
        ${(q.options || [])
          .map(
            (o: string, oi: number) =>
              `<p class="opt">${String.fromCharCode(65 + oi)}. ${escapeHtml(o)}</p>`,
          )
          .join('')}
      </div>`,
    )
    .join('');

  const fitbRows = secB
    .map(
      (q: any, i: number) =>
        `<div class="q"><p class="q-text"><b>${i + 1}.</b> ${escapeHtml(q.question || q)}</p></div>`,
    )
    .join('');

  const tfRows = secC
    .map(
      (q: any, i: number) =>
        `<div class="q"><p class="q-text"><b>${i + 1}.</b> ${escapeHtml(q.statement || q.question || q)} <span class="muted">(True / False)</span></p></div>`,
    )
    .join('');

  const shortRows = secD
    .map(
      (q: any, i: number) =>
        `<div class="q"><p class="q-text"><b>${i + 1}.</b> ${escapeHtml(q.question || q)}</p><div class="answer-line" style="border-bottom-color:${borderColor}"></div></div>`,
    )
    .join('');

  const matchPairs: any[] = secE?.Pairs || [];
  const matchLeft = matchPairs
    .map((p: any, i: number) => `<p class="q-text"><b>${i + 1}.</b> ${escapeHtml(p.left)}</p>`)
    .join('');
  const matchRight = matchPairs
    .map(
      (p: any, i: number) =>
        `<p class="q-text"><b>${String.fromCharCode(65 + i)}.</b> ${escapeHtml(p.right)}</p>`,
    )
    .join('');
  const matchBody = matchPairs.length
    ? `<div class="match-grid"><div class="match-col">${matchLeft}</div><div class="match-col">${matchRight}</div></div>`
    : '';

  const answerBody = [
    ...mcqAnswers.map(
      (a: any, i: number) =>
        `<p class="q-text"><b>${i + 1}.</b> ${escapeHtml(a.correctAnswer)}</p>`,
    ),
    ...shortAnswers.map(
      (a: any, i: number) =>
        `<div class="q"><p class="q-text">${escapeHtml(secD[i]?.question || `Q${i + 1}`)}</p><p class="ans-green">${escapeHtml(a.modelAnswer)}</p></div>`,
    ),
  ].join('');

  const hasContent = secA.length + secB.length + secC.length + secD.length + matchPairs.length > 0;

  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"><\/script>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: ${bgColor}; color: ${textColor}; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 15px;
    line-height: 1.55;
    padding: 12px;
  }
  .section {
    border-radius: 10px;
    padding: 14px;
    margin-bottom: 12px;
  }
  .section-label {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
  }
  .q { margin-bottom: 12px; }
  .q-text { margin: 0 0 4px; word-break: break-word; }
  .opt { margin: 2px 0 2px 16px; color: ${mutedColor}; }
  .muted { color: ${mutedColor}; font-size: 13px; }
  .answer-line { height: 28px; border-bottom: 1px solid; margin-top: 4px; }
  .match-grid { display: flex; gap: 16px; }
  .match-col { flex: 1; }
  .ans-green { color: #059669; margin: 2px 0 0; font-style: italic; }
  .katex { font-size: 1em !important; }
  .katex-display { margin: 6px 0 !important; overflow-x: auto; }
  .empty { text-align: center; color: ${mutedColor}; padding: 40px 16px; }
</style>
</head><body>
${!hasContent ? `<div class="empty">This worksheet has no displayable sections.</div>` : ''}
${secA.length ? sectionCard('Section A – Multiple Choice Questions', mcqRows) : ''}
${secB.length ? sectionCard('Section B – Fill in the Blanks', fitbRows) : ''}
${secC.length ? sectionCard('Section C – True / False', tfRows) : ''}
${secD.length ? sectionCard('Section D – Short Answer Questions', shortRows) : ''}
${matchPairs.length ? sectionCard('Section E – Match the Following', matchBody) : ''}
${
  mcqAnswers.length || shortAnswers.length
    ? sectionCard('Answer Key', answerBody, '#059669')
    : ''
}

<script>
(function() {
  function run() {
    if (typeof renderMathInElement === 'function') {
      renderMathInElement(document.body, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\\\(', right: '\\\\)', display: false },
          { left: '\\\\[', right: '\\\\]', display: true }
        ],
        throwOnError: false
      });
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
<\/script>
</body></html>`;
}

export default function WorksheetScreen({ route, navigation }: any) {
  const rawParam = route?.params?.worksheetData;
  const decodedInitial = normalizeWorksheetResult(rawParam);
  const initialMode: ScreenMode = decodedInitial || rawParam ? 'view' : 'create';
  const initialData = decodedInitial;

  const { theme } = useTheme();
  const { colors } = theme;
  const { classes } = useDropdowns();
  const insets = useSafeAreaInsets();
  const schoolId = useUserStore((s) => s.schoolId);

  const [mode, setMode] = useState<ScreenMode>(initialMode);
  /** True when user generated a worksheet on this screen (create → view). Back returns to form. */
  const [generatedLocally, setGeneratedLocally] = useState(false);
  const [worksheetResult, setWorksheetResult] = useState<any>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [printing, setPrinting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showShareOptionsModal, setShowShareOptionsModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const [form, setForm] = useState<WorksheetFormState>({
    classId: '',
    subjectId: '',
    lesson: '',
    level: 'intermediate',
    itext: '',
    count: '10',
  });

  // Find class/subject name helpers
  const findClass = (id: string) =>
    (classes as any[]).find((c) => String(c.id) === String(id));

  const wsDataForTitle = worksheetResult?.WorksheetData || worksheetResult;
  const viewTitle =
    wsDataForTitle?.Metadata?.Subject ||
    String(route?.params?.title || '').trim() ||
    'Worksheet';

  const handleBackToCreate = useCallback(() => {
    setMode('create');
  }, []);

  useLayoutEffect(() => {
    if (mode === 'view' && generatedLocally) {
      navigation.setOptions({
        title: viewTitle,
        headerLeft: () => (
          <TouchableOpacity
            onPress={handleBackToCreate}
            style={{ marginLeft: 16, flexDirection: 'row', alignItems: 'center' }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
        ),
      });
    } else {
      navigation.setOptions({
        title: mode === 'view' ? viewTitle : 'Create Worksheet',
        headerLeft: undefined,
      });
    }
  }, [mode, generatedLocally, viewTitle, handleBackToCreate, navigation, colors.primary]);

  useEffect(() => {
    if (mode !== 'view' || !generatedLocally) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setMode('create');
      return true;
    });
    return () => sub.remove();
  }, [mode, generatedLocally]);

  const handleGenerate = async () => {
    if (!form.classId) { setError('Please select a class.'); return; }
    if (!form.lesson.trim()) { setError('Please enter a lesson.'); return; }
    setError('');
    setLoading(true);

    const selectedClass = findClass(form.classId);
    const count = parseInt(form.count, 10) || 10;
    const mcqCount = Math.min(Math.ceil(count * 0.5), count);
    const shortCount = count - mcqCount;

    try {
      const result = await generateWorksheet({
        class: selectedClass?.name || selectedClass?.label || form.classId,
        subject: form.subjectId.trim() || 'General',
        lesson: form.lesson.trim(),
        level: form.level,
        itext: form.itext.trim(),
        count,
        mcq_count: mcqCount,
        fitb_count: 0,
        tf_count: 0,
        short_q_count: shortCount,
        matching_count: 0,
        type: 'worksheet',
      });

      setWorksheetResult(result);
      setGeneratedLocally(true);
      setMode('view');

      // Save to history as a Worksheet source entry
      const wsData = result?.WorksheetData;
      if (wsData) {
        const marker = '__WS_DATA__';
        await saveUserAssessment({
          title: `${wsData.Metadata?.Subject || 'Worksheet'} – ${wsData.Metadata?.Lesson || form.lesson}`,
          subject: wsData.Metadata?.Subject,
          class_name: wsData.Metadata?.Class,
          level: wsData.Metadata?.Difficulty,
          lesson: wsData.Metadata?.Lesson,
          assessment_type: 'worksheet',
          source: 'Worksheet',
          school_id: schoolId,
          questions: [
            {
              quiz: {
                question: marker + JSON.stringify(wsData),
                options: [],
                answer: 'A',
              },
              answer: 'A',
            },
          ],
        });
      }
    } catch (err: any) {
      setError(normalizeErrorMessage(err, 'Worksheet generation failed.'));
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    const wsData = worksheetResult?.WorksheetData || worksheetResult;
    const worksheet = wsData?.Worksheet || {};
    const answerKey = wsData?.AnswerKey || {};

    const html = buildHtml(worksheet, answerKey, colors);
    try {
      setPrinting(true);
      if (Platform.OS === 'web') {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const w = window.open(url, '_blank');
        if (w) w.print();
      } else {
        await Print.printAsync({ html });
      }
    } catch {
      Alert.alert('Error', 'Could not open print dialog.');
    } finally {
      setPrinting(false);
    }
  };

  const handleShare = () => {
    if (!worksheetResult) {
      Alert.alert('Error', 'No worksheet to share.');
      return;
    }
    setShowShareModal(true);
  };

  const handleShareSuccess = (url: string) => {
    setShareUrl(url);
    setShowShareOptionsModal(true);
  };

  // ──────────────────────────────────────────────────────
  // VIEW MODE – display the generated worksheet
  // ──────────────────────────────────────────────────────
  if (mode === 'view') {
    const savedTitle = String(route?.params?.title || '').trim();

    if (!worksheetResult) {
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.viewHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.viewTitle, { color: colors.text }]}>
                {savedTitle || 'Worksheet'}
              </Text>
            </View>
          </View>
          <View style={styles.emptyView}>
            <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyViewTitle, { color: colors.text }]}>Could not load worksheet</Text>
            <Text style={[styles.emptyViewText, { color: colors.textSecondary }]}>
              The saved worksheet data could not be read. Try generating a new one.
            </Text>
          </View>
        </View>
      );
    }

    const wsData = worksheetResult?.WorksheetData || worksheetResult;
    const meta = wsData?.Metadata || {};
    const worksheet = wsData?.Worksheet || {};
    const answerKey = wsData?.AnswerKey || {};
    const worksheetForShare = { WorksheetData: wsData };
    const shareQuestionCount = countWorksheetQuestions(worksheetForShare);

    const viewHtml = buildHtml(worksheet, answerKey, colors);

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.viewHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.viewTitle, { color: colors.text }]}>
              {meta.Subject || savedTitle || 'Worksheet'}
            </Text>
            <Text style={[styles.viewMeta, { color: colors.textSecondary }]}>
              {[meta.Class, meta.Lesson, meta.Difficulty].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <TouchableOpacity onPress={handlePrint} style={[styles.headerBtn, { backgroundColor: colors.primary }]} disabled={printing}>
            {printing ? <LoadingSpinner size={18} /> : <Ionicons name="print" size={18} color="#fff" />}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={[styles.headerBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
            <Ionicons name="share-social-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setMode('create'); setWorksheetResult(null); }}
            style={[styles.headerBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
          >
            <Ionicons name="add" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Single KaTeX WebView — same rich math pipeline as quiz MathRenderer / print */}
        <View style={[styles.webviewWrap, { paddingBottom: Math.max(8, insets.bottom) }]}>
          <WebView
            source={{ html: viewHtml }}
            style={styles.webview}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled={false}
            scalesPageToFit={false}
            setSupportMultipleWindows={false}
            showsVerticalScrollIndicator
            androidLayerType="hardware"
          />
        </View>

        <ShareQuizModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          assessmentType="worksheet"
          quizData={{
            title: worksheetShareTopic(worksheetForShare),
            class: meta.Class,
            subject: meta.Subject,
            difficulty: meta.Difficulty,
            questionsCount: shareQuestionCount,
            questions: buildWorksheetShareQuestions(worksheetForShare),
            thread_slug: `worksheet_${Date.now()}`,
          }}
          quizMetadata={{
            lesson: meta.Lesson,
            subject: meta.Subject,
            difficulty_level: meta.Difficulty,
            question_count: shareQuestionCount,
            additional_instructions: meta.Focus_Instructions || '',
          }}
          onShareSuccess={handleShareSuccess}
        />

        {shareUrl ? (
          <ShareOptionsModal
            visible={showShareOptionsModal}
            onClose={() => setShowShareOptionsModal(false)}
            shareUrl={shareUrl}
            shareKind="worksheet"
          />
        ) : null}
      </View>
    );
  }

  // ──────────────────────────────────────────────────────
  // CREATE MODE – worksheet configuration form
  // ──────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.formScroll, { paddingBottom: 180 + insets.bottom }]}
      >
        <View style={styles.formWrap}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Create Worksheet</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            Generate a printable worksheet for your students
          </Text>

          <ModalDropdownField
            label="Class"
            value={form.classId}
            onChange={(v) => setForm((p) => ({ ...p, classId: v }))}
            items={(classes as any[]).map((c) => ({
              id: String(c.id),
              name: c.name || c.label,
            }))}
            placeholder="Select class..."
            required
          />

          {/* Subject */}
          <View style={styles.fieldBlock}>
            <Text style={[styles.label, { color: colors.text }]}>Subject</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
              value={form.subjectId}
              onChangeText={(t) => setForm((p) => ({ ...p, subjectId: t }))}
              placeholder="e.g. Mathematics"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Lesson */}
          <View style={styles.fieldBlock}>
            <Text style={[styles.label, { color: colors.text }]}>Lesson / Topic *</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
              value={form.lesson}
              onChangeText={(t) => setForm((p) => ({ ...p, lesson: t }))}
              placeholder="Enter lesson name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <ModalDropdownField
            label="Difficulty Level"
            value={form.level}
            onChange={(v) => setForm((p) => ({ ...p, level: v || 'beginner' }))}
            items={LEVELS.map((l) => ({ id: l.id, name: l.name }))}
            placeholder="Select difficulty..."
          />

          {/* Number of Questions */}
          <View style={styles.fieldBlock}>
            <Text style={[styles.label, { color: colors.text }]}>Number of Questions</Text>
            <View style={styles.countRow}>
              {COUNT_OPTIONS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.countChip,
                    { borderColor: colors.border, backgroundColor: colors.card },
                    form.count === c && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setForm((p) => ({ ...p, count: c }))}
                >
                  <Text style={[styles.countChipText, { color: form.count === c ? '#fff' : colors.text }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Additional instructions */}
          <View style={styles.fieldBlock}>
            <Text style={[styles.label, { color: colors.text }]}>Instructions (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
              value={form.itext}
              onChangeText={(t) => setForm((p) => ({ ...p, itext: t }))}
              placeholder="Focus areas, special instructions..."
              placeholderTextColor={colors.textSecondary}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.background,
            paddingBottom: Math.max(16, insets.bottom + 8),
          },
        ]}
      >
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.generateBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
          onPress={handleGenerate}
          disabled={loading}
        >
          {loading ? <LoadingSpinner size={20} /> : (
            <>
              <Ionicons name="document-text" size={18} color="#fff" />
              <Text style={styles.generateBtnText}>✨ Generate Worksheet</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },

  // view mode
  viewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    gap: 8,
  },
  viewTitle: { fontSize: 17, fontWeight: '700' },
  viewMeta: { fontSize: 12, marginTop: 2 },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webviewWrap: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  emptyView: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyViewTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyViewText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },

  // create mode
  formScroll: { flexGrow: 1 },
  formWrap: { paddingHorizontal: 14, paddingTop: 12 },
  pageTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  pageSubtitle: { fontSize: 13, marginBottom: 16 },
  fieldBlock: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: { minHeight: 80 },
  countRow: { flexDirection: 'row', gap: 8 },
  countChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
  },
  countChipText: { fontSize: 13, fontWeight: '600' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  errorText: { color: '#EF4444', fontSize: 13, marginBottom: 8 },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    minHeight: 50,
  },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
