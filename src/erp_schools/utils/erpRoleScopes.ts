/**
 * ERP role tab scopes — ported from web Quiz-React utils/erpRoleScopes.ts
 * Used to gate mobile Schools features by role_id (same backend roles).
 */

export type ErpTabKey =
  | 'dashboard'
  | 'students'
  | 'academic'
  | 'attendance'
  | 'notices'
  | 'admissions'
  | 'exams'
  | 'timetable'
  | 'lms'
  | 'fees'
  | 'hr'
  | 'library'
  | 'transport'
  | 'hostel'
  | 'inventory'
  | 'engagement'
  | 'safety'
  | 'forms'
  | 'parent_portal'
  | 'biometric'
  | 'analytics'
  | 'holidaycalendar'
  | 'email_templates';

export const ADMIN_ERP_TABS: ErpTabKey[] = [
  'dashboard', 'students', 'academic', 'attendance', 'notices', 'admissions',
  'exams', 'timetable', 'lms', 'fees', 'hr', 'library', 'transport', 'hostel',
  'inventory', 'engagement', 'safety', 'forms', 'parent_portal', 'biometric',
  'analytics', 'holidaycalendar', 'email_templates',
];

export const TEACHER_ERP_TABS: ErpTabKey[] = [
  'dashboard', 'students', 'attendance', 'notices', 'exams', 'timetable',
  'lms', 'fees', 'hr', 'library', 'engagement', 'holidaycalendar',
];

export const STUDENT_ERP_TABS: ErpTabKey[] = [
  'dashboard', 'students', 'attendance', 'exams', 'timetable', 'lms',
  'fees', 'library', 'transport', 'hostel', 'holidaycalendar',
];

export const ROLE_ERP_TABS: Record<number, ErpTabKey[]> = {
  1: ADMIN_ERP_TABS,
  2: ADMIN_ERP_TABS,
  3: TEACHER_ERP_TABS,
  4: STUDENT_ERP_TABS,
  5: [
    'dashboard', 'students', 'academic', 'attendance', 'notices', 'exams',
    'timetable', 'lms', 'library', 'engagement', 'analytics', 'holidaycalendar',
  ],
  6: ADMIN_ERP_TABS,
  7: ADMIN_ERP_TABS,
  8: [
    'dashboard', 'students', 'academic', 'attendance', 'notices', 'admissions',
    'exams', 'timetable', 'lms', 'fees', 'hr', 'library', 'transport', 'hostel',
    'inventory', 'engagement', 'safety', 'forms', 'parent_portal', 'biometric',
    'analytics', 'holidaycalendar',
  ],
  9: TEACHER_ERP_TABS,
  10: TEACHER_ERP_TABS,
  11: ['dashboard', 'notices', 'lms', 'fees', 'engagement'],
  12: ['dashboard', 'notices', 'lms', 'hr', 'inventory', 'engagement', 'biometric'],
  13: ['dashboard', 'notices', 'lms', 'library', 'engagement'],
  14: ['dashboard', 'notices', 'lms', 'hostel', 'engagement'],
  15: ['dashboard', 'notices', 'lms', 'transport', 'engagement'],
  16: ['dashboard', 'notices', 'lms', 'fees', 'transport', 'hostel', 'engagement', 'parent_portal'],
  17: ['dashboard', 'notices', 'lms', 'hr', 'engagement'],
};

export function getScopedErpTabs(roleId?: number | null): ErpTabKey[] {
  if (roleId == null) return TEACHER_ERP_TABS;
  return ROLE_ERP_TABS[roleId] ?? TEACHER_ERP_TABS;
}

export function canAccessErpTab(roleId: number | null | undefined, tab: ErpTabKey): boolean {
  return getScopedErpTabs(roleId).includes(tab);
}
