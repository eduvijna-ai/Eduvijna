/**
 * Recent Assessments Screen
 * Lists saved quizzes and worksheets (two sub-tabs) with search + filter support.
 * Tapping a quiz loads it in QuizTakingScreen; tapping a worksheet opens WorksheetScreen.
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@context/ThemeContext';
import TabBar from '../components/TabBar';
import AssessmentCard, { AssessmentCardItem } from '../components/AssessmentCard';
import {
  listUserAssessments,
  getUserAssessmentById,
  deleteUserAssessment,
  AssessmentListItem,
} from '../core/services/sharedApi';
import LoadingSpinner from '../components/LoadingSpinner';
import { sanitizeQuizQuestions } from '@core/utils/quizQuestionUtils';

const WS_DATA_MARKER = '__WS_DATA__';

/**
 * Decode a saved quiz's questions from the user-assessments format
 * `[{ quiz: { question, options, answer, explanation }, answer }]`
 * into the flat format `QuizTakingScreen` expects.
 * Skips worksheet payload entries accidentally stored as quiz questions.
 */
function decodeQuizQuestions(raw: any[]): any[] {
  if (!Array.isArray(raw)) return [];
  const filtered = raw.filter((item: any) => {
    const qText = String(item?.quiz?.question ?? item?.question ?? '');
    return !qText.startsWith(WS_DATA_MARKER);
  });
  return sanitizeQuizQuestions(filtered);
}

