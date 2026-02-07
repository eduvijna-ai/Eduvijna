/**
 * Teacher Dashboard Store - Singleton Pattern
 * 
 * Ensures dashboard data is loaded only ONCE and shared across all screens
 * Prevents redundant API calls when navigating between screens
 */

import { create } from 'zustand';
import {
  fetchTeacherDashboardSummary,
  fetchTeacherQuizzes,
} from '../services/dashboardApi';
import type {
  TeacherQuiz,
  TeacherDashboardStats,
  WeakStudent,
  Classroom,
  Instructor,
} from '../types/quiz.types';

export interface Student {
  student_id: number;
  student_fullname: string;
  student_username: string;
  avatar_url?: string;
  quizzes_completed: number;
  average_score: number;
  total_quizzes: number;
}

interface TeacherDashboardState {
  // Data
  allQuizzes: TeacherQuiz[];
  classrooms: Classroom[];
  stats: TeacherDashboardStats;
  weakStudents: WeakStudent[];
  uniqueStudents: Student[];
  
  // State
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  isInitialized: boolean;
  
  // Student lists cache
  studentListsCache: Record<string, any[]>;
  loadingStudents: Record<string, boolean>;
  
  // Actions
  loadDashboard: () => Promise<void>;
  refresh: () => Promise<void>;
  loadStudentListForClass: (classroomId: string) => Promise<any[] | null>;
  reset: () => void;
}

const initialStats: TeacherDashboardStats = {
  total_students: 0,
  total_classes: 0,
  total_assessments: 0,
  active_assessments: 0,
  pending_reviews: 0,
};

/**
 * Calculate stats from quiz data
 */
const calculateStats = (
  quizzes: TeacherQuiz[],
  classroomsList: Classroom[]
): TeacherDashboardStats => {
  const activeAssessments = quizzes.filter(
    (quiz) => quiz.availability_status === 'active'
  ).length;

  const pendingReviews = quizzes.reduce(
    (sum, quiz) => sum + (quiz.pending_count || 0),
    0
  );

  // Calculate UNIQUE students from quiz attempts (avoid duplicates)
  const uniqueStudentIds = new Set<number>();
  quizzes.forEach((quiz) => {
    if (quiz.attempts) {
      try {
        const attempts = typeof quiz.attempts === 'string' 
          ? JSON.parse(quiz.attempts) 
          : quiz.attempts;
        
        if (Array.isArray(attempts)) {
          attempts.forEach((attempt: any) => {
            if (attempt.student_id) {
              uniqueStudentIds.add(attempt.student_id);
            }
          });
        }
      } catch (e) {
        console.error('Error parsing attempts for student count:', e);
      }
    }
  });

  const totalStudents = uniqueStudentIds.size;

  return {
    total_students: totalStudents,
    total_classes: classroomsList.length,
    total_assessments: quizzes.length,
    active_assessments: activeAssessments,
    pending_reviews: pendingReviews,
  };
};

/**
 * Calculate weak students from quiz attempts
 */
const calculateWeakStudents = (quizzes: TeacherQuiz[]): WeakStudent[] => {
  const studentPerformance = new Map<number, {
    student_id: number;
    student_fullname: string;
    student_username: string;
    total_score: number;
    attempt_count: number;
  }>();

  quizzes.forEach((quiz) => {
    if (quiz.attempts) {
      try {
        const attempts = typeof quiz.attempts === 'string' 
          ? JSON.parse(quiz.attempts) 
          : quiz.attempts;
        
        if (Array.isArray(attempts)) {
          attempts.forEach((attempt: any) => {
            const studentId = attempt.student_id;
            const score = attempt.score || 0;

            if (!studentPerformance.has(studentId)) {
              studentPerformance.set(studentId, {
                student_id: studentId,
                student_fullname: attempt.student_fullname || 'Unknown',
                student_username: attempt.student_username || '',
                total_score: 0,
                attempt_count: 0,
              });
            }

            const perf = studentPerformance.get(studentId)!;
            perf.total_score += score;
            perf.attempt_count += 1;
          });
        }
      } catch (e) {
        console.error('Error parsing attempts:', e);
      }
    }
  });

  const weakStudents: WeakStudent[] = [];
  studentPerformance.forEach((perf) => {
    const averageScore = perf.attempt_count > 0 
      ? perf.total_score / perf.attempt_count 
      : 0;

    // Show students with 0-35% average score as weak students
    if (averageScore >= 0 && averageScore <= 35 && perf.attempt_count >= 1) {
      weakStudents.push({
        student_id: perf.student_id,
        student_fullname: perf.student_fullname,
        student_username: perf.student_username,
        avatar_url: null,
        average_score: Math.round(averageScore),
        completed_quizzes: perf.attempt_count,
        weak_topics: [],
      });
    }
  });

  return weakStudents
    .sort((a, b) => a.average_score - b.average_score)
    .slice(0, 10);
};

