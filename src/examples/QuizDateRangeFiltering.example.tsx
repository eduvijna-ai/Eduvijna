/**
 * Example: Using Date Range Filtering with Pagination for Quiz Lists
 * All quiz data uses date ranges and pagination
 */

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { 
  fetchTeacherDashboardSummary, 
  fetchTeacherQuizzes,
  fetchStudentQuizzes,
  fetchQuizAttempts 
} from '@core/services/dashboardApi';

/**
 * EXAMPLE 1: Teacher Dashboard with Date Range
 * Default: Last month's quizzes with pagination
 */
export function TeacherDashboardWithDateRange() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Custom date range (optional)
  const [dateRange, setDateRange] = useState({
    created_from: '2025-12-01T00:00:00Z', // Start of December
    created_to: '2026-01-03T23:59:59Z',    // End of today
  });

  useEffect(() => {
    loadInitialQuizzes();
  }, [dateRange]);

  const loadInitialQuizzes = async () => {
    setLoading(true);
    try {
      // Fetch with date range and pagination
      const response = await fetchTeacherDashboardSummary({
        created_from: dateRange.created_from,
        created_to: dateRange.created_to,
        limit: 10,
        offset: 0,
      });

      console.log('📊 Dashboard loaded:', {
        count: response.data.length,
        dateRange: `${dateRange.created_from.substring(0, 10)} to ${dateRange.created_to.substring(0, 10)}`,
      });

      setQuizzes(response.data);
      setOffset(10);
      setHasMore(response.data.length === 10);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreQuizzes = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const response = await fetchTeacherQuizzes({
        created_from: dateRange.created_from,
        created_to: dateRange.created_to,
        limit: 10,
        offset,
      });

      setQuizzes(prev => [...prev, ...response.data]);
      setOffset(prev => prev + 10);
      setHasMore(response.data.length === 10);
    } catch (error) {
      console.error('Failed to load more:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Date Range Display */}
      <View style={{ padding: 16, backgroundColor: '#F3F4F6' }}>
        <Text style={{ fontSize: 14, color: '#6B7280' }}>
          Showing quizzes from {dateRange.created_from.substring(0, 10)} to{' '}
          {dateRange.created_to.substring(0, 10)}
        </Text>
      </View>

      {/* Quiz List with Pagination */}
      <FlatList
        data={quizzes}
        renderItem={({ item }) => <QuizCard quiz={item} />}
        keyExtractor={item => item.quiz_id}
        ListFooterComponent={() =>
          hasMore && (
            <TouchableOpacity onPress={loadMoreQuizzes} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#5B21B6" />
              ) : (
                <Text style={{ textAlign: 'center', padding: 16, color: '#5B21B6' }}>
                  Load More
                </Text>
              )}
            </TouchableOpacity>
          )
        }
      />
    </View>
  );
}

/**
 * EXAMPLE 2: Student Quizzes with Date Range Filter
 * Shows how to use custom date ranges
 */
export function StudentQuizzesWithDateFilter() {
  const [quizzes, setQuizzes] = useState([]);
  const [selectedRange, setSelectedRange] = useState<'week' | 'month' | 'year'>('month');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadQuizzes();
  }, [selectedRange]);

  const getDateRange = () => {
    const now = new Date();
    const endDate = now.toISOString();
    let startDate: string;

    switch (selectedRange) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = weekAgo.toISOString();
        break;
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        startDate = monthAgo.toISOString();
        break;
      case 'year':
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        startDate = yearAgo.toISOString();
        break;
    }

    return { created_from: startDate, created_to: endDate };
  };

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const dateRange = getDateRange();
      const response = await fetchStudentQuizzes({
        ...dateRange,
        limit: 10,
        offset: 0,
      });

      console.log('📚 Student quizzes loaded:', {
        range: selectedRange,
        count: response.data.length,
      });

      setQuizzes(response.data);
    } catch (error) {
      console.error('Failed to load student quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Date Range Selector */}
      <View style={{ flexDirection: 'row', padding: 16, gap: 8 }}>
        <DateRangeButton
          title="Last Week"
          active={selectedRange === 'week'}
          onPress={() => setSelectedRange('week')}
        />
        <DateRangeButton
          title="Last Month"
          active={selectedRange === 'month'}
          onPress={() => setSelectedRange('month')}
        />
        <DateRangeButton
          title="Last Year"
          active={selectedRange === 'year'}
          onPress={() => setSelectedRange('year')}
        />
      </View>

      {/* Quiz List */}
      {loading ? (
        <ActivityIndicator size="large" color="#5B21B6" />
      ) : (
        <FlatList
          data={quizzes}
          renderItem={({ item }) => <QuizCard quiz={item} />}
          keyExtractor={item => item.quiz_id}
        />
      )}
    </View>
  );
}

/**
 * EXAMPLE 3: Quiz Attempts with Date Range and Pagination
 * Shows how to fetch quiz attempts with date filtering
 */
