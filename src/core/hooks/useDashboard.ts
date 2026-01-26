/**
 * useDashboard Hook
 * Provides dashboard data and functionality
 * Bridge between UI and core logic - CAN import from api and domain
 */

import { useState, useEffect, useCallback } from 'react';
import { useUserStore } from '../store/user.store';
import { fetchTeacherDashboardStats, fetchStudentDashboardStats } from '../api/analytics.api';
import type { TeacherDashboardStats, StudentDashboardStats, UserProfile } from '../types';

/**
 * Hook to get current user (abstraction over store)
 */
export function useCurrentUser(): UserProfile | null {
  return useUserStore((state) => state.user);
}

interface UseDashboardReturn {
  data: TeacherDashboardStats | StudentDashboardStats | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and manage dashboard data
 * Automatically detects user role and fetches appropriate data
 */
export function useDashboard(): UseDashboardReturn {
  const user = useUserStore((state) => state.user);
  const [data, setData] = useState<TeacherDashboardStats | StudentDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!user) {
      setError('User not authenticated');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (user.role === 'instructor') {
        const stats = await fetchTeacherDashboardStats(user.id);
        setData(stats);
      } else {
        const stats = await fetchStudentDashboardStats(user.id);
        setData(stats);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    data,
    isLoading,
    error,
    refresh: fetchDashboard,
  };
}

/**
 * Hook for teacher-specific dashboard data
 */
export function useTeacherDashboard(): UseDashboardReturn & {
  data: TeacherDashboardStats | null;
} {
  const user = useUserStore((state) => state.user);
  const [data, setData] = useState<TeacherDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!user || user.role !== 'instructor') {
      setError('Access denied - instructor role required');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const stats = await fetchTeacherDashboardStats(user.id);
      setData(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    data,
    isLoading,
    error,
    refresh: fetchDashboard,
  };
}

/**
 * Hook for student-specific dashboard data
 */
export function useStudentDashboard(): UseDashboardReturn & {
  data: StudentDashboardStats | null;
} {
  const user = useUserStore((state) => state.user);
  const [data, setData] = useState<StudentDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!user || user.role !== 'student') {
      setError('Access denied - student role required');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const stats = await fetchStudentDashboardStats(user.id);
      setData(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    data,
    isLoading,
    error,
    refresh: fetchDashboard,
  };
}
