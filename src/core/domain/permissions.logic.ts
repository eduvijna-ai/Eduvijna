/**
 * Permissions Business Logic
 * Handles role-based permissions and access control
 * NO API CALLS - only pure functions
 */

import type { UserProfile, UserRole } from '../types';

/**
 * Check if user is a teacher
 */
export function isInstructor(user: UserProfile | null): boolean {
  return user?.role === 'instructor';
}

/**
 * Check if user is a student
 */
export function isStudent(user: UserProfile | null): boolean {
  return user?.role === 'student';
}

/**
 * Check if user can create assessments
 */
export function canCreateAssessment(user: UserProfile | null): boolean {
  return isInstructor(user);
}

/**
 * Check if user can edit assessment
 */
export function canEditAssessment(user: UserProfile | null, createdBy: string): boolean {
  if (!user) return false;
  return isInstructor(user) && user.id === createdBy;
}

/**
 * Check if user can delete assessment
 */
export function canDeleteAssessment(user: UserProfile | null, createdBy: string): boolean {
  if (!user) return false;
  return isInstructor(user) && user.id === createdBy;
}

/**
 * Check if user can view analytics
 */
export function canViewAnalytics(user: UserProfile | null): boolean {
  // Both teachers and students can view analytics
  return user !== null;
}

/**
 * Check if user can view all students' analytics
 */
export function canViewAllStudentsAnalytics(user: UserProfile | null): boolean {
  return isInstructor(user);
}

/**
 * Check if user can attempt assessment
 */
export function canAttemptAssessment(user: UserProfile | null): boolean {
  return isStudent(user);
}

/**
 * Check if user can view specific student's data
 */
export function canViewStudentData(user: UserProfile | null, studentId: string): boolean {
  if (!user) return false;
  
  // Instructors can view all students' data
  if (isInstructor(user)) return true;
  
  // Students can only view their own data
  return user.id === studentId;
}

/**
 * Check if user can export data
 */
export function canExportData(user: UserProfile | null): boolean {
  return isInstructor(user);
}

/**
 * Check if user can manage classes
 */
export function canManageClasses(user: UserProfile | null): boolean {
  return isInstructor(user);
}

/**
 * Get available actions for user role
 */
export function getAvailableActions(role: UserRole): string[] {
  const actions: Record<UserRole, string[]> = {
    instructor: [
      'create_assessment',
      'edit_assessment',
      'delete_assessment',
      'view_analytics',
      'view_all_students',
      'export_data',
      'manage_classes',
    ],
    student: [
      'attempt_assessment',
      'view_analytics',
      'view_own_data',
    ],
    admin: [
      'create_assessment',
      'edit_assessment',
      'delete_assessment',
      'view_analytics',
      'view_all_students',
      'export_data',
      'manage_classes',
      'manage_users',
      'system_settings',
    ],
  };
  
  return actions[role] || [];
}

/**
 * Check if user has specific permission
 */
export function hasPermission(user: UserProfile | null, permission: string): boolean {
  if (!user) return false;
  
  const availableActions = getAvailableActions(user.role);
  return availableActions.includes(permission);
}

/**
 * Get dashboard features based on role
 */
export function getDashboardFeatures(role: UserRole): {
  showCreateAssessment: boolean;
  showStudentList: boolean;
  showClassManagement: boolean;
  showWeakTopics: boolean;
  showUpcomingAssessments: boolean;
} {
  if (role === 'instructor') {
    return {
      showCreateAssessment: true,
      showStudentList: true,
      showClassManagement: true,
      showWeakTopics: false,
      showUpcomingAssessments: false,
    };
  }
  
  return {
    showCreateAssessment: false,
    showStudentList: false,
    showClassManagement: false,
    showWeakTopics: true,
    showUpcomingAssessments: true,
  };
}

/**
 * Filter visible assessment statuses based on role
 */
export function getVisibleAssessmentStatuses(role: UserRole): string[] {
  if (role === 'instructor') {
    return ['available_soon', 'active', 'expired'];
  }
  
  // Students should not see draft or cancelled assessments
  return ['available_soon', 'active', 'expired'];
}

/**
 * Validate resource access
 */
export function validateResourceAccess(
  user: UserProfile | null,
  resourceOwnerId: string,
  requiredRole?: UserRole
): {
  hasAccess: boolean;
  reason?: string;
} {
  if (!user) {
    return { hasAccess: false, reason: 'User not authenticated' };
  }
  
  // Check role requirement
  if (requiredRole && user.role !== requiredRole) {
    return { hasAccess: false, reason: 'Insufficient permissions' };
  }
  
  // Instructors can access all resources
  if (isInstructor(user)) {
    return { hasAccess: true };
  }
  
  // Students can only access their own resources
  if (user.id !== resourceOwnerId) {
    return { hasAccess: false, reason: 'Access denied to this resource' };
  }
  
  return { hasAccess: true };
}