/**
 * Calculate unique students list from quiz attempts
 */
const calculateUniqueStudents = (quizzes: TeacherQuiz[]): Student[] => {
  const studentPerformance = new Map<number, {
    student_id: number;
    student_fullname: string;
    student_username: string;
    avatar_url?: string;
    total_score: number;
    attempt_count: number;
  }>();

  quizzes.forEach((quiz) => {
    if (quiz.attempts) {
      try {
        const attempts = typeof quiz.attempts === 'string' 
          ? JSON.parse(quiz.attempts) 
          : quiz.attempts;
        
        if (Array.isArray(attempts)) {
          attempts.forEach((attempt: any) => {
            const studentId = attempt.student_id;
            const score = attempt.score || 0;

            if (!studentPerformance.has(studentId)) {
              studentPerformance.set(studentId, {
                student_id: studentId,
                student_fullname: attempt.student_fullname || 'Unknown',
                student_username: attempt.student_username || '',
                avatar_url: attempt.avatar_url,
                total_score: 0,
                attempt_count: 0,
              });
            }

            const perf = studentPerformance.get(studentId)!;
            perf.total_score += score;
            perf.attempt_count += 1;
          });
        }
      } catch (e) {
        console.error('Error parsing attempts for unique students:', e);
      }
    }
  });

  const students: Student[] = [];
  studentPerformance.forEach((perf) => {
    const averageScore = perf.attempt_count > 0 
      ? perf.total_score / perf.attempt_count 
      : 0;

    students.push({
      student_id: perf.student_id,
      student_fullname: perf.student_fullname,
      student_username: perf.student_username,
      avatar_url: perf.avatar_url,
      quizzes_completed: perf.attempt_count,
      average_score: Math.round(averageScore),
      total_quizzes: perf.attempt_count,
    });
  });

  return students.sort((a, b) => a.student_fullname.localeCompare(b.student_fullname));
};

