/**
 * Worksheet Screen
 * - Create mode: form to configure and generate a worksheet
 * - View mode: display the generated worksheet with print/share support
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Share,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';
import { useDropdowns } from '../context/DropdownContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { generateWorksheet, saveUserAssessment } from '../core/services/sharedApi';
import { useUserStore } from '../core/store/user.store';

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

function buildHtml(meta: any, worksheet: any, _answerKey?: any): string {
  const secA: any[] = worksheet?.Section_A_MCQ || [];
  const secB: any[] = worksheet?.Section_B_Fill_in_the_Blank || [];
  const secC: any[] = worksheet?.Section_C_True_False || [];
  const secD: any[] = worksheet?.Section_D_Short_Questions || [];
  const secE = worksheet?.Section_E_Matching || {};

  const mcqRows = secA
    .map(
      (q: any, i: number) => `
      <p style="margin:8px 0"><b>${i + 1}. ${q.question}</b></p>
      ${(q.options || []).map((o: string, oi: number) => `<p style="margin:2px 0 2px 16px">${String.fromCharCode(65 + oi)}. ${o}</p>`).join('')}
    `,
    )
    .join('');

  const fitbRows = secB
    .map((q: any, i: number) => `<p style="margin:8px 0">${i + 1}. ${q.question || q}</p>`)
    .join('');

  const tfRows = secC
    .map(
      (q: any, i: number) =>
        `<p style="margin:8px 0">${i + 1}. ${q.statement || q.question || q} &nbsp;&nbsp;(True / False)</p>`,
    )
    .join('');

  const shortRows = secD
    .map(
      (q: any, i: number) =>
        `<p style="margin:8px 0">${i + 1}. ${q.question || q}</p><p style="min-height:28px;border-bottom:1px solid #ccc;margin-bottom:8px"></p>`,
    )
    .join('');

  const matchPairs: any[] = secE?.Pairs || [];
  const matchLeft = matchPairs.map((p: any, i: number) => `<p>${i + 1}. ${p.left}</p>`).join('');
  const matchRight = matchPairs.map((p: any, i: number) => `<p>${String.fromCharCode(65 + i)}. ${p.right}</p>`).join('');

  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<style>
  body { font-family: Arial, sans-serif; font-size: 14px; padding: 24px; color: #111; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  h3 { font-size: 15px; margin: 20px 0 6px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  .meta { color: #555; font-size: 13px; margin-bottom: 16px; }
  .match-grid { display: flex; gap: 32px; }
  .match-col { flex: 1; }
</style>
</head><body>
<h1>${meta?.Subject || 'Worksheet'} – ${meta?.Lesson || ''}</h1>
<p class="meta">Class: ${meta?.Class || ''} &nbsp; | &nbsp; Level: ${meta?.Difficulty || ''}</p>

${secA.length ? `<h3>Section A – Multiple Choice Questions</h3>${mcqRows}` : ''}
${secB.length ? `<h3>Section B – Fill in the Blanks</h3>${fitbRows}` : ''}
${secC.length ? `<h3>Section C – True / False</h3>${tfRows}` : ''}
${secD.length ? `<h3>Section D – Short Answer Questions</h3>${shortRows}` : ''}
${matchPairs.length ? `<h3>Section E – Match the Following</h3><div class="match-grid"><div class="match-col">${matchLeft}</div><div class="match-col">${matchRight}</div></div>` : ''}

</body></html>`;
}

export default function WorksheetScreen({ route, navigation: _navigation }: any) {
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
  const [worksheetResult, setWorksheetResult] = useState<any>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [printing, setPrinting] = useState(false);

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
    const meta = wsData?.Metadata || {};
    const worksheet = wsData?.Worksheet || {};
    const answerKey = wsData?.AnswerKey || {};

    const html = buildHtml(meta, worksheet, answerKey);
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

  const handleShare = async () => {
    const wsData = worksheetResult?.WorksheetData || worksheetResult;
    const meta = wsData?.Metadata || {};
    const title = `${meta.Subject || 'Worksheet'} – ${meta.Lesson || ''}`;
    try {
      await Share.share({ message: title, title });
    } catch {/* ignore */ }
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

    const secA: any[] = worksheet?.Section_A_MCQ || [];
    const secD: any[] = worksheet?.Section_D_Short_Questions || [];
    const secC: any[] = worksheet?.Section_C_True_False || [];
    const secB: any[] = worksheet?.Section_B_Fill_in_the_Blank || [];
    const secE = worksheet?.Section_E_Matching || {};
    const matchPairs: any[] = secE?.Pairs || [];

    const mcqAnswers: any[] = answerKey?.Section_A_MCQ || [];
    const shortAnswers: any[] = answerKey?.Section_D_Short_Questions || [];
    const hasContent =
      secA.length + secB.length + secC.length + secD.length + matchPairs.length > 0;

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

        <ScrollView contentContainerStyle={[styles.viewContent, { paddingBottom: Math.max(16, insets.bottom) }]}>
          {!hasContent && (
            <View style={styles.emptyView}>
              <Ionicons name="document-outline" size={40} color={colors.textSecondary} />
              <Text style={[styles.emptyViewText, { color: colors.textSecondary }]}>
                This worksheet has no displayable sections.
              </Text>
            </View>
          )}

          {/* MCQ section */}
          {secA.length > 0 && (
            <Section label="Section A – Multiple Choice Questions">
              {secA.map((q: any, i: number) => (
                <View key={i} style={styles.questionBlock}>
                  <Text style={[styles.questionText, { color: colors.text }]}>{i + 1}. {q.question}</Text>
                  {(q.options || []).map((opt: string, oi: number) => (
                    <Text key={oi} style={[styles.optionText, { color: colors.textSecondary }]}>
                      {String.fromCharCode(65 + oi)}. {opt}
                    </Text>
                  ))}
                </View>
              ))}
            </Section>
          )}

          {/* Fill in blanks */}
          {secB.length > 0 && (
            <Section label="Section B – Fill in the Blanks">
              {secB.map((q: any, i: number) => (
                <Text key={i} style={[styles.questionText, { color: colors.text }]}>{i + 1}. {q.question || q}</Text>
              ))}
            </Section>
          )}

          {/* True/False */}
          {secC.length > 0 && (
            <Section label="Section C – True / False">
              {secC.map((q: any, i: number) => (
                <Text key={i} style={[styles.questionText, { color: colors.text }]}>
                  {i + 1}. {q.statement || q.question || q}
                </Text>
              ))}
            </Section>
          )}

          {/* Short questions */}
          {secD.length > 0 && (
            <Section label="Section D – Short Answer Questions">
              {secD.map((q: any, i: number) => (
                <View key={i} style={styles.questionBlock}>
                  <Text style={[styles.questionText, { color: colors.text }]}>{i + 1}. {q.question || q}</Text>
                  <View style={[styles.answerLine, { borderBottomColor: colors.border }]} />
                </View>
              ))}
            </Section>
          )}

          {/* Matching */}
          {matchPairs.length > 0 && (
            <Section label="Section E – Match the Following">
              <View style={styles.matchGrid}>
                <View style={{ flex: 1 }}>
                  {matchPairs.map((p: any, i: number) => (
                    <Text key={i} style={[styles.questionText, { color: colors.text }]}>{i + 1}. {p.left}</Text>
                  ))}
                </View>
                <View style={{ flex: 1 }}>
                  {matchPairs.map((p: any, i: number) => (
                    <Text key={i} style={[styles.questionText, { color: colors.text }]}>{String.fromCharCode(65 + i)}. {p.right}</Text>
                  ))}
                </View>
              </View>
            </Section>
          )}

          {/* Answer Key */}
          {(mcqAnswers.length > 0 || shortAnswers.length > 0) && (
            <Section label="✅ Answer Key" accent="#059669">
              {mcqAnswers.map((a: any, i: number) => (
                <Text key={i} style={[styles.answerText, { color: colors.text }]}>
                  {i + 1}. {a.correctAnswer}
                </Text>
              ))}
              {shortAnswers.map((a: any, i: number) => (
                <View key={i} style={styles.questionBlock}>
                  <Text style={[styles.questionText, { color: colors.text }]}>{secD[i]?.question || `Q${i + 1}`}</Text>
                  <Text style={[styles.answerText, { color: '#059669' }]}>{a.modelAnswer}</Text>
                </View>
              ))}
            </Section>
          )}
        </ScrollView>
      </View>
    );
  }

  // ──────────────────────────────────────────────────────
  // CREATE MODE – worksheet configuration form
  // ──────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
        <View style={styles.formWrap}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Create Worksheet</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            Generate a printable worksheet for your students
          </Text>

          {/* Class */}
          <View style={styles.fieldBlock}>
            <Text style={[styles.label, { color: colors.text }]}>Class *</Text>
            <View style={[styles.pickerWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Picker
                selectedValue={form.classId}
                onValueChange={(v) => setForm((p) => ({ ...p, classId: String(v) }))}
                style={{ color: colors.text }}
                dropdownIconColor={colors.textSecondary}
              >
                <Picker.Item label="Select class..." value="" color={colors.textSecondary} />
                {(classes as any[]).map((c) => (
                  <Picker.Item key={c.id} label={c.name || c.label} value={String(c.id)} color={colors.text} />
                ))}
              </Picker>
            </View>
          </View>

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

          {/* Level */}
          <View style={styles.fieldBlock}>
            <Text style={[styles.label, { color: colors.text }]}>Difficulty Level</Text>
            <View style={[styles.pickerWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Picker
                selectedValue={form.level}
                onValueChange={(v) => setForm((p) => ({ ...p, level: String(v) }))}
                style={{ color: colors.text }}
                dropdownIconColor={colors.textSecondary}
              >
                {LEVELS.map((l) => (
                  <Picker.Item key={l.id} label={l.name} value={l.id} color={colors.text} />
                ))}
              </Picker>
            </View>
          </View>

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

      <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: Math.max(16, insets.bottom) }]}>
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
    </View>
  );
}

function Section({ label, accent = '#0891B2', children }: { label: string; accent?: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={[sectionStyles.wrap, { backgroundColor: theme.colors.card }]}>
      <Text style={[sectionStyles.label, { color: accent }]}>{label}</Text>
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrap: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

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
  viewContent: {
    padding: 12,
  },
  questionBlock: { marginBottom: 10, gap: 2 },
  questionText: { fontSize: 14 },
  optionText: { fontSize: 13, marginLeft: 14 },
  answerLine: { height: 28, borderBottomWidth: 1, marginTop: 4 },
  answerText: { fontSize: 13, fontStyle: 'italic' },
  matchGrid: { flexDirection: 'row', gap: 16 },
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
  formScroll: { paddingBottom: 140 },
  formWrap: { paddingHorizontal: 14, paddingTop: 12 },
  pageTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  pageSubtitle: { fontSize: 13, marginBottom: 16 },
  fieldBlock: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 5 },
  pickerWrap: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
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