export function QuizAttemptsWithDateRange() {
  const [attempts, setAttempts] = useState([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Last 30 days
  const dateRange = {
    created_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_to: new Date().toISOString(),
  };

  useEffect(() => {
    loadInitialAttempts();
  }, []);

  const loadInitialAttempts = async () => {
    setLoading(true);
    try {
      const response = await fetchQuizAttempts({
        created_from: dateRange.created_from,
        created_to: dateRange.created_to,
        limit: 10,
        offset: 0,
      });

      setAttempts(response.data);
      setOffset(10);
      setHasMore(response.data.length === 10);
    } catch (error) {
      console.error('Failed to load attempts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreAttempts = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const response = await fetchQuizAttempts({
        created_from: dateRange.created_from,
        created_to: dateRange.created_to,
        limit: 10,
        offset,
      });

      setAttempts(prev => [...prev, ...response.data]);
      setOffset(prev => prev + 10);
      setHasMore(response.data.length === 10);
    } catch (error) {
      console.error('Failed to load more attempts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ padding: 16, fontSize: 16, fontWeight: 'bold' }}>
        Quiz Attempts (Last 30 Days)
      </Text>

      <FlatList
        data={attempts}
        renderItem={({ item }) => <AttemptCard attempt={item} />}
        keyExtractor={(item, index) => `${item.quiz_id}-${index}`}
        onEndReached={loadMoreAttempts}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() =>
          loading && hasMore && <ActivityIndicator color="#5B21B6" />
        }
      />
    </View>
  );
}

/**
 * EXAMPLE 4: Custom Date Range Picker
 */
export function QuizzesWithCustomDatePicker() {
  const [quizzes, setQuizzes] = useState([]);
  const [customDateRange, setCustomDateRange] = useState({
    from: '2025-12-01',
    to: '2026-01-03',
  });

  const applyDateFilter = async () => {
    try {
      const response = await fetchTeacherQuizzes({
        created_from: new Date(customDateRange.from).toISOString(),
        created_to: new Date(customDateRange.to).toISOString(),
        limit: 10,
        offset: 0,
      });

      console.log('📅 Custom date range applied:', {
        from: customDateRange.from,
        to: customDateRange.to,
        count: response.data.length,
      });

      setQuizzes(response.data);
    } catch (error) {
      console.error('Failed to apply date filter:', error);
    }
  };

  return (
    <View>
      {/* Date Pickers would go here */}
      <Text>From: {customDateRange.from}</Text>
      <Text>To: {customDateRange.to}</Text>
      <TouchableOpacity onPress={applyDateFilter}>
        <Text>Apply Filter</Text>
      </TouchableOpacity>

      <FlatList
        data={quizzes}
        renderItem={({ item }) => <QuizCard quiz={item} />}
        keyExtractor={item => item.quiz_id}
      />
    </View>
  );
}

/**
 * EXAMPLE 5: Default Date Range (Last Month)
 * If you don't provide dates, API uses last month by default
 */
export function QuizzesWithDefaultDateRange() {
  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => {
    // No date range specified - API will use last month by default
    fetchTeacherDashboardSummary({
      limit: 10,
      offset: 0,
      // created_from and created_to are automatically set to last month
    }).then(response => {
      console.log('📊 Using default date range (last month)');
      setQuizzes(response.data);
    });
  }, []);

  return (
    <FlatList
      data={quizzes}
      renderItem={({ item }) => <QuizCard quiz={item} />}
      keyExtractor={item => item.quiz_id}
    />
  );
}

// Helper Components
function QuizCard({ quiz }: { quiz: any }) {
  return (
    <View
      style={{
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: '600' }}>{quiz.quiz_title}</Text>
      <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
        Created: {new Date(quiz.created_at).toLocaleDateString()}
      </Text>
    </View>
  );
}

function AttemptCard({ attempt }: { attempt: any }) {
  return (
    <View
      style={{
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: '600' }}>{attempt.quiz_title}</Text>
      <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
        Attempted: {new Date(attempt.attempt_date).toLocaleDateString()}
      </Text>
    </View>
  );
}

function DateRangeButton({
  title,
  active,
  onPress,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        backgroundColor: active ? '#5B21B6' : '#F3F4F6',
      }}
    >
      <Text
        style={{
          textAlign: 'center',
          fontSize: 12,
          fontWeight: '600',
          color: active ? '#FFFFFF' : '#6B7280',
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * KEY POINTS:
 * 
 * 1. DATE RANGE FILTERING:
 *    - All quiz APIs use date ranges (created_from, created_to)
 *    - Default: Last month if not specified
 *    - Can override with custom dates
 * 
 * 2. PAGINATION:
 *    - Default limit: 10 items per page
 *    - Use offset for loading more: 0, 10, 20, 30...
 *    - Check response.data.length === limit to know if hasMore
 * 
 * 3. API FUNCTIONS WITH DATE RANGE + PAGINATION:
 *    - fetchTeacherDashboardSummary({ created_from, created_to, limit, offset })
 *    - fetchTeacherQuizzes({ created_from, created_to, limit, offset })
 *    - fetchStudentQuizzes({ created_from, created_to, limit, offset })
 *    - fetchQuizAttempts({ created_from, created_to, limit, offset })
 * 
 * 4. PERFORMANCE:
 *    - Date ranges keep responses small
 *    - Pagination prevents loading too much data at once
 *    - Server does the filtering, not client
 * 
 * 5. USER EXPERIENCE:
 *    - Show current date range to user
 *    - Provide quick filters (week, month, year)
 *    - Allow custom date picker for advanced filtering
 *    - Display "Load More" button or infinite scroll
 */