export const useTeacherDashboardStore = create<TeacherDashboardState>((set, get) => ({
  // Initial state
  allQuizzes: [],
  classrooms: [],
  stats: initialStats,
  weakStudents: [],
  uniqueStudents: [],
  loading: false,
  error: null,
  lastFetched: null,
  isInitialized: false,
  studentListsCache: {},
  loadingStudents: {},

  /**
   * Load dashboard data - ONLY if not already loaded
   */
  loadDashboard: async () => {
    const state = get();
    
    // Skip if already loaded (singleton pattern)
    if (state.isInitialized && state.allQuizzes.length > 0) {
      return;
    }

    // Skip if currently loading
    if (state.loading) {
      return;
    }

    set({ loading: true, error: null });

    try {
      // SINGLE API CALL with view_type=summary
      const response = await fetchTeacherDashboardSummary({
        view_type: 'summary',
        limit: 1000,
        offset: 0,
      });

      // console.log('✅ Teacher dashboard loaded:', {
      //   quizzes: response.data.length,
      //   total: response.meta?.total_count || 0,
      //   sampleQuiz: response.data[0],
      // });

      // Extract classrooms
      const uniqueClassrooms = new Map<string, Classroom>();
      response.data.forEach((quiz) => {
        if (quiz.classroom_id && quiz.classroom_name) {
          let instructorData: Instructor;
          if (quiz.instructor) {
            try {
              instructorData = typeof quiz.instructor === 'string' 
                ? JSON.parse(quiz.instructor) 
                : quiz.instructor;
            } catch {
              instructorData = {
                instructor_id: '0',
                instructor_username: 'unknown',
                instructor_fullname: 'Unknown Instructor',
                instructor_avatar_url: null,
              };
            }
          } else {
            instructorData = {
              instructor_id: '0',
              instructor_username: 'unknown',
              instructor_fullname: 'Unknown Instructor',
              instructor_avatar_url: null,
            };
          }

          uniqueClassrooms.set(quiz.classroom_id, {
            classroom_id: quiz.classroom_id,
            classroom_name: quiz.classroom_name,
            instructor: instructorData,
            total_students: quiz.total_students || 0,
          });
        }
      });

      const classroomsList = Array.from(uniqueClassrooms.values());
      
      const calculatedStats = calculateStats(response.data, classroomsList);
      
      // Fetch all students data for weak students calculation
      let weak: WeakStudent[] = [];
      try {
        const allStudentsResponse = await fetchTeacherDashboardSummary({
          view_type: 'all_students' as any,
          limit: 1000,
        });
        weak = calculateWeakStudents(allStudentsResponse.data);
      } catch (error) {
        console.error('Error fetching all students data:', error);
        // Fallback to calculating from quiz attempts
        weak = calculateWeakStudents(response.data);
      }
      
      const students = calculateUniqueStudents(response.data);

      set({
        allQuizzes: response.data,
        classrooms: classroomsList,
        stats: calculatedStats,
        weakStudents: weak,
        uniqueStudents: students,
        lastFetched: Date.now(),
        isInitialized: true,
        loading: false,
        error: null,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard';
      console.error('❌ Teacher dashboard error:', errorMessage, err);
      set({
        error: errorMessage,
        loading: false,
        isInitialized: false,
      });
    }
  },

  /**
   * Refresh - clears cache and reloads
   */
  refresh: async () => {
    set({ 
      allQuizzes: [],
      isInitialized: false,
      lastFetched: null,
      studentListsCache: {},
    });
    await get().loadDashboard();
  },

  /**
   * Load student lists for a specific classroom - ON DEMAND
   */
  loadStudentListForClass: async (classroomId: string) => {
    const state = get();

    if (state.studentListsCache[classroomId]) {
      console.log(`✅ Reusing cached student list for classroom ${classroomId}`);
      return state.studentListsCache[classroomId];
    }

    if (state.loadingStudents[classroomId]) {
      console.log(`⏳ Student list for classroom ${classroomId} already loading`);
      return null;
    }

    console.log(`📡 Loading student list for classroom ${classroomId} - ON DEMAND`);
    set({ 
      loadingStudents: { ...state.loadingStudents, [classroomId]: true }
    });

    try {
      const response = await fetchTeacherQuizzes({
        view_type: 'class_wise_students',
        classroom_id: classroomId,
        limit: 1000,
        offset: 0,
      });

      console.log(`✅ Student list loaded for classroom ${classroomId}:`, response.data.length);

      const students: any[] = [];
      response.data.forEach((quiz) => {
        if (quiz.attempts) {
          try {
            const attempts = typeof quiz.attempts === 'string' 
              ? JSON.parse(quiz.attempts) 
              : quiz.attempts;
            
            attempts.forEach((attempt: any) => {
              if (!students.find((s) => s.id === attempt.student_id)) {
                students.push({
                  id: attempt.student_id,
                  username: attempt.student_username,
                  full_name: attempt.student_fullname,
                  avatar_url: attempt.avatar_url,
                });
              }
            });
          } catch (e) {
            console.error('Error parsing attempts:', e);
          }
        }
      });

      set({
        studentListsCache: { 
          ...state.studentListsCache, 
          [classroomId]: students 
        },
        loadingStudents: { 
          ...state.loadingStudents, 
          [classroomId]: false 
        }
      });

      return students;

    } catch (err) {
      console.error(`Failed to load students for classroom ${classroomId}:`, err);
      set({
        loadingStudents: { 
          ...state.loadingStudents, 
          [classroomId]: false 
        }
      });
      return null;
    }
  },

  /**
   * Reset store (for logout)
   */
  reset: () => {
    set({
      allQuizzes: [],
      classrooms: [],
      stats: initialStats,
      weakStudents: [],
      uniqueStudents: [],
      loading: false,
      error: null,
      lastFetched: null,
      isInitialized: false,
      studentListsCache: {},
      loadingStudents: {},
    });
  },
}));
