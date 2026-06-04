/**
 * Recent Assessments Screen
 * Lists saved quizzes and worksheets (two sub-tabs) with search + filter support.
 * Tapping a quiz loads it in QuizTakingScreen; tapping a worksheet opens WorksheetScreen.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  RefreshControl,
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

const TABS = [
  { key: 'quiz', label: 'Recent Quizzes' },
  { key: 'worksheet', label: 'Worksheets' },
];

/**
 * Decode a saved quiz's questions from the user-assessments format
 * `[{ quiz: { question, options, answer, explanation }, answer }]`
 * into the flat format `QuizTakingScreen` expects.
 */
function decodeQuizQuestions(raw: any[]): any[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: any, idx: number) => {
    if (item?.quiz?.question) {
      return {
        id: `q-${idx}`,
        question: item.quiz.question,
        options: item.quiz.options || [],
        correctAnswer: item.quiz.answer || 'A',
        answer: item.quiz.answer || 'A',
        explanation: item.quiz.explanation || null,
      };
    }
    // Already in flat format
    return {
      id: item.id || `q-${idx}`,
      question: item.question || '',
      options: item.options || [],
      correctAnswer: item.correctAnswer || item.answer || 'A',
      answer: item.answer || item.correctAnswer || 'A',
      explanation: item.explanation || null,
    };
  });
}

export default function RecentAssessmentsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'quiz' | 'worksheet'>('quiz');
  const [quizzes, setQuizzes] = useState<AssessmentListItem[]>([]);
  const [worksheets, setWorksheets] = useState<AssessmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      const [qList, wList] = await Promise.all([
        listUserAssessments('quiz'),
        listUserAssessments(undefined, 'Worksheet'),
      ]);
      setQuizzes(Array.isArray(qList) ? qList : []);
      setWorksheets(Array.isArray(wList) ? wList : []);
    } catch (err) {
      console.error('Failed to fetch assessments:', err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

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
          showActionButtons: true,
          showShareButton: false,
          source: 'history',
        });
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

  const filterList = (list: AssessmentListItem[]) => {
    let out = list;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (i) =>
          i.title?.toLowerCase().includes(q) ||
          i.subject?.toLowerCase().includes(q) ||
          i.lesson?.toLowerCase().includes(q),
      );
    }
    if (selectedClass !== 'all') {
      out = out.filter((i) => i.class_name === selectedClass);
    }
    if (selectedSubject !== 'all') {
      out = out.filter((i) => i.subject === selectedSubject);
    }
    return out;
  };

  const activeList = activeTab === 'quiz' ? filterList(quizzes) : filterList(worksheets);

  const onPress = activeTab === 'quiz' ? handleOpenQuiz : handleOpenWorksheet;

  // Derive unique class/subject options for filter
  const allItems = activeTab === 'quiz' ? quizzes : worksheets;
  const classOptions: string[] = ['all', ...Array.from(new Set(allItems.map((i) => i.class_name).filter((x): x is string => !!x)))];
  const subjectOptions: string[] = ['all', ...Array.from(new Set(allItems.map((i) => i.subject).filter((x): x is string => !!x)))];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TabBar tabs={TABS} activeKey={activeTab} onChange={(k) => setActiveTab(k as any)} />

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search assessments..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter chips */}
      {classOptions.length > 2 || subjectOptions.length > 2 ? (
        <View style={[styles.filterRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <ScrollableChips
            options={classOptions}
            selected={selectedClass}
            onSelect={setSelectedClass}
            colors={colors}
          />
          <ScrollableChips
            options={subjectOptions}
            selected={selectedSubject}
            onSelect={setSelectedSubject}
            colors={colors}
          />
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <LoadingSpinner size={48} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading...</Text>
        </View>
      ) : activeList.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name={activeTab === 'quiz' ? 'clipboard-outline' : 'document-text-outline'}
            size={56}
            color={colors.border}
          />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {search ? 'No results found' : activeTab === 'quiz' ? 'No quizzes yet' : 'No worksheets yet'}
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {search
              ? 'Try a different search term'
              : activeTab === 'quiz'
              ? 'Generate a quiz to see it here'
              : 'Create a worksheet to see it here'}
          </Text>
          {!search && (
            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: colors.primary }]}
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
            <AssessmentCard
              item={item}
              onPress={onPress}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(16, insets.bottom) }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

/** Small horizontal filter chips row */
function ScrollableChips({
  options,
  selected,
  onSelect,
  colors,
}: {
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  colors: any;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 }}>
      {options.map((opt) => {
        const active = selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onSelect(opt)}
            style={[
              chipStyles.chip,
              {
                backgroundColor: active ? colors.primary : colors.inputBackground,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[chipStyles.chipText, { color: active ? '#fff' : colors.textSecondary }]}>
              {opt === 'all' ? 'All' : opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  filterRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 6,
  },
  list: {
    paddingHorizontal: 12,
    paddingTop: 12,
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
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 8,
  },
  createBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
