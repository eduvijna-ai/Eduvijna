/**
 * useAnalytics Hook
 * Provides analytics data and functionality
 * Bridge between UI and core logic - CAN import from api and domain
 */

import { useState, useEffect, useCallback } from 'react';
import { useUserStore } from '../store/user.store';
import {
  fetchAnalytics,
  fetchWeakTopics,
  fetchStudentPerformance,
  fetchAssessmentStatistics,
  fetchTopicAnalysis,
} from '../api/analytics.api';
import {
  identifyWeakTopics,
  getTopPerformers,
  getStudentsNeedingAttention,
  calculateAverage,
  getAnalyticsSummary,
  getPercentageColor,
} from '../domain/analytics.logic';
import { canViewAnalytics, canViewAllStudentsAnalytics } from '../domain/permissions.logic';
import type {
  AnalyticsData,
  AnalyticsFilters,
  WeakTopic,
  StudentPerformanceData,
  AssessmentStatistics,
  TopicAnalysis,
  User,
} from '../types';

/**
 * Hook to get current user (abstraction over store)
 */
export function useCurrentUser(): User | null {
  return useUserStore((state) => state.user);
}

/**
 * Hook to get percentage color helper
 */
export function usePercentageColor() {
  return getPercentageColor;
}

interface UseAnalyticsReturn {
  data: AnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  refresh: (filters?: AnalyticsFilters) => Promise<void>;
}

/**
 * Main hook for fetching analytics data
 */
export function useAnalytics(initialFilters?: AnalyticsFilters): UseAnalyticsReturn {
  const user = useUserStore((state) => state.user);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters | undefined>(initialFilters);

  const fetchData = useCallback(async (newFilters?: AnalyticsFilters) => {
    if (!user) {
      setError('User not authenticated');
      setIsLoading(false);
      return;
    }

    if (!canViewAnalytics(user)) {
      setError('Permission denied');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const filterParams = newFilters || filters || {
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        dateTo: new Date().toISOString(),
      };

      const analyticsData = await fetchAnalytics(user.id, filterParams);
      setData(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async (newFilters?: AnalyticsFilters) => {
    if (newFilters) {
      setFilters(newFilters);
    }
    await fetchData(newFilters);
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for fetching weak topics (student-specific)
 */
export function useWeakTopics() {
  const user = useUserStore((state) => state.user);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) {
      setError('User not authenticated');
      setIsLoading(false);
      return;
    }

    if (user.role !== 'student') {
      setError('This feature is only available for students');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const topics = await fetchWeakTopics(user.id);
      setWeakTopics(topics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weak topics');
      setWeakTopics([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    weakTopics,
    isLoading,
    error,
    refresh: fetchData,
  };
}

/**
 * Hook for fetching student performance data (teacher-specific)
 */
export function useStudentPerformance(filters?: AnalyticsFilters) {
  const user = useUserStore((state) => state.user);
  const [students, setStudents] = useState<StudentPerformanceData[]>([]);
  const [topPerformers, setTopPerformers] = useState<StudentPerformanceData[]>([]);
  const [needsAttention, setNeedsAttention] = useState<StudentPerformanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) {
      setError('User not authenticated');
      setIsLoading(false);
      return;
    }

    if (!canViewAllStudentsAnalytics(user)) {
      setError('Permission denied - instructor role required');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const performance = await fetchStudentPerformance(user.id, filters);
      setStudents(performance);
      
      // Calculate derived data using domain logic
      setTopPerformers(getTopPerformers(performance));
      setNeedsAttention(getStudentsNeedingAttention(performance));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch student performance');
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    students,
    topPerformers,
    needsAttention,
    isLoading,
    error,
    refresh: fetchData,
  };
}

/**
 * Hook for fetching assessment statistics (teacher-specific)
 */
export function useAssessmentStatistics(filters?: AnalyticsFilters) {
  const user = useUserStore((state) => state.user);
  const [statistics, setStatistics] = useState<AssessmentStatistics[]>([]);
  const [summary, setSummary] = useState({
    totalAssessments: 0,
    totalAttempts: 0,
    overallAverageScore: 0,
    overallPassRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) {
      setError('User not authenticated');
      setIsLoading(false);
      return;
    }

    if (!canViewAllStudentsAnalytics(user)) {
      setError('Permission denied - instructor role required');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const stats = await fetchAssessmentStatistics(user.id, filters);
      setStatistics(stats);
      
      // Calculate summary using domain logic
      const summaryData = getAnalyticsSummary(stats);
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch assessment statistics');
      setStatistics([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    statistics,
    summary,
    isLoading,
    error,
    refresh: fetchData,
  };
}

/**
 * Hook for fetching topic analysis
 */
export function useTopicAnalysis(filters?: AnalyticsFilters) {
  const user = useUserStore((state) => state.user);
  const [topics, setTopics] = useState<TopicAnalysis[]>([]);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [averageScore, setAverageScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) {
      setError('User not authenticated');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const topicData = await fetchTopicAnalysis(user.id, filters);
      setTopics(topicData);
      
      // Calculate derived data using domain logic
      const weak = identifyWeakTopics(topicData);
      setWeakTopics(weak);
      
      const avg = calculateAverage(topicData.map(t => t.averageScore));
      setAverageScore(avg);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch topic analysis');
      setTopics([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    topics,
    weakTopics,
    averageScore,
    isLoading,
    error,
    refresh: fetchData,
  };
}
