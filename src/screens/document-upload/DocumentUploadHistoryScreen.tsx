import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@context/ThemeContext';
import {
  AssessmentListItem,
  getUserAssessmentById,
  listUserAssessments,
} from '@core/services/sharedApi';
import { DocumentUploadBook } from '@core/services/documentUploadApi';
import { getDocumentUploadBooks } from '@core/services/documentUploadStorage';

type FilterTab = 'all' | 'books' | 'worksheets' | 'quizzes';

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

export default function DocumentUploadHistoryScreen({ navigation }: any) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [books, setBooks] = useState<DocumentUploadBook[]>([]);
  const [quizzes, setQuizzes] = useState<AssessmentListItem[]>([]);
  const [worksheets, setWorksheets] = useState<AssessmentListItem[]>([]);

  const load = useCallback(async () => {
    try {
      setError('');
      const [booksRaw, quizRaw, worksheetRaw] = await Promise.all([
        getDocumentUploadBooks(),
        listUserAssessments('quiz', 'DocumentUpload'),
        listUserAssessments('worksheet', 'DocumentUpload'),
      ]);
      setBooks(booksRaw);
      setQuizzes(Array.isArray(quizRaw) ? quizRaw : []);
      setWorksheets(Array.isArray(worksheetRaw) ? worksheetRaw : []);
    } catch (e: any) {
      setError(normalizeErrorMessage(e, 'Failed to load history'));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const allFeed = useMemo(() => {
    const mixed = [
      ...books.map((b) => ({
        id: `book-${b.id}`,
        type: 'book' as const,
        title: b.title || b.originalName,
        subtitle: `${b.totalPages || 1} page(s)`,
        createdAt: b.createdAt,
        raw: b,
      })),
      ...quizzes.map((q) => ({
        id: `quiz-${q.id}`,
        type: 'quiz' as const,
        title: q.title,
        subtitle: `${q.question_count || 0} Questions`,
        createdAt: q.created_at,
        raw: q,
      })),
      ...worksheets.map((w) => ({
        id: `worksheet-${w.id}`,
        type: 'worksheet' as const,
        title: w.title,
        subtitle: `${w.question_count || 0} Questions`,
        createdAt: w.created_at,
        raw: w,
      })),
    ];

    return mixed.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [books, quizzes, worksheets]);

  const listData = useMemo(() => {
    if (tab === 'all') return allFeed;
    return allFeed.filter((item) => item.type === (tab === 'books' ? 'book' : tab === 'quizzes' ? 'quiz' : 'worksheet'));
  }, [allFeed, tab]);

  const openItem = async (item: any) => {
    if (item.type === 'book') {
      navigation.navigate('DocumentUploadPreviewScreen', { book: item.raw });
      return;
    }

    const detail = await getUserAssessmentById(item.raw.id);
    if (!detail) return;

    if (item.type === 'worksheet') {
      navigation.navigate('WorksheetScreen', {
        worksheetData: detail,
        title: item.title,
      });
      return;
    }

    const questions = (detail.questions || []).map((entry: any, index: number) => {
      const quiz = entry?.quiz || entry;
      return {
        id: `duh-q-${index}`,
        question: String(quiz?.question || ''),
        options: Array.isArray(quiz?.options) ? quiz.options : [],
        correctAnswer: String(quiz?.answer || quiz?.correctAnswer || 'A'),
        answer: String(quiz?.answer || quiz?.correctAnswer || 'A'),
        explanation: quiz?.explanation || null,
      };
    });

    navigation.navigate('DocumentUploadQuizScreen', {
      quizData: {
        id: detail.id,
        title: detail.title,
        class: detail.class_name,
        subject: detail.subject,
        difficulty: detail.level,
        lesson: detail.lesson,
        questions,
      },
    });
  };

  const iconForType = (type: 'book' | 'quiz' | 'worksheet') => {
    if (type === 'book') return { name: 'book-outline', bg: '#EFF6FF', color: '#1D4ED8' };
    if (type === 'worksheet') return { name: 'document-text-outline', bg: '#ECFDF5', color: '#047857' };
    return { name: 'help-circle-outline', bg: '#F5F3FF', color: '#6D28D9' };
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {([
          { key: 'all', label: 'All' },
          { key: 'books', label: 'Books' },
          { key: 'worksheets', label: 'Worksheets' },
          { key: 'quizzes', label: 'Quizzes' },
        ] as const).map((entry) => {
          const active = tab === entry.key;
          return (
            <TouchableOpacity key={entry.key} style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={() => setTab(entry.key)}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{entry.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.centerText}>Loading history...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={26} color="#B91C1C" />
          <Text style={[styles.centerText, { color: '#B91C1C' }]}>{error}</Text>
        </View>
      ) : listData.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="time-outline" size={28} color={colors.textSecondary} />
          <Text style={styles.centerText}>No history yet for this Document Upload module.</Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: Math.max(16, insets.bottom) }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const icon = iconForType(item.type);
            return (
              <TouchableOpacity style={styles.card} onPress={() => void openItem(item)}>
                <View style={[styles.iconWrap, { backgroundColor: icon.bg }]}>
                  <Ionicons name={icon.name as any} size={20} color={icon.color} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.cardSub}>{item.subtitle}</Text>
                  <Text style={styles.cardMeta}>Created on {new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>

                <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    tabBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabBtnActive: { borderBottomColor: colors.primary },
    tabText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
    tabTextActive: { color: colors.primary },

    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.card,
      padding: 10,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: { color: colors.text, fontWeight: '700', fontSize: 14 },
    cardSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
    cardMeta: { color: colors.textSecondary, fontSize: 11, marginTop: 4 },

    centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 18 },
    centerText: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  });
