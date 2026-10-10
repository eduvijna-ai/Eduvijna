/**
 * Centralized Data Loader
 * 
 * Loads all necessary data once after user login and stores it in global stores.
 * All screens reuse this cached data instead of making duplicate API calls.
 * 
 * Benefits:
 * - Single source of truth
 * - No duplicate API calls
 * - Faster screen navigation
 * - Prevents 429 rate limit errors
 */

import { useUserStore } from '../store/user.store';
import { useDashboardStore } from '../store/dashboard.store';
import { resetStudentAssignmentDashboardStore } from '../store/studentAssignmentDashboard.store';
import {
  fetchTeacherDashboardSummary,
  fetchTeacherClassrooms,
  fetchStudentQuizzes,
} from './dashboardApi';
import {
  fetchClasses,
  fetchAllSubjects,
  fetchLevels,
  clearDropdownCache,
} from './dropdown';

interface DataLoadingState {
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  lastLoadedAt: number | null;
}

// Global state to track data loading
let loadingState: DataLoadingState = {
  isLoading: false,
  isLoaded: false,
  error: null,
  lastLoadedAt: null,
};

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * Check if cached data is still valid
 */
export function isCacheValid(): boolean {
  if (!loadingState.lastLoadedAt) return false;
  const elapsed = Date.now() - loadingState.lastLoadedAt;
  return elapsed < CACHE_DURATION;
}

/**
 * Get current loading state
 */
export function getLoadingState(): DataLoadingState {
  return { ...loadingState };
}

/**
 * Load all necessary data for a teacher
 */
async function loadTeacherData(): Promise<void> {
  console.log('📚 Loading teacher data...');
  
  const dashboardStore = useDashboardStore.getState();
  
  try {
    // Load dashboard summary (includes quizzes, stats, etc.)
    const summaryResponse = await fetchTeacherDashboardSummary({
      view_type: 'summary',
      limit: 1000,
      offset: 0,
    });
    
    console.log('✅ Teacher dashboard summary loaded:', {
      quizzesCount: summaryResponse.data.length,
      total: summaryResponse.meta.total_count,
    });
    
    // Store in global state
    dashboardStore.setQuizzes(summaryResponse.data, summaryResponse.meta.total_count);
    
    // Load classrooms
    const classroomsResponse = await fetchTeacherClassrooms();
    console.log('✅ Teacher classrooms loaded:', classroomsResponse.data.length);
    dashboardStore.setClassrooms(classroomsResponse.data);
    
    // Load dropdown data in parallel
    await Promise.allSettled([
      fetchClasses(),
      fetchAllSubjects(),
      fetchLevels(),
    ]);
    
    console.log('✅ Dropdown data loaded');
    
  } catch (error) {
    console.error('❌ Failed to load teacher data:', error);
    throw error;
  }
}

/**
 * Load all necessary data for a student
 */
async function loadStudentData(): Promise<void> {
  console.log('📚 Loading student data...');
  
  const dashboardStore = useDashboardStore.getState();
  
  try {
    // Load student quizzes with complete details for statistics and analytics
    const quizzesResponse = await fetchStudentQuizzes({
      view_type: 'student_total_details',
      limit: 1000,
      offset: 0,
    });
    
    console.log('✅ Student quizzes loaded:', {
      quizzesCount: quizzesResponse.data.length,
      total: quizzesResponse.meta.total_count,
    });
    
    // Store in global state
    dashboardStore.setQuizzes(quizzesResponse.data, quizzesResponse.meta.total_count);
    
    // Load dropdown data (for creating practice quizzes)
    await Promise.allSettled([
      fetchAllSubjects(),
      fetchLevels(),
    ]);
    
    console.log('✅ Dropdown data loaded');
    
  } catch (error) {
    console.error('❌ Failed to load student data:', error);
    throw error;
  }
}

/**
 * Load all necessary data based on user role
 * Called once after successful login
 * 
 * @param forceRefresh - Force reload even if cache is valid
 */
