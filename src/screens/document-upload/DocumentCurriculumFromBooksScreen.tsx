/**
 * From Books — curriculum catalogue (CBSE / class / subject / units) aligned with web HandwrittenWorkspace.
 */
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
import {
  deriveBoardOptions,
  deriveGradeOptions,
  deriveSubjectOptions,
  generateRegistryCurriculumQuiz,
  getCurriculumCatalog,
  resolveCurriculumByCodes,
  type CurriculumCatalogContext,
  type CurriculumResolveUnit,
} from '@core/services/curriculumAssessment.service';

const COUNT_OPTIONS = [5, 10, 15, 20];
const LEVELS = ['easy', 'medium', 'hard', 'mixed'];

export default function DocumentCurriculumFromBooksScreen({ navigation, embedded }: { navigation: any; embedded?: boolean }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [contexts, setContexts] = useState<CurriculumCatalogContext[]>([]);
  const [boardCode, setBoardCode] = useState('');
  const [gradeCode, setGradeCode] = useState('');
  const [subjectCtx, setSubjectCtx] = useState<CurriculumCatalogContext | null>(null);
  const [units, setUnits] = useState<CurriculumResolveUnit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
  const [questionCount, setQuestionCount] = useState(10);
  const [level, setLevel] = useState('medium');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getCurriculumCatalog(true);
        if (!cancelled) setContexts(data.contexts ?? []);
      } catch {
        if (!cancelled) Alert.alert('Error', 'Could not load curriculum catalogue.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const boards = useMemo(() => deriveBoardOptions(contexts), [contexts]);
  const grades = useMemo(
    () => (boardCode ? deriveGradeOptions(contexts, boardCode) : []),
    [contexts, boardCode],
  );
  const subjects = useMemo(
    () => (boardCode && gradeCode ? deriveSubjectOptions(contexts, boardCode, gradeCode) : []),
    [contexts, boardCode, gradeCode],
  );

  const loadUnits = useCallback(async (ctx: CurriculumCatalogContext) => {
    setUnitsLoading(true);
    setSelectedUnits(new Set());
    try {
      const data = await resolveCurriculumByCodes({
        board_code: ctx.board.code,
        grade_code: ctx.grade.code,
        subject_code: ctx.subject.code,
        version_label: ctx.version_label,
      });
      setUnits(data.units ?? []);
    } catch {
      setUnits([]);
      Alert.alert('Error', 'Could not resolve curriculum units for this selection.');
    } finally {
      setUnitsLoading(false);
    }
  }, []);

  const toggleUnit = (code: string) => {
    setSelectedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const onGenerate = async () => {
    if (!subjectCtx || selectedUnits.size === 0) {
      Alert.alert('Selection required', 'Choose board, class, subject, and at least one topic.');
      return;
    }
    const primaryUnit = units.find((u) => selectedUnits.has(u.unit_code));
    if (!primaryUnit) return;
    setGenerating(true);
    try {
      const topicTitles = units
        .filter((u) => selectedUnits.has(u.unit_code))
        .map((u) => u.title)
        .join('; ');
      const result = await generateRegistryCurriculumQuiz({
        curriculum_context: {
          board_code: subjectCtx.board.code,
          grade_code: subjectCtx.grade.code,
          subject_code: subjectCtx.subject.code,
          version_label: subjectCtx.version_label,
          unit_code: primaryUnit.unit_code,
        },
        count: questionCount,
        level,
        language: 'en',
        topic: topicTitles,
        itext: '',
      });
      const sessionId = result?.session_id ?? result?.data?.session_id;
      navigation.navigate('DocumentUploadPreviewScreen', {
        generatedQuiz: result,
        sessionId,
        source: 'Doc-File-Curriculum',
        previewMode: 'curriculum',
      });
    } catch (e: any) {
      Alert.alert('Generation failed', e?.message || 'Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const ChipRow = ({
    label,
    options,
    selected,
    onSelect,
    labelKey = 'label',
    valueKey = 'code',
  }: {
    label: string;
    options: any[];
    selected: string;
    onSelect: (code: string, item?: any) => void;
    labelKey?: string;
    valueKey?: string;
  }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map((opt) => {
          const code = opt[valueKey];
          const active = selected === code;
          return (
            <TouchableOpacity
              key={String(code)}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSelect(code, opt)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt[labelKey]}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {!embedded ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
        <Text style={styles.headerTitle}>From Books</Text>
        <TouchableOpacity onPress={() => navigation.navigate('DocumentLibraryScreen')}>
          <Text style={styles.link}>Uploaded library</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <ChipRow
            label="Board"
            options={boards}
            selected={boardCode}
            onSelect={(code) => {
              setBoardCode(code);
              setGradeCode('');
              setSubjectCtx(null);
              setUnits([]);
            }}
          />
          {boardCode ? (
            <ChipRow
              label="Class"
              options={grades}
              selected={gradeCode}
              onSelect={(code) => {
                setGradeCode(code);
                setSubjectCtx(null);
                setUnits([]);
              }}
            />
          ) : null}
          {gradeCode ? (
            <ChipRow
              label="Subject"
              options={subjects.map((s) => ({ code: s.subject.code, label: s.subject.label, ctx: s }))}
              selected={subjectCtx?.subject.code ?? ''}
              onSelect={(code, item) => {
                const ctx = (item?.ctx ?? null) as CurriculumCatalogContext | null;
                setSubjectCtx(ctx);
                if (ctx) void loadUnits(ctx);
              }}
            />
          ) : null}

          {subjectCtx ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Topics</Text>
              {unitsLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                units.map((unit) => {
                  const active = selectedUnits.has(unit.unit_code);
                  return (
                    <TouchableOpacity
                      key={unit.unit_code}
                      style={[styles.unitRow, active && styles.unitRowActive]}
                      onPress={() => toggleUnit(unit.unit_code)}
                    >
                      <Ionicons
                        name={active ? 'checkbox' : 'square-outline'}
                        size={18}
                        color={active ? colors.primary : colors.textSecondary}
                      />
                      <Text style={styles.unitTitle}>{unit.title}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Questions</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {COUNT_OPTIONS.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.chip, questionCount === n && styles.chipActive]}
                  onPress={() => setQuestionCount(n)}
                >
                  <Text style={[styles.chipText, questionCount === n && styles.chipTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Difficulty</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {LEVELS.map((lv) => (
                <TouchableOpacity
                  key={lv}
                  style={[styles.chip, level === lv && styles.chipActive]}
                  onPress={() => setLevel(lv)}
                >
                  <Text style={[styles.chipText, level === lv && styles.chipTextActive]}>{lv}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity
            style={[styles.generateBtn, generating && { opacity: 0.6 }]}
            disabled={generating}
            onPress={() => void onGenerate()}
          >
            {generating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.generateText}>Generate assessment</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingBottom: 8,
      gap: 8,
    },
    backBtn: { padding: 8 },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.text },
    link: { fontSize: 12, color: colors.primary, fontWeight: '600' },
    body: { padding: 16, paddingBottom: 40 },
    section: { marginBottom: 16 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
      backgroundColor: colors.card,
    },
    chipActive: { borderColor: colors.primary, backgroundColor: colors.tintBlue ?? colors.card },
    chipText: { color: colors.text, fontSize: 13 },
    chipTextActive: { color: colors.primary, fontWeight: '700' },
    unitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    unitRowActive: { backgroundColor: colors.surface },
    unitTitle: { flex: 1, color: colors.text, fontSize: 14 },
    generateBtn: {
      marginTop: 8,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    generateText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  });
}