const uniqueSorted = (values: (string | undefined)[]): string[] =>
  Array.from(
    new Set(
      values
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .filter((v) => v.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b));

export default function RecentAssessmentsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState<'quiz' | 'worksheet'>('quiz');
  const [quizzes, setQuizzes] = useState<AssessmentListItem[]>([]);
  const [worksheets, setWorksheets] = useState<AssessmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');

  const fetchData = useCallback(async () => {
    setFetchError('');
    try {
      const all = await listUserAssessments();
      const list = Array.isArray(all) ? all : [];
      const isWorksheet = (i: AssessmentListItem) =>
        i.assessment_type === 'worksheet' || i.source === 'Worksheet';
      const sortByDate = (a: AssessmentListItem, b: AssessmentListItem) =>
        (b.created_at || '').localeCompare(a.created_at || '');
      setQuizzes(list.filter((i) => !isWorksheet(i)).sort(sortByDate));
      setWorksheets(list.filter(isWorksheet).sort(sortByDate));
    } catch (err) {
      console.error('Failed to fetch assessments:', err);
      setFetchError('Could not load assessments. Pull down to retry.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  // Reset filters when switching tabs so stale filters don't hide everything.
  useEffect(() => {
    setSelectedClass('all');
    setSelectedSubject('all');
    setSearch('');
  }, [activeTab]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleOpenQuiz = useCallback(
    async (item: AssessmentCardItem) => {
      try {
        const detail = await getUserAssessmentById(item.id);
        if (!detail) {
          Alert.alert('Error', 'Could not load assessment details.');
          return;
        }

        const questions = decodeQuizQuestions(detail.questions || []);
        if (questions.length === 0) {
          Alert.alert('Empty Assessment', 'This assessment has no questions.');
          return;
        }

        const launch = (initialResponses?: Record<string, string>) => {
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
            assessmentId: detail.id,
            initialResponses,
            showActionButtons: true,
            showShareButton: true,
            source: 'history',
            workspaceMode: 'document',
          });
        };

        const savedResponses = detail.responses;
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
        Alert.alert('Error', 'Failed to open assessment.');
      }
    },
    [navigation],
  );

  const handleOpenWorksheet = useCallback(
    async (item: AssessmentCardItem) => {
      try {
        const detail = await getUserAssessmentById(item.id);
        if (!detail) {
          Alert.alert('Error', 'Could not load worksheet details.');
          return;
        }
        navigation.navigate('WorksheetScreen', {
          worksheetData: detail,
          title: item.title,
        });
      } catch {
        Alert.alert('Error', 'Failed to open worksheet.');
      }
    },
    [navigation],
  );

  const handleDelete = useCallback(
    (item: AssessmentCardItem) => {
      Alert.alert('Delete', `Delete "${item.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteUserAssessment(item.id);
            if (activeTab === 'quiz') {
              setQuizzes((prev) => prev.filter((q) => q.id !== item.id));
            } else {
              setWorksheets((prev) => prev.filter((w) => w.id !== item.id));
            }
          },
        },
      ]);
    },
    [activeTab],
  );

  const sourceList = activeTab === 'quiz' ? quizzes : worksheets;

  const classOptions = useMemo(
    () => ['all', ...uniqueSorted(sourceList.map((i) => i.class_name))],
    [sourceList],
  );

  const subjectOptions = useMemo(
    () => ['all', ...uniqueSorted(sourceList.map((i) => i.subject))],
    [sourceList],
  );

  const showClassFilter = classOptions.length > 2;
  const showSubjectFilter = subjectOptions.length > 2;
  const showFilters = showClassFilter || showSubjectFilter;
  const hasActiveFilters =
    search.trim().length > 0 || selectedClass !== 'all' || selectedSubject !== 'all';

  const filterList = useCallback(
    (list: AssessmentListItem[]) => {
      let out = list;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        out = out.filter(
          (i) =>
            i.title?.toLowerCase().includes(q) ||
            i.subject?.toLowerCase().includes(q) ||
            i.lesson?.toLowerCase().includes(q) ||
            i.class_name?.toLowerCase().includes(q),
        );
      }
      if (selectedClass !== 'all') {
        out = out.filter((i) => i.class_name?.trim() === selectedClass);
      }
      if (selectedSubject !== 'all') {
        out = out.filter((i) => i.subject?.trim() === selectedSubject);
      }
      return out;
    },
    [search, selectedClass, selectedSubject],
  );

  const activeList = useMemo(
    () => filterList(sourceList),
    [filterList, sourceList],
  );

  const onPress = activeTab === 'quiz' ? handleOpenQuiz : handleOpenWorksheet;

  const clearFilters = () => {
    setSearch('');
    setSelectedClass('all');
    setSelectedSubject('all');
  };

  const tabs = useMemo(
    () => [
      { key: 'quiz', label: 'Recent Quizzes', count: quizzes.length },
      { key: 'worksheet', label: 'Worksheets', count: worksheets.length },
    ],
    [quizzes.length, worksheets.length],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TabBar tabs={tabs} activeKey={activeTab} onChange={(k) => setActiveTab(k as 'quiz' | 'worksheet')} />

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search assessments..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter chips — labelled rows, horizontal scroll, high contrast */}
      {showFilters && (
        <View style={styles.filterSection}>
          {showClassFilter && (
            <FilterChipRow
              label="Class"
              options={classOptions}
              selected={selectedClass}
              onSelect={setSelectedClass}
              colors={colors}
            />
          )}
          {showSubjectFilter && (
            <FilterChipRow
              label="Subject"
              options={subjectOptions}
              selected={selectedSubject}
              onSelect={setSelectedSubject}
              colors={colors}
            />
          )}
          {hasActiveFilters && (
            <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearFilters} activeOpacity={0.7}>
              <Ionicons name="close" size={14} color={colors.primary} />
              <Text style={styles.clearFiltersText}>Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Result count strip */}
      {!loading && sourceList.length > 0 && (
        <View style={styles.resultStrip}>
          <Text style={styles.resultStripText}>
            {activeList.length} of {sourceList.length}{' '}
            {activeTab === 'quiz' ? 'quizzes' : 'worksheets'}
          </Text>
        </View>
      )}

      {fetchError ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color={colors.error || '#B91C1C'} />
          <Text style={styles.errorBannerText}>{fetchError}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <LoadingSpinner size={48} />
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      ) : activeList.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name={activeTab === 'quiz' ? 'clipboard-outline' : 'document-text-outline'}
            size={56}
            color={colors.border}
          />
          <Text style={styles.emptyTitle}>
            {hasActiveFilters ? 'No matching results' : activeTab === 'quiz' ? 'No quizzes yet' : 'No worksheets yet'}
          </Text>
          <Text style={styles.emptyText}>
            {hasActiveFilters
              ? 'Try adjusting your search or filters'
              : activeTab === 'quiz'
                ? 'Generate a quiz to see it here'
                : 'Create a worksheet to see it here'}
          </Text>
          {hasActiveFilters ? (
            <TouchableOpacity style={styles.createBtn} onPress={clearFilters}>
              <Text style={styles.createBtnText}>Clear filters</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() =>
                activeTab === 'quiz'
                  ? navigation.navigate('CreateAIQuizScreen')
                  : navigation.navigate('WorksheetScreen')
              }
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.createBtnText}>
                {activeTab === 'quiz' ? 'Create Quiz' : 'Create Worksheet'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={activeList}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => (
            <AssessmentCard item={item} onPress={onPress} onDelete={handleDelete} />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(24, insets.bottom + 16) }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

/** Labelled horizontal filter row with pill chips */
function FilterChipRow({
  label,
  options,
  selected,
  onSelect,
  colors,
}: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  colors: any;
}) {
  return (
    <View style={chipStyles.row}>
      <Text style={[chipStyles.rowLabel, { color: colors.text }]}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={chipStyles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {options.map((opt) => {
          const active = selected === opt;
          const display = opt === 'all' ? 'All' : opt;
          return (
            <TouchableOpacity
              key={`${label}-${opt}`}
              onPress={() => onSelect(opt)}
              activeOpacity={0.75}
              style={[
                chipStyles.chip,
                active
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : {
                      backgroundColor: colors.card,
                      borderColor: colors.primary + '55',
                    },
              ]}
            >
              <Text
                style={[
                  chipStyles.chipText,
                  { color: active ? '#FFFFFF' : colors.text },
                ]}
                numberOfLines={1}
              >
                {display}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '700',
    width: 56,
    flexShrink: 0,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    minHeight: 34,
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    searchRow: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: colors.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      paddingHorizontal: 12,
      height: 44,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      paddingVertical: 0,
    },
    filterSection: {
      backgroundColor: colors.card,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: 10,
    },
    clearFiltersBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      paddingVertical: 4,
    },
    clearFiltersText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    resultStrip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.background,
    },
    resultStripText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 14,
      marginTop: 8,
      padding: 10,
      borderRadius: 10,
      backgroundColor: (colors.error || '#DC2626') + '12',
    },
    errorBannerText: {
      flex: 1,
      fontSize: 13,
      color: colors.error || '#B91C1C',
    },
    list: {
      paddingHorizontal: 14,
      paddingTop: 4,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
      color: colors.text,
    },
    emptyText: {
      fontSize: 14,
      textAlign: 'center',
      color: colors.textSecondary,
    },
    createBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 12,
      marginTop: 8,
      backgroundColor: colors.primary,
    },
    createBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 14,
    },
  });
