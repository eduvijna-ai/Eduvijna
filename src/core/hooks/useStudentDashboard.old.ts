import { useState, useEffect, useCallback } from 'react';
import {
  StudentQuiz,
  StudentDashboardStats,
  WeakTopic,
  StudentDashboardQuiz,
  StudentDashboardFilters,
  parseStudentDashboardQuizzes,
  calculateStudentDashboardStats,
} from '../types/quiz.types';
import { fetchStudentQuizzes } from '../services/dashboardApi';
import { useDashboardStore } from '../store/dashboard.store';

/**
 * Student Dashboard Hook
 * 
 * Fetches and manages student quiz data using the existing API:
 * - API: GET /api/v1/dashboard/quizzes?view_type=student_details
 * - Returns all student quizzes with attempts data
 * - Client-side filtering and parsing via parseQuizzes()
 * 
 * Usage:
 * ```tsx
 * const { quizzes, stats, parseQuizzes, calculateStats } = useStudentDashboard();
 * 
 * // Get filtered quizzes (client-side)
 * const completedQuizzes = parseQuizzes({
 *   status: 'completed',
 *   classroomId: 'class_123',
 *   sortBy: 'completed_at',
 *   sortOrder: 'desc'
 * });
 * 
 * // Calculate stats from filtered quizzes
 * const filteredStats = calculateStats(completedQuizzes);
 * ```
 */

