/**
 * ERP API Service
 * All 81 ERP API endpoint objects mapped from the web application.
 * Base URL: https://eduapi.eduvijna.com
 */

import { apiClient } from './config';

// ----- Generic helpers -----
const api = {
  get: (url: string, params?: Record<string, any>) =>
    apiClient.get(url, { params }).then((r) => r.data),
  post: (url: string, data?: any) =>
    apiClient.post(url, data).then((r) => r.data),
  put: (url: string, data?: any) =>
    apiClient.put(url, data).then((r) => r.data),
  patch: (url: string, data?: any) =>
    apiClient.patch(url, data).then((r) => r.data),
  del: (url: string) => apiClient.delete(url).then((r) => r.data),
};

// ============================================================
// SIS (Student Information System)
// ============================================================

export const studentsByUserApi = {
  list: (params?: any) => api.get('/api/v1/erp/sis/students-by-user', params),
  getAll: (params?: any) => api.get('/api/v1/erp/sis/students-by-user', params),
};

export const classOverviewApi = {
  list: (params?: any) => api.get('/api/v1/erp/sis/class-overview', params),
  getAll: (params?: any) => api.get('/api/v1/erp/sis/class-overview', params),
  getKPIs: (params?: any) => api.get('/api/v1/erp/sis/class-overview-kpis', params),
};

/** Web: studentProfilesApi — `/api/v1/erp/sis/students` */
export const studentProfilesApi = {
  list: (params?: any) => api.get('/api/v1/erp/sis/students', params),
  get: (id: number | string, params?: { school_id?: number | string; academic_year_id?: number | string }) =>
    api.get(`/api/v1/erp/sis/students/${id}`, params),
  getById: (id: number | string, schoolId?: number | string, academicYearId?: number | string) =>
    api.get(`/api/v1/erp/sis/students/${id}`, {
      school_id: schoolId,
      academic_year_id: academicYearId,
    }),
  create: (data: any, academicYearId?: number | string) =>
    api.post(
      academicYearId != null
        ? `/api/v1/erp/sis/students?academic_year_id=${academicYearId}`
        : '/api/v1/erp/sis/students',
      data,
    ),
  update: (
    id: number | string,
    data: any,
    schoolId?: number | string,
    academicYearId?: number | string,
  ) => {
    const qs = [
      schoolId != null ? `school_id=${schoolId}` : '',
      academicYearId != null ? `academic_year_id=${academicYearId}` : '',
    ]
      .filter(Boolean)
      .join('&');
    return api.put(`/api/v1/erp/sis/students/${id}${qs ? `?${qs}` : ''}`, data);
  },
  softDelete: (id: number | string, schoolId?: number | string) =>
    api.del(
      schoolId != null
        ? `/api/v1/erp/sis/students/${id}?school_id=${schoolId}`
        : `/api/v1/erp/sis/students/${id}`,
    ),
};

export const guardiansApi = {
  list: (params?: any) => api.get('/api/v1/erp/sis/guardians', params),
  get: (id: number | string) => api.get(`/api/v1/erp/sis/guardians/${id}`),
  /** Web: guardiansApi.getByStudent */
  getByStudent: (studentId: number | string, params?: any) =>
    api.get(`/api/v1/erp/sis/students/${studentId}/guardians`, params),
  create: (data: any) => api.post('/api/v1/erp/sis/guardians', data),
  update: (id: number | string, data: any) => api.put(`/api/v1/erp/sis/guardians/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/sis/guardians/${id}`),
};

export const medicalApi = {
  list: (params?: any) => api.get('/api/v1/erp/sis/medical', params),
  get: (id: number | string) => api.get(`/api/v1/erp/sis/medical/${id}`),
  /** Web: medicalApi.getByStudent */
  getByStudent: (studentId: number | string) =>
    api.get(`/api/v1/erp/sis/students/${studentId}/medical`),
  /** Web: medicalApi.upsert */
  upsert: (studentId: number | string, data: any) =>
    api.post(`/api/v1/erp/sis/students/${studentId}/medical`, data),
  create: (data: any) => api.post('/api/v1/erp/sis/medical', data),
  update: (id: number | string, data: any) => api.put(`/api/v1/erp/sis/medical/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/sis/medical/${id}`),
};

export const documentsApi = {
  list: (params?: any) => api.get('/api/v1/erp/sis/documents', params),
  get: (id: number | string) => api.get(`/api/v1/erp/sis/documents/${id}`),
  /** Web: documentsApi.getByStudent */
  getByStudent: (studentId: number | string, params?: any) =>
    api.get(`/api/v1/erp/sis/students/${studentId}/documents`, params),
  create: (data: any) => api.post('/api/v1/erp/sis/documents', data),
  update: (id: number | string, data: any) => api.put(`/api/v1/erp/sis/documents/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/sis/documents/${id}`),
};

