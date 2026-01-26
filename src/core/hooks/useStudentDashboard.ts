/**
 * Student Dashboard Hook - Refactored for Single API Pattern
 * 
 * Architecture:
 * - Single API call: GET /api/v1/dashboard/quizzes?view_type=student_total_details
 * - Stores response in memory
 * - Reuses data across all screens
 * - NO re-fetching
 * - NO caching libraries
 * 
 * Response Structure:
 * - subject: Contains all quiz questions
 * - attempts: Contains student attempt + submission info
 * - Status is already computed by API
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchStudentQuizzes } from '../services/dashboardApi';
import type { StudentQuiz, StudentDashboardStats, WeakTopic } from '../types/quiz.types';

export function useStudentDashboard() {
  // Single source of truth - stores API response
  const [allQuizzes, setAllQuizzes] = useState<StudentQuiz[]>([]);
  const [stats, setStats] = useState<StudentDashboardStats>({
    upcoming_assessments: 0,
    completed_assessments: 0,
    average_score: 0,
    total_practice_time: 0,
  });
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  /**
   * Calculate stats from quiz data
   * Status logic:
   * - expired + not attempted → Missed
   * - active + not attempted → Pending  
   * - active + attempted → Completed
   * - created but not started → Upcoming
   */
  const calculateStats = useCallback((quizzes: StudentQuiz[]): StudentDashboardStats => {
    const now = new Date();

    const upcoming = quizzes.filter(
      (quiz) =>
        quiz.availability_status === 'available_soon' &&
        quiz.student_status === 'pending' &&
        new Date(quiz.start_time) > now
    ).length;

    const ongoing = quizzes.filter(
      (quiz) =>
        quiz.availability_status === 'active' &&
        quiz.student_status === 'pending' &&
        new Date(quiz.start_time) > now
    ).length;

    const completed = quizzes.filter(
      (quiz) => quiz.student_status === 'completed'
    ).length;

    const scores = quizzes
      .filter((quiz) => quiz.latest_score !== null && quiz.latest_score !== undefined)
      .map((quiz) => quiz.latest_score!);

    const avgScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    return {
      upcoming_assessments: upcoming,
      completed_assessments: completed,
      average_score: Math.round(avgScore),
      total_practice_time: 0,
    };
  }, []);

  /**
   * Calculate weak topics from performance
   */
  const calculateWeakTopics = useCallback((quizzes: StudentQuiz[]): WeakTopic[] => {
    const topicScores: Record<string, { scores: number[]; count: number; lastAttempt: string }> = {};

    quizzes.forEach((quiz) => {
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

  /**
   * Load student dashboard data
   * SINGLE API CALL - called ONCE when dashboard mounts
   */
  const loadDashboard = useCallback(async () => {
    // Prevent re-fetching if data already loaded
    if (allQuizzes.length > 0 && lastFetched) {
      console.log('✅ Reusing existing student dashboard data');
      return;
    }

    console.log('📊 Loading student dashboard - SINGLE API CALL');
    setLoading(true);
    setError(null);

    try {
      // SINGLE API CALL with view_type=student_total_details to get complete quiz info
      const response = await fetchStudentQuizzes({
        view_type: 'student_total_details',
        limit: 1000,
        offset: 0,
      });

      console.log('✅ Student dashboard loaded:', {
        quizzes: response.data.length,
        total: response.meta?.total_count || 0,
      });

      // Store in memory - THIS IS THE SINGLE SOURCE OF TRUTH
      setAllQuizzes(response.data);
      setLastFetched(Date.now());

      // Calculate derived data
      const calculatedStats = calculateStats(response.data);
      setStats(calculatedStats);

      const weak = calculateWeakTopics(response.data);
      setWeakTopics(weak);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      console.error('Student dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, [allQuizzes.length, lastFetched, calculateStats, calculateWeakTopics]);

  /**
   * Refresh - clears cache and reloads
   */
  const refresh = useCallback(async () => {
    console.log('🔄 Refreshing student dashboard');
    setAllQuizzes([]);
    setLastFetched(null);
    await loadDashboard();
  }, [loadDashboard]);

  /**
   * Get quiz by ID - uses in-memory data only
   */
  const getQuizById = useCallback((quizId: number): StudentQuiz | undefined => {
    return allQuizzes.find((quiz) => quiz.quiz_id === quizId);
  }, [allQuizzes]);

  /**
   * Filter quizzes by status - uses in-memory data only
   */
  const getQuizzesByStatus = useCallback((status: string): StudentQuiz[] => {
    return allQuizzes.filter((quiz) => quiz.student_status === status);
  }, [allQuizzes]);

  // Load on mount ONCE
  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - load only once

  // Derived data from in-memory quizzes
  const upcomingQuizzes = allQuizzes
    .filter(
      (quiz) =>
        quiz.availability_status === 'active' &&
        quiz.student_status === 'pending' &&
        new Date(quiz.start_time) > new Date()
    )
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 10);

  const completedQuizzes = allQuizzes
    .filter((quiz) => quiz.student_status === 'completed')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  const missedQuizzes = allQuizzes.filter(
    (quiz) =>
      quiz.student_status === 'missed' ||
      (quiz.availability_status === 'expired' && quiz.student_status === 'pending')
  );

  const activeQuizzes = allQuizzes.filter(
    (quiz) =>
      quiz.availability_status === 'active' &&
      quiz.student_status === 'pending' &&
      new Date(quiz.start_time) <= new Date() &&
      new Date(quiz.end_time) > new Date()
  );

  const pendingQuizzes = allQuizzes.filter(
    (quiz) => quiz.student_status === 'pending'
  );

  return {
    // Data
    quizzes: allQuizzes,
    stats,
    weakTopics,
    upcomingQuizzes,
    completedQuizzes,
    missedQuizzes,
    activeQuizzes,
    pendingQuizzes,

    // State
    loading,
    error,
    lastFetched,

    // Actions
    refresh,
    getQuizById,
    getQuizzesByStatus,
  };
}