export async function loadAllData(forceRefresh: boolean = false): Promise<void> {
  // Check if already loading
  if (loadingState.isLoading) {
    console.log('⏳ Data loading already in progress, skipping...');
    return;
  }
  
  // Check if cache is still valid
  if (!forceRefresh && loadingState.isLoaded && isCacheValid()) {
    console.log('✅ Using cached data (still valid)');
    return;
  }
  
  // Get user from store
  const userStore = useUserStore.getState();
  const user = userStore.user;
  
  if (!user) {
    console.warn('⚠️ No user found, skipping data load');
    return;
  }
  
  console.log('═══════════════════════════════════════════════');
  console.log('🚀 LOADING ALL DATA FOR USER');
  console.log(`👤 User: ${user.username || user.email}`);
  console.log(`🎭 Role: ${user.role}`);
  console.log(`🔄 Force Refresh: ${forceRefresh}`);
  console.log('═══════════════════════════════════════════════');
  
  // Mark as loading
  loadingState.isLoading = true;
  loadingState.error = null;
  
  const dashboardStore = useDashboardStore.getState();
  dashboardStore.setLoading(true);
  
  try {
    // Load data based on role
    if (user.role === 'instructor') {
      await loadTeacherData();
    } else if (user.role === 'student') {
      await loadStudentData();
    } else {
      console.warn('⚠️ Unknown role:', user.role);
    }
    
    // Mark as loaded
    loadingState.isLoading = false;
    loadingState.isLoaded = true;
    loadingState.lastLoadedAt = Date.now();
    
    dashboardStore.setLoading(false);
    
    console.log('═══════════════════════════════════════════════');
    console.log('✅ ALL DATA LOADED SUCCESSFULLY');
    console.log(`⏰ Loaded at: ${new Date().toLocaleTimeString()}`);
    console.log('═══════════════════════════════════════════════');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    loadingState.isLoading = false;
    loadingState.error = errorMessage;
    
    dashboardStore.setLoading(false);
    dashboardStore.setError(errorMessage);
    
    console.error('═══════════════════════════════════════════════');
    console.error('❌ DATA LOADING FAILED');
    console.error('Error:', errorMessage);
    console.error('═══════════════════════════════════════════════');
    
    throw error;
  }
}

/**
 * Clear all cached data
 * Called on logout
 */
export function clearAllData(): void {
  console.log('🗑️ Clearing all cached data');
  
  // Reset loading state
  loadingState = {
    isLoading: false,
    isLoaded: false,
    error: null,
    lastLoadedAt: null,
  };
  
  // Clear stores
  const dashboardStore = useDashboardStore.getState();
  dashboardStore.clearData();
  resetStudentAssignmentDashboardStore(null);

  // Clear dropdown cache
  clearDropdownCache();
  
  console.log('✅ All data cleared');
}

/**
 * Refresh specific data without full reload
 */
export async function refreshData(dataType: 'quizzes' | 'classrooms' | 'dropdowns'): Promise<void> {
  const userStore = useUserStore.getState();
  const user = userStore.user;
  
  if (!user) return;
  
  console.log(`🔄 Refreshing ${dataType}...`);
  
  try {
    if (dataType === 'quizzes') {
      if (user.role === 'instructor') {
        const response = await fetchTeacherDashboardSummary({ view_type: 'summary', limit: 1000 });
        useDashboardStore.getState().setQuizzes(response.data, response.meta.total_count);
      } else {
        const response = await fetchStudentQuizzes({ view_type: 'student_total_details', limit: 1000 });
        useDashboardStore.getState().setQuizzes(response.data, response.meta.total_count);
      }
    } else if (dataType === 'classrooms' && user.role === 'instructor') {
      const response = await fetchTeacherClassrooms();
      useDashboardStore.getState().setClassrooms(response.data);
    } else if (dataType === 'dropdowns') {
      await Promise.allSettled([
        fetchClasses(),
        fetchAllSubjects(),
        fetchLevels(),
      ]);
    }
    
    console.log(`✅ ${dataType} refreshed`);
  } catch (error) {
    console.error(`❌ Failed to refresh ${dataType}:`, error);
    throw error;
  }
}