export const uploadApi = {
  upload: (formData: FormData) =>
    apiClient.post('/api/v1/erp/sis/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),
  /** Web: uploadApi.uploadDocument */
  uploadDocument: (formData: FormData) =>
    apiClient.post('/api/v1/erp/sis/upload/document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),
};

export const classesApi = {
  list: (params?: any) => api.get('/api/v1/erp/sis/classes', params),
  get: (id: number | string) => api.get(`/api/v1/erp/sis/classes/${id}`),
  create: (data: any) => api.post('/api/v1/erp/sis/classes', data),
  update: (id: number | string, data: any) => api.put(`/api/v1/erp/sis/classes/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/sis/classes/${id}`),
};

/** Web ExamsTab Marks/Results classroom filter — /api/v1/erp/academic/classes */
export const academicClassesApi = {
  list: (schoolId?: number | string) =>
    api.get(
      '/api/v1/erp/academic/classes',
      schoolId != null ? { school_id: schoolId } : undefined,
    ),
};

// ============================================================
// Academic
// ============================================================

export const coursesApi = {
  list: (params?: any) => api.get('/api/v1/erp/academic/courses', params),
  get: (id: number | string) => api.get(`/api/v1/erp/academic/courses/${id}`),
  create: (data: any) => api.post('/api/v1/erp/academic/courses', data),
  update: (id: number | string, data: any) => api.put(`/api/v1/erp/academic/courses/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/academic/courses/${id}`),
};

export const batchesApi = {
  list: (params?: any) => api.get('/api/v1/erp/academic/batches', params),
  get: (id: number | string) => api.get(`/api/v1/erp/academic/batches/${id}`),
  create: (data: any) => api.post('/api/v1/erp/academic/batches', data),
  update: (id: number | string, data: any) => api.put(`/api/v1/erp/academic/batches/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/academic/batches/${id}`),
};

export const academicTermsApi = {
  list: (params?: any) => api.get('/api/v1/erp/academic/academic-terms', params),
  get: (id: number | string) => api.get(`/api/v1/erp/academic/academic-terms/${id}`),
  create: (data: any) => api.post('/api/v1/erp/academic/academic-terms', data),
  update: (id: number | string, data: any) => api.put(`/api/v1/erp/academic/academic-terms/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/academic/academic-terms/${id}`),
};

export const erpAcademicYearsApi = {
  list: (params?: any) => api.get('/api/v1/erp/academic/academic-years', params),
  get: (id: number | string) => api.get(`/api/v1/erp/academic/academic-years/${id}`),
  create: (data: any) => api.post('/api/v1/erp/academic/academic-years', data),
  update: (id: number | string, data: any) => api.put(`/api/v1/erp/academic/academic-years/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/academic/academic-years/${id}`),
};

// ============================================================
// Attendance
// ============================================================

export const attendanceSettingsApi = {
  get: (params?: any) => api.get('/api/v1/erp/attendance/settings', params),
  update: (data: any) => api.put('/api/v1/erp/attendance/settings', data),
  upsert: (data: any) => api.post('/api/v1/erp/attendance/settings', data),
};

export const attendanceRecordsApi = {
  list: (params?: any) => api.get('/api/v1/erp/attendance/records', params),
  getAll: (params?: any) => api.get('/api/v1/erp/attendance/records', params),
  // Monthly grid: returns { students, working_dates, summary_* fields }
  monthlyGrid: (params?: any) => api.get('/api/v1/erp/attendance/monthly-grid', params),
  // Student summary for My Attendance (student role)
  studentSummary: (params?: any) => api.get('/api/v1/erp/attendance/reports/student-summary', params),
  /** Logged-in student attendance summary (web StudentERPDashboard). */
  mySummary: (params?: { date_from?: string; date_to?: string; school_id?: number | string }) =>
    api.get('/api/v1/erp/attendance/my-summary', params),
  bulkUpsert: (data: any) => api.post('/api/v1/erp/attendance/records/upsert', data),
  get: (id: number | string) => api.get(`/api/v1/erp/attendance/records/${id}`),
  create: (data: any) => api.post('/api/v1/erp/attendance/records', data),
  update: (id: number | string, data: any) => api.put(`/api/v1/erp/attendance/records/${id}`, data),
};

export const staffAttendanceApi = {
  // Correct paths: all CRUD operations use /records sub-resource
  list: (params?: any) => api.get('/api/v1/erp/staff-attendance/records', params),
  getAll: (params?: any) => api.get('/api/v1/erp/staff-attendance/records', params),
  bulkUpsert: (data: any) => api.post('/api/v1/erp/staff-attendance/records/upsert', data),
  get: (id: number | string) => api.get(`/api/v1/erp/staff-attendance/records/${id}`),
  create: (data: any) => api.post('/api/v1/erp/staff-attendance/records', data),
  update: (id: number | string, data: any) => api.put(`/api/v1/erp/staff-attendance/records/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/staff-attendance/records/${id}`),
  pendingApprovals: (params?: any) => api.get('/api/v1/erp/staff-attendance/pending-approvals', params),
  approveRecord: (
    recordId: number | string,
    action: 'approved' | 'rejected',
    schoolId?: number | string | Record<string, unknown>,
  ) => {
    const sid =
      typeof schoolId === 'object' && schoolId != null
        ? (schoolId as { school_id?: number | string }).school_id
        : schoolId;
    const qs = sid != null ? `?school_id=${sid}` : '';
    return api.post(`/api/v1/erp/staff-attendance/records/${recordId}/approve${qs}`, {
      action,
    });
  },
  summary: (params?: any) => api.get('/api/v1/erp/staff-attendance/reports/summary', params),
};

// ============================================================
// Notices
// ============================================================

export const noticesApi = {
  list: (params?: any) => api.get('/api/v1/erp/notices', params),
  getAll: (params?: any) => api.get('/api/v1/erp/notices', params),
  get: (id: number | string, schoolId?: number | string) =>
    api.get(`/api/v1/erp/notices/${id}`, schoolId != null ? { school_id: schoolId } : undefined),
  create: (data: any) => api.post('/api/v1/erp/notices', data),
  update: (id: number | string, data: any, schoolId?: number | string) =>
    api.put(
      schoolId != null
        ? `/api/v1/erp/notices/${id}?school_id=${schoolId}`
        : `/api/v1/erp/notices/${id}`,
      data,
    ),
  softDelete: (id: number | string, schoolId?: number | string) =>
    api.del(
      schoolId != null
        ? `/api/v1/erp/notices/${id}?school_id=${schoolId}`
        : `/api/v1/erp/notices/${id}`,
    ),
};

// ============================================================
// Dashboard
// ============================================================

export const erpDashboardApi = {
  /** Mirrors web erpDashboardApi.get — `/api/v1/erp/dashboard` (not /summary). */
  get: (
    days: number = 7,
    schoolId?: number | string,
    academicYearId?: number | string,
  ) =>
    api.get('/api/v1/erp/dashboard', {
      days,
      school_id: schoolId,
      academic_year_id: academicYearId,
    }),
};

// ============================================================
// Admissions & Front Office
// ============================================================

export const admissionsApi = {
  list: (params?: any) => api.get('/api/v1/erp/admissions', params),
  getAll: (params?: any) => api.get('/api/v1/erp/admissions', params),
  get: (id: number | string) => api.get(`/api/v1/erp/admissions/${id}`),
  create: (data: any) => api.post('/api/v1/erp/admissions', data),
  update: (id: number | string, data: any) => api.put(`/api/v1/erp/admissions/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/admissions/${id}`),
  statusCounts: (params?: any) => api.get('/api/v1/erp/admissions/status-counts', params),
};

export const visitorsApi = {
  list: (params?: any) => api.get('/api/v1/erp/admissions/front-office/visitors', params),
  getAll: (params?: any) => api.get('/api/v1/erp/admissions/front-office/visitors', params),
  get: (id: number | string) => api.get(`/api/v1/erp/admissions/front-office/visitors/${id}`),
  create: (data: any) => api.post('/api/v1/erp/admissions/front-office/visitors', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/admissions/front-office/visitors/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/admissions/front-office/visitors/${id}`),
};

export const incidentsApi = {
  list: (params?: any) => api.get('/api/v1/erp/admissions/front-office/incidents', params),
  getAll: (params?: any) => api.get('/api/v1/erp/admissions/front-office/incidents', params),
  get: (id: number | string) =>
    api.get(`/api/v1/erp/admissions/front-office/incidents/${id}`),
  create: (data: any) => api.post('/api/v1/erp/admissions/front-office/incidents', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/admissions/front-office/incidents/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/admissions/front-office/incidents/${id}`),
};

export const emergencyContactsApi = {
  list: (params?: any) =>
    api.get('/api/v1/erp/admissions/front-office/emergency-contacts', params),
  getAll: (params?: any) =>
    api.get('/api/v1/erp/admissions/front-office/emergency-contacts', params),
  get: (id: number | string) =>
    api.get(`/api/v1/erp/admissions/front-office/emergency-contacts/${id}`),
  create: (data: any) =>
    api.post('/api/v1/erp/admissions/front-office/emergency-contacts', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/admissions/front-office/emergency-contacts/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/admissions/front-office/emergency-contacts/${id}`),
};

export const phoneCallLogsApi = {
  list: (params?: any) =>
    api.get('/api/v1/erp/admissions/front-office/phone-call-logs', params),
  getAll: (params?: any) =>
    api.get('/api/v1/erp/admissions/front-office/phone-call-logs', params),
  get: (id: number | string) =>
    api.get(`/api/v1/erp/admissions/front-office/phone-call-logs/${id}`),
  create: (data: any) =>
    api.post('/api/v1/erp/admissions/front-office/phone-call-logs', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/admissions/front-office/phone-call-logs/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/admissions/front-office/phone-call-logs/${id}`),
};

export const postalDispatchApi = {
  list: (params?: any) =>
    api.get('/api/v1/erp/admissions/front-office/postal-dispatch', params),
  getAll: (params?: any) =>
    api.get('/api/v1/erp/admissions/front-office/postal-dispatch', params),
  get: (id: number | string) =>
    api.get(`/api/v1/erp/admissions/front-office/postal-dispatch/${id}`),
  create: (data: any) =>
    api.post('/api/v1/erp/admissions/front-office/postal-dispatch', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/admissions/front-office/postal-dispatch/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/admissions/front-office/postal-dispatch/${id}`),
};

export const postalReceiveApi = {
  list: (params?: any) =>
    api.get('/api/v1/erp/admissions/front-office/postal-receive', params),
  getAll: (params?: any) =>
    api.get('/api/v1/erp/admissions/front-office/postal-receive', params),
  get: (id: number | string) =>
    api.get(`/api/v1/erp/admissions/front-office/postal-receive/${id}`),
  create: (data: any) =>
    api.post('/api/v1/erp/admissions/front-office/postal-receive', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/admissions/front-office/postal-receive/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/admissions/front-office/postal-receive/${id}`),
};

// ============================================================
// Exams — web ExamsTab / ExamGroupsSubView parity
// Active model: groups → items → subjects/students/marks/results
// ============================================================

const examQs = (schoolId?: number | string, extra?: Record<string, unknown>) => {
  const q: Record<string, unknown> = { ...extra };
  if (schoolId != null) q.school_id = schoolId;
  return Object.keys(q).length ? q : undefined;
};

const examPathQs = (path: string, schoolId?: number | string) =>
  schoolId != null ? `${path}?school_id=${schoolId}` : path;

const EXAM_GROUPS = '/api/v1/erp/exams/groups';
const EXAM_ITEMS = '/api/v1/erp/exams/items';
const EXAM_BASE = '/api/v1/erp/exams';

export const examGroupsApi = {
  list: (params?: any) => api.get(EXAM_GROUPS, params),
  get: (id: number | string, schoolId?: number | string) =>
    api.get(`${EXAM_GROUPS}/${id}`, examQs(schoolId)),
  create: (data: any) => api.post(EXAM_GROUPS, data),
  update: (id: number | string, data: any, schoolId?: number | string) =>
    api.put(examPathQs(`${EXAM_GROUPS}/${id}`, schoolId), data),
  softDelete: (id: number | string, schoolId?: number | string) =>
    api.del(examPathQs(`${EXAM_GROUPS}/${id}`, schoolId)),
};

export const examGroupItemsApi = {
  list: (groupId: number | string, params?: any) =>
    api.get(`${EXAM_GROUPS}/${groupId}/items`, params),
  get: (groupId: number | string, itemId: number | string, schoolId?: number | string) =>
    api.get(`${EXAM_GROUPS}/${groupId}/items/${itemId}`, examQs(schoolId)),
  create: (groupId: number | string, data: any) =>
    api.post(`${EXAM_GROUPS}/${groupId}/items`, data),
  update: (
    groupId: number | string,
    itemId: number | string,
    data: any,
    schoolId?: number | string,
  ) => api.put(examPathQs(`${EXAM_GROUPS}/${groupId}/items/${itemId}`, schoolId), data),
  softDelete: (
    groupId: number | string,
    itemId: number | string,
    schoolId?: number | string,
  ) => api.del(examPathQs(`${EXAM_GROUPS}/${groupId}/items/${itemId}`, schoolId)),
};

/** Item subjects (= schedule papers). Web: examSubjectsApi */
export const examSubjectsApi = {
  list: (itemId: number | string, schoolId?: number | string) =>
    api.get(`${EXAM_ITEMS}/${itemId}/subjects`, examQs(schoolId)),
  create: (itemId: number | string, data: any, schoolId?: number | string) =>
    api.post(examPathQs(`${EXAM_ITEMS}/${itemId}/subjects`, schoolId), data),
  update: (
    itemId: number | string,
    entryId: number | string,
    data: any,
    schoolId?: number | string,
  ) => api.put(examPathQs(`${EXAM_ITEMS}/${itemId}/subjects/${entryId}`, schoolId), data),
  softDelete: (
    itemId: number | string,
    entryId: number | string,
    schoolId?: number | string,
  ) => api.del(examPathQs(`${EXAM_ITEMS}/${itemId}/subjects/${entryId}`, schoolId)),
  importFromClass: (itemId: number | string, data: any, schoolId?: number | string) =>
    api.post(examPathQs(`${EXAM_ITEMS}/${itemId}/subjects/import-class`, schoolId), data),
  getByClass: (classId: number | string, schoolId?: number | string) =>
    api.get(`/api/v1/erp/exams/subjects-by-class/${classId}`, examQs(schoolId)),
};

export const examGradesApi = {
  list: (groupId: number | string, schoolId?: number | string) =>
    api.get(`${EXAM_GROUPS}/${groupId}/grades`, examQs(schoolId)),
  create: (groupId: number | string, data: any, schoolId?: number | string) =>
    api.post(examPathQs(`${EXAM_GROUPS}/${groupId}/grades`, schoolId), data),
  update: (
    groupId: number | string,
    gradeId: number | string,
    data: any,
    schoolId?: number | string,
  ) => api.put(examPathQs(`${EXAM_GROUPS}/${groupId}/grades/${gradeId}`, schoolId), data),
  softDelete: (
    groupId: number | string,
    gradeId: number | string,
    schoolId?: number | string,
  ) => api.del(examPathQs(`${EXAM_GROUPS}/${groupId}/grades/${gradeId}`, schoolId)),
  bulkSave: (groupId: number | string, data: any, schoolId?: number | string) =>
    api.post(examPathQs(`${EXAM_GROUPS}/${groupId}/grades/bulk-save`, schoolId), data),
  applyTemplate: (groupId: number | string, data: any, schoolId?: number | string) =>
    api.post(examPathQs(`${EXAM_GROUPS}/${groupId}/grades/apply-template`, schoolId), data),
  getTemplates: () => api.get('/api/v1/erp/exams/grade-templates'),
};

/** Assigned students on an exam ITEM (not group). */
export const examStudentsApi = {
  list: (itemId: number | string, schoolId?: number | string) =>
    api.get(`${EXAM_ITEMS}/${itemId}/students`, examQs(schoolId)),
  assign: (itemId: number | string, data: any, schoolId?: number | string) =>
    api.post(examPathQs(`${EXAM_ITEMS}/${itemId}/students/assign`, schoolId), data),
  bulkAssign: (itemId: number | string, data: any, schoolId?: number | string) =>
    api.post(examPathQs(`${EXAM_ITEMS}/${itemId}/students/bulk-assign`, schoolId), data),
  bulkRemove: (itemId: number | string, data: any, schoolId?: number | string) =>
    api.post(examPathQs(`${EXAM_ITEMS}/${itemId}/students/bulk-remove`, schoolId), data),
  removeAll: (itemId: number | string, schoolId?: number | string) =>
    api.del(examPathQs(`${EXAM_ITEMS}/${itemId}/students`, schoolId)),
  softDelete: (
    itemId: number | string,
    entryId: number | string,
    schoolId?: number | string,
  ) => api.del(examPathQs(`${EXAM_ITEMS}/${itemId}/students/${entryId}`, schoolId)),
  studentsByClass: (
    itemId: number | string,
    classId: number | string,
    params?: { section_id?: number | string; school_id?: number | string },
  ) => api.get(`${EXAM_ITEMS}/${itemId}/students-by-class/${classId}`, params),
};

export const examSectionsApi = {
  list: (schoolId?: number | string) =>
    api.get(`${EXAM_BASE}/sections`, examQs(schoolId)),
};

export const examAllItemsApi = {
  list: (schoolId?: number | string) =>
    api.get(`${EXAM_BASE}/all-items`, examQs(schoolId)),
  mySchedule: (params?: { school_id?: number | string }) =>
    api.get(`${EXAM_BASE}/my-schedule`, params),
  mySubjectPerformance: (params?: { school_id?: number | string }) =>
    api.get(`${EXAM_BASE}/my-subject-performance`, params),
};

/** Legacy exams CRUD (unused by web ExamsTab; kept for older ERP screens). */
export const examsApi = {
  list: (params?: any) => api.get(EXAM_BASE, params),
  get: (id: number | string) => api.get(`${EXAM_BASE}/${id}`),
  create: (data: any) => api.post(EXAM_BASE, data),
  update: (id: number | string, data: any) => api.put(`${EXAM_BASE}/${id}`, data),
  softDelete: (id: number | string) => api.del(`${EXAM_BASE}/${id}`),
};

/** Legacy schedules (unused by web ExamsTab — schedules = exam subjects). */
export const examSchedulesApi = {
  list: (params?: any) => api.get(`${EXAM_BASE}/schedules`, params),
  get: (id: number | string) => api.get(`${EXAM_BASE}/schedules/${id}`),
  create: (data: any) => api.post(`${EXAM_BASE}/schedules`, data),
  update: (id: number | string, data: any) =>
    api.put(`${EXAM_BASE}/schedules/${id}`, data),
  softDelete: (id: number | string) => api.del(`${EXAM_BASE}/schedules/${id}`),
};

export const examMarksApi = {
  // Legacy gradebook paths (class details / progress analytics)
  list: (params?: any) => api.get(`${EXAM_BASE}/marks/list`, params),
  get: (id: number | string) => api.get(`${EXAM_BASE}/marks/${id}`),
  create: (data: any) => api.post(`${EXAM_BASE}/marks`, data),
  update: (id: number | string, data: any) => api.put(`${EXAM_BASE}/marks/${id}`, data),
  bulkUpsert: (data: any) => api.post(`${EXAM_BASE}/marks/bulk`, data),
  softDelete: (id: number | string) => api.del(`${EXAM_BASE}/marks/${id}`),
  // Web ExamsTab item-based marks
  getGrid: (
    itemId: number | string,
    examSubjectId: number | string,
    schoolId?: number | string,
  ) =>
    api.get(
      `${EXAM_ITEMS}/${itemId}/marks/grid/${examSubjectId}`,
      examQs(schoolId),
    ),
  bulkSave: (
    itemId: number | string,
    examSubjectId: number | string,
    data: any,
    schoolId?: number | string,
  ) =>
    api.post(
      examPathQs(`${EXAM_ITEMS}/${itemId}/marks/bulk-save/${examSubjectId}`, schoolId),
      data,
    ),
  getProgress: (itemId: number | string, schoolId?: number | string) =>
    api.get(`${EXAM_ITEMS}/${itemId}/marks/progress`, examQs(schoolId)),
  getTemplate: (
    itemId: number | string,
    schoolId?: number | string,
    filters?: { class_id?: number; section_id?: number },
  ) =>
    api.get(`${EXAM_ITEMS}/${itemId}/marks/template`, examQs(schoolId, filters)),
  csvUpload: (itemId: number | string, data: any, schoolId?: number | string) =>
    api.post(examPathQs(`${EXAM_ITEMS}/${itemId}/marks/csv-upload`, schoolId), data),
};

export const examResultsApi = {
  // Legacy
  list: (params?: any) => api.get(`${EXAM_BASE}/results`, params),
  get: (id: number | string) => api.get(`${EXAM_BASE}/results/${id}`),
  // Web ExamsTab item-based results
  view: (
    itemId: number | string,
    schoolId?: number | string,
    filters?: { class_id?: number; section_id?: number },
  ) => api.get(`${EXAM_ITEMS}/${itemId}/results`, examQs(schoolId, filters)),
  generate: (itemId: number | string, schoolId?: number | string) =>
    api.post(examPathQs(`${EXAM_ITEMS}/${itemId}/results/generate`, schoolId), {}),
  publish: (itemId: number | string, schoolId?: number | string) =>
    api.post(examPathQs(`${EXAM_ITEMS}/${itemId}/results/publish`, schoolId), {}),
};

// ============================================================
// Timetable
// ============================================================

export const timetableTemplatesApi = {
  list: (params?: any) => api.get('/api/v1/erp/timetable/templates', params),
  get: (id: number | string) => api.get(`/api/v1/erp/timetable/templates/${id}`),
  create: (data: any) => api.post('/api/v1/erp/timetable/templates', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/timetable/templates/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/timetable/templates/${id}`),
};

export const timetableSlotsApi = {
  list: (params?: any) => api.get('/api/v1/erp/timetable/slots', params),
  get: (id: number | string) => api.get(`/api/v1/erp/timetable/slots/${id}`),
  create: (data: any) => api.post('/api/v1/erp/timetable/slots', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/timetable/slots/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/timetable/slots/${id}`),
  /** Web: timetableSlotsApi.myTeacherTimetable(schoolId) */
  myTeacherTimetable: (schoolId?: number | string) =>
    api.get(
      '/api/v1/erp/timetable/teacher-timetable',
      schoolId != null ? { school_id: schoolId } : undefined,
    ),
  /** Web: timetableSlotsApi.myStudentTimetable(schoolId) */
  myStudentTimetable: (schoolId?: number | string) =>
    api.get(
      '/api/v1/erp/timetable/student-timetable',
      schoolId != null ? { school_id: schoolId } : undefined,
    ),
};

// ============================================================
// LMS / Class Management (student enrollments)
// ============================================================

/** Web: lmsEnrollmentsApi.myClassrooms — StudentERPDashboard "My Subjects". */
export const lmsEnrollmentsApi = {
  myClassrooms: (schoolId?: number | string) =>
    api.get(
      '/api/v1/class-management/my-enrolled-classrooms',
      schoolId != null ? { school_id: schoolId } : undefined,
    ),
  list: (params?: any) => api.get('/api/v1/class-management/lms-enrollments', params),
};

export const lmsClassroomsApi = {
  list: (params?: any) => api.get('/api/v1/class-management/lms-classrooms', params),
};

export const assignmentsApi = {
  list: (params?: any) => api.get('/api/v1/erp/lms/assignments', params),
  get: (id: number | string) => api.get(`/api/v1/erp/lms/assignments/${id}`),
  create: (data: any) => api.post('/api/v1/erp/lms/assignments', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/lms/assignments/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/lms/assignments/${id}`),
};

export const submissionsApi = {
  list: (params?: any) => api.get('/api/v1/erp/lms/submissions', params),
  get: (id: number | string) => api.get(`/api/v1/erp/lms/submissions/${id}`),
  create: (data: any) => api.post('/api/v1/erp/lms/submissions', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/lms/submissions/${id}`, data),
};

// ============================================================
// Fees
// ============================================================

export const feeTypesApi = {
  list: (params?: any) => api.get('/api/v1/erp/finance/fee-types', params),
  get: (id: number | string) => api.get(`/api/v1/erp/finance/fee-types/${id}`),
  create: (data: any) => api.post('/api/v1/erp/finance/fee-types', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/finance/fee-types/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/finance/fee-types/${id}`),
};

export const feeStructuresApi = {
  list: (params?: any) => api.get('/api/v1/erp/finance/fee-structures', params),
  get: (id: number | string) => api.get(`/api/v1/erp/finance/fee-structures/${id}`),
  create: (data: any) => api.post('/api/v1/erp/finance/fee-structures', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/finance/fee-structures/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/finance/fee-structures/${id}`),
};

export const feeCollectionsApi = {
  list: (params?: any) => api.get('/api/v1/erp/finance/collections', params),
  get: (id: number | string) => api.get(`/api/v1/erp/finance/collections/${id}`),
  create: (data: any) => api.post('/api/v1/erp/finance/collections', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/finance/collections/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/finance/collections/${id}`),
  /** Web alias — school_id as query */
  remove: (id: number | string, schoolId?: number | string) =>
    api.del(
      schoolId != null
        ? `/api/v1/erp/finance/collections/${id}?school_id=${schoolId}`
        : `/api/v1/erp/finance/collections/${id}`,
    ),
};

export const feeReceiptsApi = {
  list: (params?: any) => api.get('/api/v1/erp/finance/receipts', params),
  get: (id: number | string) => api.get(`/api/v1/erp/finance/receipts/${id}`),
  create: (data: any) => api.post('/api/v1/erp/finance/receipts', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/finance/receipts/${id}`, data),
};

export const feePaymentPlansApi = {
  list: (params?: any) => api.get('/api/v1/erp/finance/payment-plans', params),
  get: (id: number | string) => api.get(`/api/v1/erp/finance/payment-plans/${id}`),
  create: (data: any) => api.post('/api/v1/erp/finance/payment-plans', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/finance/payment-plans/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/finance/payment-plans/${id}`),
};

export const feeReportsApi = {
  summary: (params?: any) => api.get('/api/v1/erp/finance/summary', params),
  defaulters: (params?: any) => api.get('/api/v1/erp/finance/defaulters', params),
  trend: (params?: any) => api.get('/api/v1/erp/finance/trend', params),
  register: (params?: any) => api.get('/api/v1/erp/finance/register', params),
  /** Web: feeReportsApi.outstandingDues */
  outstandingDues: (params?: {
    school_id?: number | string;
    class_ids?: string;
    academic_year_id?: number | string;
  }) => api.get('/api/v1/erp/finance/outstanding-dues', params),
};

export const studentsLookupApi = {
  search: (params?: any) => api.get('/api/v1/erp/finance/students-lookup', params),
  /** Web: studentsLookupApi.list(schoolId, q, classId) */
  list: (schoolId?: number | string, q?: string, classId?: number | string) =>
    api.get('/api/v1/erp/finance/students-lookup', {
      school_id: schoolId,
      q,
      class_id: classId,
    }),
};

export const studentFeeAssignmentsApi = {
  list: (params?: any) => api.get('/api/v1/erp/finance/student-fee-assignments', params),
  get: (id: number | string) => api.get(`/api/v1/erp/finance/student-fee-assignments/${id}`),
  create: (data: any) => api.post('/api/v1/erp/finance/student-fee-assignments', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/finance/student-fee-assignments/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/finance/student-fee-assignments/${id}`),
  /** Web alias */
  remove: (id: number | string, schoolId?: number | string) =>
    api.del(
      schoolId != null
        ? `/api/v1/erp/finance/student-fee-assignments/${id}?school_id=${schoolId}`
        : `/api/v1/erp/finance/student-fee-assignments/${id}`,
    ),
};

/** Student self-service fees (web studentFeesApi). */
export const studentFeesApi = {
  myPayments: (params?: { academic_year_id?: number; school_id?: number | string }) =>
    api.get('/api/v1/erp/finance/my-payments', params),
  myReceipts: (params?: {
    school_id?: number | string;
    page?: number;
    per_page?: number;
  }) => api.get('/api/v1/erp/finance/my-receipts', params),
};

export const feeTermSchedulesApi = {
  list: (params?: any) => api.get('/api/v1/erp/finance/term-schedules', params),
  get: (id: number | string) => api.get(`/api/v1/erp/finance/term-schedules/${id}`),
  create: (data: any) => api.post('/api/v1/erp/finance/term-schedules', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/finance/term-schedules/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/finance/term-schedules/${id}`),
  /** Web: feeTermSchedulesApi.generate */
  generate: (
    data: {
      assignment_id: number;
      school_id?: number;
      frequency?: string;
      start_date?: string;
      total_fee?: number;
    },
    schoolId?: number | string,
  ) => {
    const sid = schoolId ?? data.school_id;
    const qs = sid != null ? `?school_id=${sid}` : '';
    return api.post(`/api/v1/erp/finance/term-schedules/generate${qs}`, data);
  },
};

export const demandBillApi = {
  /** Web: demandBillApi.get({ month, year, class_id, school_id }) */
  get: (params: {
    month: number;
    year: number;
    class_id?: number | string;
    academic_year_id?: number | string;
    school_id?: number | string;
  }) => api.get('/api/v1/erp/finance/demand-bill', params),
  list: (params?: any) => api.get('/api/v1/erp/finance/demand-bill', params),
  create: (data: any) => api.post('/api/v1/erp/finance/demand-bill', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/finance/demand-bill/${id}`, data),
};

export const feeNotificationsApi = {
  list: (params?: any) => api.get('/api/v1/erp/finance/notifications', params),
  create: (data: any) => api.post('/api/v1/erp/finance/notifications', data),
  /** Web: feeNotificationsApi.send */
  send: (
    data: {
      school_id: number;
      student_ids: number[];
      channel: 'sms' | 'whatsapp';
      month: number;
      year: number;
      custom_message?: string;
    },
    schoolId?: number | string,
  ) => {
    const sid = schoolId ?? data.school_id;
    const qs = sid != null ? `?school_id=${sid}` : '';
    return api.post(`/api/v1/erp/finance/notifications/send${qs}`, data);
  },
};

// ============================================================
// HR & Payroll
// ============================================================

export const staffProfilesApi = {
  list: (params?: any) => api.get('/api/v1/erp/hr/staff-profiles', params),
  get: (id: number | string) => api.get(`/api/v1/erp/hr/staff-profiles/${id}`),
  getSelf: () => api.get('/api/v1/erp/hr/staff-profiles/me'),
  /** Web: staffProfilesApi.getMyProfile → `/hr/staff/me` */
  getMyProfile: (schoolId?: number | string) =>
    api.get(
      '/api/v1/erp/hr/staff/me',
      schoolId != null ? { school_id: schoolId } : undefined,
    ),
  create: (data: any) => api.post('/api/v1/erp/hr/staff-profiles', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/hr/staff-profiles/${id}`, data),
  updateSelf: (data: any) => api.put('/api/v1/erp/hr/staff-profiles/me', data),
  /** Web: staffProfilesApi.updateMyProfile → `/hr/staff/me` */
  updateMyProfile: (data: any, schoolId?: number | string) =>
    api.put(
      schoolId != null
        ? `/api/v1/erp/hr/staff/me?school_id=${schoolId}`
        : '/api/v1/erp/hr/staff/me',
      data,
    ),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/hr/staff-profiles/${id}`),
};

export const leaveTypesApi = {
  list: (params?: any) => api.get('/api/v1/erp/hr/leave-types', params),
  get: (id: number | string) => api.get(`/api/v1/erp/hr/leave-types/${id}`),
  create: (data: any) => api.post('/api/v1/erp/hr/leave-types', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/hr/leave-types/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/hr/leave-types/${id}`),
};

export const leaveApplicationsApi = {
  list: (params?: any) => api.get('/api/v1/erp/hr/leave-applications', params),
  get: (id: number | string, schoolId?: number | string) =>
    api.get(
      `/api/v1/erp/hr/leave-applications/${id}`,
      schoolId != null ? { school_id: schoolId } : undefined,
    ),
  create: (data: any) => api.post('/api/v1/erp/hr/leave-applications', data),
  update: (id: number | string, data: any, schoolId?: number | string) =>
    api.put(
      schoolId != null
        ? `/api/v1/erp/hr/leave-applications/${id}?school_id=${schoolId}`
        : `/api/v1/erp/hr/leave-applications/${id}`,
      data,
    ),
  softDelete: (id: number | string, schoolId?: number | string) =>
    api.del(
      schoolId != null
        ? `/api/v1/erp/hr/leave-applications/${id}?school_id=${schoolId}`
        : `/api/v1/erp/hr/leave-applications/${id}`,
    ),
  approve: (
    id: number | string,
    data: { status: 'approved' | 'rejected'; remarks?: string },
    schoolId?: number | string,
  ) =>
    api.post(
      schoolId != null
        ? `/api/v1/erp/hr/leave-applications/${id}/approve?school_id=${schoolId}`
        : `/api/v1/erp/hr/leave-applications/${id}/approve`,
      data,
    ),
};

export const payslipsApi = {
  list: (params?: any) => api.get('/api/v1/erp/hr/payslips', params),
  get: (id: number | string, schoolId?: number | string) =>
    api.get(
      `/api/v1/erp/hr/payslips/${id}`,
      schoolId != null ? { school_id: schoolId } : undefined,
    ),
  create: (data: any) => api.post('/api/v1/erp/hr/payslips', data),
  update: (id: number | string, data: any, schoolId?: number | string) =>
    api.put(
      schoolId != null
        ? `/api/v1/erp/hr/payslips/${id}?school_id=${schoolId}`
        : `/api/v1/erp/hr/payslips/${id}`,
      data,
    ),
  softDelete: (id: number | string, schoolId?: number | string) =>
    api.del(
      schoolId != null
        ? `/api/v1/erp/hr/payslips/${id}?school_id=${schoolId}`
        : `/api/v1/erp/hr/payslips/${id}`,
    ),
};

// ============================================================
// Library
// ============================================================

export const booksApi = {
  list: (params?: any) => api.get('/api/v1/erp/library/books', params),
  get: (id: number | string, schoolId?: number | string) =>
    api.get(
      `/api/v1/erp/library/books/${id}`,
      schoolId != null ? { school_id: schoolId } : undefined,
    ),
  create: (data: any) => api.post('/api/v1/erp/library/books', data),
  update: (id: number | string, data: any, schoolId?: number | string) =>
    api.put(
      schoolId != null
        ? `/api/v1/erp/library/books/${id}?school_id=${schoolId}`
        : `/api/v1/erp/library/books/${id}`,
      data,
    ),
  softDelete: (id: number | string, schoolId?: number | string) =>
    api.del(
      schoolId != null
        ? `/api/v1/erp/library/books/${id}?school_id=${schoolId}`
        : `/api/v1/erp/library/books/${id}`,
    ),
};

export const libraryTransactionsApi = {
  list: (params?: any) => api.get('/api/v1/erp/library/transactions', params),
  get: (id: number | string, schoolId?: number | string) =>
    api.get(
      `/api/v1/erp/library/transactions/${id}`,
      schoolId != null ? { school_id: schoolId } : undefined,
    ),
  create: (data: any) => api.post('/api/v1/erp/library/transactions', data),
  update: (id: number | string, data: any, schoolId?: number | string) =>
    api.put(
      schoolId != null
        ? `/api/v1/erp/library/transactions/${id}?school_id=${schoolId}`
        : `/api/v1/erp/library/transactions/${id}`,
      data,
    ),
  softDelete: (id: number | string, schoolId?: number | string) =>
    api.del(
      schoolId != null
        ? `/api/v1/erp/library/transactions/${id}?school_id=${schoolId}`
        : `/api/v1/erp/library/transactions/${id}`,
    ),
};

// ============================================================
// Transport
// ============================================================

export const vehiclesApi = {
  list: (params?: any) => api.get('/api/v1/erp/transport/vehicles', params),
  get: (id: number | string) => api.get(`/api/v1/erp/transport/vehicles/${id}`),
  create: (data: any) => api.post('/api/v1/erp/transport/vehicles', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/transport/vehicles/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/transport/vehicles/${id}`),
};

export const routesApi = {
  list: (params?: any) => api.get('/api/v1/erp/transport/routes', params),
  get: (id: number | string) => api.get(`/api/v1/erp/transport/routes/${id}`),
  create: (data: any) => api.post('/api/v1/erp/transport/routes', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/transport/routes/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/transport/routes/${id}`),
};

export const transportAssignmentsApi = {
  list: (params?: any) => api.get('/api/v1/erp/transport/assignments', params),
  get: (id: number | string) => api.get(`/api/v1/erp/transport/assignments/${id}`),
  create: (data: any) => api.post('/api/v1/erp/transport/assignments', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/transport/assignments/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/transport/assignments/${id}`),
};

// ============================================================
// Hostel
// ============================================================

export const hostelRoomsApi = {
  list: (params?: any) => api.get('/api/v1/erp/hostel/rooms', params),
  get: (id: number | string) => api.get(`/api/v1/erp/hostel/rooms/${id}`),
  create: (data: any) => api.post('/api/v1/erp/hostel/rooms', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/hostel/rooms/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/hostel/rooms/${id}`),
};

export const hostelAllocationsApi = {
  list: (params?: any) => api.get('/api/v1/erp/hostel/allocations', params),
  get: (id: number | string) => api.get(`/api/v1/erp/hostel/allocations/${id}`),
  create: (data: any) => api.post('/api/v1/erp/hostel/allocations', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/hostel/allocations/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/hostel/allocations/${id}`),
};

export const hostelComplaintsApi = {
  list: (params?: any) => api.get('/api/v1/erp/hostel/complaints', params),
  get: (id: number | string) => api.get(`/api/v1/erp/hostel/complaints/${id}`),
  create: (data: any) => api.post('/api/v1/erp/hostel/complaints', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/hostel/complaints/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/hostel/complaints/${id}`),
};

// ============================================================
// Inventory
// ============================================================

export const inventoryItemsApi = {
  list: (params?: any) => api.get('/api/v1/erp/inventory/items', params),
  get: (id: number | string) => api.get(`/api/v1/erp/inventory/items/${id}`),
  create: (data: any) => api.post('/api/v1/erp/inventory/items', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/inventory/items/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/inventory/items/${id}`),
};

export const purchaseOrdersApi = {
  list: (params?: any) => api.get('/api/v1/erp/inventory/purchase-orders', params),
  get: (id: number | string) =>
    api.get(`/api/v1/erp/inventory/purchase-orders/${id}`),
  create: (data: any) => api.post('/api/v1/erp/inventory/purchase-orders', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/inventory/purchase-orders/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/inventory/purchase-orders/${id}`),
};

export const stockMovementsApi = {
  list: (params?: any) => api.get('/api/v1/erp/inventory/stock-movements', params),
  get: (id: number | string) =>
    api.get(`/api/v1/erp/inventory/stock-movements/${id}`),
  create: (data: any) => api.post('/api/v1/erp/inventory/stock-movements', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/inventory/stock-movements/${id}`, data),
};

// ============================================================
// Engagement — web StudentEngagementTab parity
// Base: /api/v1/erp/engagement
// ============================================================

const withSchool = (path: string, schoolId?: number | string) =>
  schoolId != null ? `${path}?school_id=${schoolId}` : path;

export const studentCouncilsApi = {
  list: (params?: any) => api.get('/api/v1/erp/engagement/councils', params),
  get: (id: number | string, schoolId?: number | string) =>
    api.get(`/api/v1/erp/engagement/councils/${id}`, schoolId != null ? { school_id: schoolId } : undefined),
  create: (data: any) => api.post('/api/v1/erp/engagement/councils', data),
  update: (id: number | string, data: any, schoolId?: number | string) =>
    api.put(withSchool(`/api/v1/erp/engagement/councils/${id}`, schoolId), data),
  softDelete: (id: number | string, schoolId?: number | string) =>
    api.del(withSchool(`/api/v1/erp/engagement/councils/${id}`, schoolId)),
};

export const councilMembersApi = {
  list: (params?: any) => api.get('/api/v1/erp/engagement/council-members', params),
  get: (id: number | string, schoolId?: number | string) =>
    api.get(`/api/v1/erp/engagement/council-members/${id}`, schoolId != null ? { school_id: schoolId } : undefined),
  create: (data: any) => api.post('/api/v1/erp/engagement/council-members', data),
  update: (id: number | string, data: any, schoolId?: number | string) =>
    api.put(withSchool(`/api/v1/erp/engagement/council-members/${id}`, schoolId), data),
  softDelete: (id: number | string, schoolId?: number | string) =>
    api.del(withSchool(`/api/v1/erp/engagement/council-members/${id}`, schoolId)),
};

export const studentGrievancesApi = {
  list: (params?: any) => api.get('/api/v1/erp/engagement/grievances', params),
  get: (id: number | string, schoolId?: number | string) =>
    api.get(`/api/v1/erp/engagement/grievances/${id}`, schoolId != null ? { school_id: schoolId } : undefined),
  create: (data: any) => api.post('/api/v1/erp/engagement/grievances', data),
  update: (id: number | string, data: any, schoolId?: number | string) =>
    api.put(withSchool(`/api/v1/erp/engagement/grievances/${id}`, schoolId), data),
  softDelete: (id: number | string, schoolId?: number | string) =>
    api.del(withSchool(`/api/v1/erp/engagement/grievances/${id}`, schoolId)),
};

export const eventsApi = {
  list: (params?: any) => api.get('/api/v1/erp/engagement/events', params),
  get: (id: number | string, schoolId?: number | string) =>
    api.get(`/api/v1/erp/engagement/events/${id}`, schoolId != null ? { school_id: schoolId } : undefined),
  create: (data: any) => api.post('/api/v1/erp/engagement/events', data),
  update: (id: number | string, data: any, schoolId?: number | string) =>
    api.put(withSchool(`/api/v1/erp/engagement/events/${id}`, schoolId), data),
  softDelete: (id: number | string, schoolId?: number | string) =>
    api.del(withSchool(`/api/v1/erp/engagement/events/${id}`, schoolId)),
};

export const eventRegistrationsApi = {
  list: (params?: any) => api.get('/api/v1/erp/engagement/event-registrations', params),
  get: (id: number | string, schoolId?: number | string) =>
    api.get(`/api/v1/erp/engagement/event-registrations/${id}`, schoolId != null ? { school_id: schoolId } : undefined),
  create: (data: any) => api.post('/api/v1/erp/engagement/event-registrations', data),
  update: (id: number | string, data: any, schoolId?: number | string) =>
    api.put(withSchool(`/api/v1/erp/engagement/event-registrations/${id}`, schoolId), data),
  softDelete: (id: number | string, schoolId?: number | string) =>
    api.del(withSchool(`/api/v1/erp/engagement/event-registrations/${id}`, schoolId)),
};

export const galleryApi = {
  list: (params?: any) => api.get('/api/v1/erp/engagement/gallery', params),
  get: (id: number | string, schoolId?: number | string) =>
    api.get(`/api/v1/erp/engagement/gallery/${id}`, schoolId != null ? { school_id: schoolId } : undefined),
  create: (data: any) => api.post('/api/v1/erp/engagement/gallery', data),
  update: (id: number | string, data: any, schoolId?: number | string) =>
    api.put(withSchool(`/api/v1/erp/engagement/gallery/${id}`, schoolId), data),
  softDelete: (id: number | string, schoolId?: number | string) =>
    api.del(withSchool(`/api/v1/erp/engagement/gallery/${id}`, schoolId)),
};

// ============================================================
// Parent Portal
// ============================================================

export const ptmSchedulesApi = {
  list: (params?: any) =>
    api.get('/api/v1/erp/parent-portal/ptm-schedules', params),
  get: (id: number | string) =>
    api.get(`/api/v1/erp/parent-portal/ptm-schedules/${id}`),
  create: (data: any) =>
    api.post('/api/v1/erp/parent-portal/ptm-schedules', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/parent-portal/ptm-schedules/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/parent-portal/ptm-schedules/${id}`),
};

export const ptmAppointmentsApi = {
  list: (params?: any) =>
    api.get('/api/v1/erp/parent-portal/appointments', params),
  get: (id: number | string) =>
    api.get(`/api/v1/erp/parent-portal/appointments/${id}`),
  create: (data: any) =>
    api.post('/api/v1/erp/parent-portal/appointments', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/parent-portal/appointments/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/parent-portal/appointments/${id}`),
};

export const parentCommunicationsApi = {
  list: (params?: any) =>
    api.get('/api/v1/erp/parent-portal/communications', params),
  get: (id: number | string) =>
    api.get(`/api/v1/erp/parent-portal/communications/${id}`),
  create: (data: any) =>
    api.post('/api/v1/erp/parent-portal/communications', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/parent-portal/communications/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/parent-portal/communications/${id}`),
};

// ============================================================
// Biometric
// ============================================================

export const biometricDevicesApi = {
  list: (params?: any) => api.get('/api/v1/erp/biometric/devices', params),
  get: (id: number | string) => api.get(`/api/v1/erp/biometric/devices/${id}`),
  create: (data: any) => api.post('/api/v1/erp/biometric/devices', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/biometric/devices/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/biometric/devices/${id}`),
};

export const biometricEnrollmentsApi = {
  list: (params?: any) => api.get('/api/v1/erp/biometric/enrollments', params),
  get: (id: number | string) =>
    api.get(`/api/v1/erp/biometric/enrollments/${id}`),
  create: (data: any) => api.post('/api/v1/erp/biometric/enrollments', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/biometric/enrollments/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/biometric/enrollments/${id}`),
};

export const biometricLogsApi = {
  list: (params?: any) => api.get('/api/v1/erp/biometric/logs', params),
  get: (id: number | string) => api.get(`/api/v1/erp/biometric/logs/${id}`),
};

// ============================================================
// Analytics
// ============================================================

export const reportTemplatesApi = {
  list: (params?: any) =>
    api.get('/api/v1/erp/analytics/report-templates', params),
  get: (id: number | string) =>
    api.get(`/api/v1/erp/analytics/report-templates/${id}`),
  create: (data: any) =>
    api.post('/api/v1/erp/analytics/report-templates', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/analytics/report-templates/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/analytics/report-templates/${id}`),
};

export const reportSnapshotsApi = {
  list: (params?: any) => api.get('/api/v1/erp/analytics/snapshots', params),
  get: (id: number | string) =>
    api.get(`/api/v1/erp/analytics/snapshots/${id}`),
  create: (data: any) => api.post('/api/v1/erp/analytics/snapshots', data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/analytics/snapshots/${id}`),
};

export const dashboardWidgetsApi = {
  list: (params?: any) => api.get('/api/v1/erp/analytics/widgets', params),
  get: (id: number | string) => api.get(`/api/v1/erp/analytics/widgets/${id}`),
  create: (data: any) => api.post('/api/v1/erp/analytics/widgets', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/analytics/widgets/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/analytics/widgets/${id}`),
};

// ============================================================
// Holidays
// ============================================================

export const holidaysApi = {
  list: (params?: any) => api.get('/api/v1/erp/holidays', params),
  getAll: (params?: any) => api.get('/api/v1/erp/holidays', params),
  get: (id: number | string, schoolId?: number | string) =>
    api.get(
      `/api/v1/erp/holidays/${id}`,
      schoolId != null ? { school_id: schoolId } : undefined,
    ),
  create: (data: any) => api.post('/api/v1/erp/holidays', data),
  update: (id: number | string, data: any, schoolId?: number | string) =>
    api.put(
      schoolId != null
        ? `/api/v1/erp/holidays/${id}?school_id=${schoolId}`
        : `/api/v1/erp/holidays/${id}`,
      data,
    ),
  softDelete: (id: number | string, schoolId?: number | string) =>
    api.del(
      schoolId != null
        ? `/api/v1/erp/holidays/${id}?school_id=${schoolId}`
        : `/api/v1/erp/holidays/${id}`,
    ),
};

// ============================================================
// Forms/FormBuilder
// ============================================================

export const formTemplatesApi = {
  list: (params?: any) => api.get('/api/v1/erp/form-builder/templates', params),
  get: (id: number | string) => api.get(`/api/v1/erp/form-builder/templates/${id}`),
  create: (data: any) => api.post('/api/v1/erp/form-builder/templates', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/form-builder/templates/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/form-builder/templates/${id}`),
};

export const formResponsesApi = {
  list: (params?: any) => api.get('/api/v1/erp/form-builder/responses', params),
  get: (id: number | string) => api.get(`/api/v1/erp/form-builder/responses/${id}`),
  create: (data: any) => api.post('/api/v1/erp/form-builder/responses', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/form-builder/responses/${id}`, data),
};

// ============================================================
// Quiz Navigation Items (Assessment Tab Permissions)
// Controls which assessment generation tabs are visible per role.
// ============================================================

export interface QuizNavItem {
  id?: number;
  route_path: string;
  icon: string;
  label: string;
  description?: string;
  is_active: boolean;
  display_order: number;
  roles_allowed: string[];
  nav_section?: string;
  role?: string;
  role_id?: number;
  school_id?: number;
  component_path?: string;
  component_name?: string;
  created_at?: string;
  updated_at?: string;
}

export const quizNavItemsApi = {
  /** Fetch all active navigation items, optionally filtered by role */
  list: (params?: { roles?: string; is_active?: boolean; _sort?: string; _order?: string }) =>
    api.get('/api/v1/quiz-navigation-items', params ?? {}),
  /** Fetch items for a specific role (client-side filtered from getAll) */
  getForRole: async (role: string): Promise<QuizNavItem[]> => {
    const normalizedRole = String(role ?? '').trim().toLowerCase();
    const roleVariants = Array.from(new Set([
      normalizedRole,
      ...(normalizedRole === 'instructor' ? ['teacher'] : []),
      ...(normalizedRole === 'teacher' ? ['instructor'] : []),
      ...(normalizedRole === 'admin' ? ['super_admin'] : []),
      ...(normalizedRole === 'super_admin' ? ['admin'] : []),
    ])).filter(Boolean);

    const data: any = await api.get('/api/v1/quiz-navigation-items', {
      is_active: true,
      roles: roleVariants.join(','),
      _sort: 'display_order',
      _order: 'asc',
    });
    const items: QuizNavItem[] = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
    return items.filter(
      (item) => {
        const allowed = Array.isArray(item.roles_allowed)
          ? item.roles_allowed.map((r) => String(r).trim().toLowerCase())
          : [];
        return item.is_active && (!allowed.length || roleVariants.some((r) => allowed.includes(r)));
      },
    );
  },
};

