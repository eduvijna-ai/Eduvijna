import { useState, useEffect, useCallback } from 'react';
import {
  TeacherQuiz,
  TeacherDashboardStats,
  WeakStudent,
  Classroom,
  QuizAttempt,
} from '../types/quiz.types';
import {
  fetchTeacherQuizzes,
  fetchTeacherClassrooms,
} from '../services/dashboardApi';
import { useDashboardStore } from '../store/dashboard.store';
import { extractUniqueStudents } from '../utils/studentUtils';

export function useTeacherDashboard() {
  // Global store for quiz data - shared with Assessments screen and other screens
  const { 
    quizzes: globalQuizzes, 
    classrooms: globalClassrooms,
    totalCount, 
    setQuizzes: setGlobalQuizzes, 
    setClassrooms: setGlobalClassrooms,
    setLoading: setGlobalLoading 
  } = useDashboardStore();
  
  const [quizzes, setQuizzes] = useState<TeacherQuiz[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [stats, setStats] = useState<TeacherDashboardStats>({
    total_students: 0,
    total_classes: 0,
    total_assessments: 0,
    active_assessments: 0,
    pending_reviews: 0,
  });
  const [weakStudents, setWeakStudents] = useState<WeakStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 10;

  // Calculate statistics from quizzes data
  const calculateStats = useCallback((
    quizzesList: TeacherQuiz[],
    classroomsList: Classroom[],
    totalStudentsCount: number
  ): TeacherDashboardStats => {
    console.log('=== calculateStats Debug ===');
    console.log('Total students from API:', totalStudentsCount);
    console.log('Total classes:', classroomsList.length);

    const activeAssessments = quizzesList.filter(
      (quiz) => quiz.availability_status === 'active'
    ).length;

    const pendingReviews = quizzesList.reduce(
      (sum, quiz) => sum + (quiz.pending_count || 0),
      0
    );

    const result = {
      total_students: totalStudentsCount,
      total_classes: classroomsList.length,
      total_assessments: quizzesList.length,
      active_assessments: activeAssessments,
      pending_reviews: pendingReviews,
    };
    
    console.log('Stats result:', result);
    return result;
  }, []);

  // Calculate weak students from quiz attempts
  const calculateWeakStudents = useCallback((quizzesList: TeacherQuiz[]): WeakStudent[] => {
    const studentScores: Record<
      number,
      {
        student: any;
        scores: number[];
        topics: Set<string>;
      }
    > = {};

    quizzesList.forEach((quiz) => {
      if (quiz.attempts) {
        try {
          const attempts: QuizAttempt[] = JSON.parse(quiz.attempts);
          attempts.forEach((attempt) => {
            if (attempt.score !== null && attempt.score !== undefined) {
              if (!studentScores[attempt.student_id]) {
                studentScores[attempt.student_id] = {
                  student: attempt,
                  scores: [],
                  topics: new Set(),
                };
              }
              studentScores[attempt.student_id].scores.push(attempt.score);
              if (attempt.score < 60) {
                studentScores[attempt.student_id].topics.add(quiz.topic);
              }
            }
          });
        } catch (e) {
          console.error('Error parsing attempts:', e);
        }
      }
    });

    const weak = Object.values(studentScores)
      .map((data) => ({
        student_id: data.student.student_id,
        student_fullname: data.student.student_fullname,
        student_username: data.student.student_username,
        avatar_url: data.student.avatar_url,
        average_score: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
        completed_quizzes: data.scores.length,
        weak_topics: Array.from(data.topics),
      }))
      .filter((student) => student.average_score < 60)
      .sort((a, b) => a.average_score - b.average_score)
      .slice(0, 10);

    return weak;
  }, []);

  // Load initial dashboard data
  const loadDashboard = useCallback(async () => {
    console.log('📊 Loading teacher dashboard');
    
    // Check if we already have cached data in global store
    if (globalQuizzes.length > 0 && globalClassrooms.length > 0) {
      console.log('✅ Using cached data from store:', {
        quizzes: globalQuizzes.length,
        classrooms: globalClassrooms.length,
      });
      
      // Use cached data immediately
      const cachedQuizzes = globalQuizzes as TeacherQuiz[];
      const cachedClassrooms = globalClassrooms as Classroom[];
      
      // Extract unique students from classrooms
      const { students: uniqueStudents, totalCount: totalStudentsCount } = extractUniqueStudents(cachedClassrooms);
      
      // Set local state for dashboard display
      setQuizzes(cachedQuizzes.slice(0, ITEMS_PER_PAGE));
      setClassrooms(cachedClassrooms);
      setAllStudents(uniqueStudents);
      
      // Calculate stats
      const calculatedStats = calculateStats(cachedQuizzes, cachedClassrooms, totalStudentsCount);
      setStats(calculatedStats);
      
      // Calculate weak students
      const weak = calculateWeakStudents(cachedQuizzes);
      setWeakStudents(weak);
      
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
      // Fetch ALL quizzes with view_type=summary (no pagination for initial load)
      const [quizzesResponse, classroomsResponse] = await Promise.all([
        fetchTeacherQuizzes({ view_type: 'summary', limit: 1000, offset: 0 }), // Get all quizzes
        fetchTeacherClassrooms(), // Returns classrooms with student lists in 'attempts' field
      ]);

      console.log('✅ All quizzes loaded:', quizzesResponse.data.length);
      console.log('Total count:', quizzesResponse.pagination?.total || quizzesResponse.data.length);
      
      // Extract unique students from classrooms using common utility
      const { students: uniqueStudents, totalCount: totalStudentsCount } = extractUniqueStudents(classroomsResponse.data);
      
      console.log('✅ Unique students across all classrooms:', totalStudentsCount);
      console.log(`📊 Total classrooms: ${classroomsResponse.data.length}`);

      // Store in global store for use in Assessments, ClassesList, and other screens
      setGlobalQuizzes(
        quizzesResponse.data,
        quizzesResponse.pagination?.total || quizzesResponse.data.length
      );
      setGlobalClassrooms(classroomsResponse.data as unknown as Classroom[]);

      // Set local state for dashboard display (first 10 items)
      setQuizzes(quizzesResponse.data.slice(0, ITEMS_PER_PAGE));
      setClassrooms(classroomsResponse.data as unknown as Classroom[]);
      
      // Store unique students data
      setAllStudents(uniqueStudents);

      // Calculate stats
      const calculatedStats = calculateStats(
        quizzesResponse.data,
        classroomsResponse.data as unknown as Classroom[],
        totalStudentsCount
      );
      setStats(calculatedStats);

      // Calculate weak students
      const weak = calculateWeakStudents(quizzesResponse.data);
      setWeakStudents(weak);

      // Check if more data available for pagination
      setHasMore(quizzesResponse.data.length > ITEMS_PER_PAGE);
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  }, [globalQuizzes, globalClassrooms, setGlobalQuizzes, setGlobalClassrooms, setGlobalLoading, calculateStats, calculateWeakStudents]);

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
      const nextPageQuizzes = (globalQuizzes as TeacherQuiz[]).slice(startIndex, endIndex);

      console.log(`✅ Loaded ${nextPageQuizzes.length} more quizzes from cache`);

      // Append to display list
      setQuizzes(prev => [...prev, ...nextPageQuizzes]);
      setHasMore(endIndex < (globalQuizzes as TeacherQuiz[]).length);
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
    console.log('🔄 Refreshing dashboard');
    loadDashboard();
  }, [loadDashboard]);

  // Get recent assessments
  const recentAssessments = quizzes
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  // Get active assessments
  const activeAssessments = quizzes.filter(
    (quiz) => quiz.availability_status === 'active'
  );

  // Get quizzes by classroom
  const getQuizzesByClassroom = useCallback(
    (classroomId: string) => {
      return quizzes.filter((quiz) => quiz.classroom_id === classroomId);
    },
    [quizzes]
  );

  return {
    // Data
    quizzes,
    classrooms,
    allStudents,
    stats,
    weakStudents,
    recentAssessments,
    activeAssessments,

    // State
    loading,
    loadingMore,
    error,
    hasMore,

    // Actions
    refresh,
    loadMore,
    getQuizzesByClassroom,
  };
}