export function useStudentDashboard() {
  // Global store for quiz data - shared with Assessments screen
  const { quizzes: globalQuizzes, setQuizzes: setGlobalQuizzes, setLoading: setGlobalLoading } = useDashboardStore();
  
  const [quizzes, setQuizzes] = useState<StudentQuiz[]>([]);
  const [stats, setStats] = useState<StudentDashboardStats>({
    upcoming_assessments: 0,
    completed_assessments: 0,
    average_score: 0,
    total_practice_time: 0,
  });
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 10;

  // Calculate statistics from quizzes data
  const calculateStats = useCallback((quizzesList: StudentQuiz[]): StudentDashboardStats => {
    const now = new Date();

    const upcoming = quizzesList.filter(
      (quiz) =>
        quiz.availability_status === 'active' &&
        quiz.student_status !== 'completed' &&
        new Date(quiz.end_time) > now
    ).length;

    const completed = quizzesList.filter(
      (quiz) => quiz.student_status === 'completed'
    ).length;

    const scores = quizzesList
      .filter((quiz) => quiz.latest_score !== null && quiz.latest_score !== undefined)
      .map((quiz) => quiz.latest_score!);

    const avgScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    return {
      upcoming_assessments: upcoming,
      completed_assessments: completed,
      average_score: Math.round(avgScore),
      total_practice_time: 0, // This would need separate tracking
    };
  }, []);

  // Calculate weak topics from quiz performance
  const calculateWeakTopics = useCallback((quizzesList: StudentQuiz[]): WeakTopic[] => {
    const topicScores: Record<
      string,
      {
        scores: number[];
        count: number;
        lastAttempt: string;
      }
    > = {};

    quizzesList.forEach((quiz) => {
      if (quiz.latest_score !== null && quiz.latest_score !== undefined) {
        if (!topicScores[quiz.topic]) {
          topicScores[quiz.topic] = {
            scores: [],
            count: 0,
            lastAttempt: quiz.created_at,
          };
        }
        topicScores[quiz.topic].scores.push(quiz.latest_score);
        topicScores[quiz.topic].count += 1;
        if (new Date(quiz.created_at) > new Date(topicScores[quiz.topic].lastAttempt)) {
          topicScores[quiz.topic].lastAttempt = quiz.created_at;
        }
      }
    });

    const weak = Object.entries(topicScores)
      .map(([topic, data]) => ({
        topic,
        quiz_count: data.count,
        average_score: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
        last_attempt: data.lastAttempt,
      }))
      .filter((topic) => topic.average_score < 60)
      .sort((a, b) => a.average_score - b.average_score)
      .slice(0, 10);

    return weak;
  }, []);

  // Load initial dashboard data
  const loadDashboard = useCallback(async () => {
    console.log('📊 Loading student dashboard');
    
    // Check if we already have cached data in global store
    if (globalQuizzes.length > 0) {
      console.log('✅ Using cached data from store:', {
        quizzes: globalQuizzes.length,
      });
      
      // Use cached data immediately
      const cachedQuizzes = globalQuizzes as StudentQuiz[];
      
      // Set local state for dashboard display
      setQuizzes(cachedQuizzes.slice(0, ITEMS_PER_PAGE));
      
      // Calculate stats
      const calculatedStats = calculateStats(cachedQuizzes);
      setStats(calculatedStats);
      
      // Calculate weak topics
      const weak = calculateWeakTopics(cachedQuizzes);
      setWeakTopics(weak);
      
      // Setup pagination
      setHasMore(cachedQuizzes.length > ITEMS_PER_PAGE);
      setPage(1);
      setLoading(false);
      setGlobalLoading(false);
      
      return; // Don't fetch from API
    }
    
    // No cached data - fetch from API
    console.log('📡 Fetching fresh data from API');
    setLoading(true);
    setGlobalLoading(true);
    setError(null);
    setPage(0);

    try {
      // Fetch ALL quizzes with view_type=student_details
      const response = await fetchStudentQuizzes({
        view_type: 'student_details',
        limit: 1000, // Get all quizzes
        offset: 0,
      });

      console.log('✅Student all quizzes loaded:', response.data.length);
      console.log('Total count:', response.meta?.total_count || response.data.length);
      
      // Debug: Log first quiz to verify data structure
      if (response.data.length > 0) {
        console.log('📋 Sample quiz data:', {
          quiz_id: response.data[0].quiz_id,
          quiz_name: response.data[0].quiz_name,
          topic: response.data[0].topic,
          status: response.data[0].student_status,
          score: response.data[0].score,
        });
      }
      
      // Store in global store for use in Assessments screen
      setGlobalQuizzes(
        response.data,
        response.meta?.total_count || response.data.length
      );

      // Set local state for dashboard display (first 10 items)
      setQuizzes(response.data.slice(0, ITEMS_PER_PAGE));

      // Calculate stats
      const calculatedStats = calculateStats(response.data);
      setStats(calculatedStats);

      // Calculate weak topics
      const weak = calculateWeakTopics(response.data);
      setWeakTopics(weak);

      // Check if more data available for pagination
      setHasMore(response.data.length > ITEMS_PER_PAGE);
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  }, [globalQuizzes, setGlobalQuizzes, setGlobalLoading, calculateStats, calculateWeakTopics]);

  // Load more quizzes (pagination) - from already fetched global data
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading) {
      console.log('⏸️ Load more skipped:', { hasMore, loadingMore, loading });
      return;
    }

    console.log(`📥 Loading more quizzes - Page ${page + 1}`);
    setLoadingMore(true);

    try {
      const startIndex = page * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      
      // Get next page from global store (already fetched)
      const nextPageQuizzes = (globalQuizzes as StudentQuiz[]).slice(startIndex, endIndex);

      console.log(`✅ Loaded ${nextPageQuizzes.length} more quizzes from cache`);

      // Append to display list
      setQuizzes(prev => [...prev, ...nextPageQuizzes]);
      setHasMore(endIndex < (globalQuizzes as StudentQuiz[]).length);
      setPage(prev => prev + 1);
    } catch (err) {
      console.error('Error loading more quizzes:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, loading, page, globalQuizzes]);

  // Load on mount only
  useEffect(() => {
    loadDashboard();
  }, []); // Empty deps - only run once on mount

  // Refresh dashboard (reload from start)
  const refresh = useCallback(() => {
    console.log('🔄 Refreshing student dashboard');
    loadDashboard();
  }, [loadDashboard]);

  // Get upcoming quizzes
  const upcomingQuizzes = quizzes
    .filter(
      (quiz) =>
        quiz.availability_status === 'active' &&
        quiz.student_status !== 'completed' &&
        new Date(quiz.end_time) > new Date()
    )
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 10);

  // Get completed quizzes
  const completedQuizzes = quizzes
    .filter((quiz) => quiz.student_status === 'completed')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  // Get missed quizzes
  const missedQuizzes = quizzes.filter(
    (quiz) =>
      quiz.student_status === 'missed' ||
      (quiz.availability_status === 'expired' && quiz.student_status === 'pending')
  );

  // Get active quizzes (can take now)
  const activeQuizzes = quizzes.filter(
    (quiz) =>
      quiz.availability_status === 'active' &&
      quiz.student_status === 'pending' &&
      new Date(quiz.start_time) <= new Date() &&
      new Date(quiz.end_time) > new Date()
  );

  return {
    // Data
    quizzes,
    stats,
    weakTopics,
    upcomingQuizzes,
    completedQuizzes,
    missedQuizzes,
    activeQuizzes,

    // State
    loading,
    loadingMore,
    error,
    hasMore,

    // Actions
    refresh,
    loadMore,
    
    // New: Client-side parsing utilities
    // Use these for filtered/sorted views without backend changes
    parseQuizzes: (filters?: StudentDashboardFilters) => {
      return parseStudentDashboardQuizzes(
        (globalQuizzes as any[]) || [],
        filters || {}
      );
    },
    
    calculateStats: (parsedQuizzes: StudentDashboardQuiz[]) => {
      return calculateStudentDashboardStats(parsedQuizzes);
    },
  };
}
