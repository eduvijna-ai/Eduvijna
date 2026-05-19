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

export const studentProfilesApi = {
  list: (params?: any) => api.get('/api/v1/erp/sis/student-profiles', params),
  get: (id: number | string) => api.get(`/api/v1/erp/sis/student-profiles/${id}`),
  create: (data: any) => api.post('/api/v1/erp/sis/student-profiles', data),
  update: (id: number | string, data: any) => api.put(`/api/v1/erp/sis/student-profiles/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/sis/student-profiles/${id}`),
};

export const guardiansApi = {
  list: (params?: any) => api.get('/api/v1/erp/sis/guardians', params),
  get: (id: number | string) => api.get(`/api/v1/erp/sis/guardians/${id}`),
  create: (data: any) => api.post('/api/v1/erp/sis/guardians', data),
  update: (id: number | string, data: any) => api.put(`/api/v1/erp/sis/guardians/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/sis/guardians/${id}`),
};

export const medicalApi = {
  list: (params?: any) => api.get('/api/v1/erp/sis/medical', params),
  get: (id: number | string) => api.get(`/api/v1/erp/sis/medical/${id}`),
  create: (data: any) => api.post('/api/v1/erp/sis/medical', data),
  update: (id: number | string, data: any) => api.put(`/api/v1/erp/sis/medical/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/sis/medical/${id}`),
};

export const documentsApi = {
  list: (params?: any) => api.get('/api/v1/erp/sis/documents', params),
  get: (id: number | string) => api.get(`/api/v1/erp/sis/documents/${id}`),
  create: (data: any) => api.post('/api/v1/erp/sis/documents', data),
  update: (id: number | string, data: any) => api.put(`/api/v1/erp/sis/documents/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/sis/documents/${id}`),
};

export const uploadApi = {
  upload: (formData: FormData) =>
    apiClient.post('/api/v1/erp/sis/upload', formData, {
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
};

export const attendanceRecordsApi = {
  list: (params?: any) => api.get('/api/v1/erp/attendance/records', params),
  getAll: (params?: any) => api.get('/api/v1/erp/attendance/records', params),
  // Monthly grid: returns { students, working_dates, summary_* fields }
  monthlyGrid: (params?: any) => api.get('/api/v1/erp/attendance/monthly-grid', params),
  // Student summary for My Attendance (student role)
  studentSummary: (params?: any) => api.get('/api/v1/erp/attendance/reports/student-summary', params),
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
  approveRecord: (recordId: number | string, action: 'approved' | 'rejected', params?: any) =>
    api.post(`/api/v1/erp/staff-attendance/records/${recordId}/approve`, { action, ...params }),
  summary: (params?: any) => api.get('/api/v1/erp/staff-attendance/reports/summary', params),
};

// ============================================================
// Notices
// ============================================================

export const noticesApi = {
  list: (params?: any) => api.get('/api/v1/erp/notices', params),
  getAll: (params?: any) => api.get('/api/v1/erp/notices', params),
  get: (id: number | string) => api.get(`/api/v1/erp/notices/${id}`),
  create: (data: any) => api.post('/api/v1/erp/notices', data),
  update: (id: number | string, data: any) => api.put(`/api/v1/erp/notices/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/notices/${id}`),
};

// ============================================================
// Dashboard
// ============================================================

export const erpDashboardApi = {
  get: (days: number = 7, schoolId?: number | string) =>
    api.get('/api/v1/erp/dashboard/summary', { days, school_id: schoolId }),
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
// Exams
// ============================================================

export const examGroupsApi = {
  list: (params?: any) => api.get('/api/v1/erp/exams/groups', params),
  get: (id: number | string) => api.get(`/api/v1/erp/exams/groups/${id}`),
  create: (data: any) => api.post('/api/v1/erp/exams/groups', data),
  update: (id: number | string, data: any) => api.put(`/api/v1/erp/exams/groups/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/exams/groups/${id}`),
};

export const examGroupItemsApi = {
  list: (groupId: number | string, params?: any) =>
    api.get(`/api/v1/erp/exams/groups/${groupId}/items`, params),
  create: (groupId: number | string, data: any) =>
    api.post(`/api/v1/erp/exams/groups/${groupId}/items`, data),
  update: (groupId: number | string, itemId: number | string, data: any) =>
    api.put(`/api/v1/erp/exams/groups/${groupId}/items/${itemId}`, data),
  softDelete: (groupId: number | string, itemId: number | string) =>
    api.del(`/api/v1/erp/exams/groups/${groupId}/items/${itemId}`),
};

export const examGradesApi = {
  list: (groupId: number | string, params?: any) =>
    api.get(`/api/v1/erp/exams/groups/${groupId}/grades`, params),
  create: (groupId: number | string, data: any) =>
    api.post(`/api/v1/erp/exams/groups/${groupId}/grades`, data),
  update: (groupId: number | string, gradeId: number | string, data: any) =>
    api.put(`/api/v1/erp/exams/groups/${groupId}/grades/${gradeId}`, data),
  softDelete: (groupId: number | string, gradeId: number | string) =>
    api.del(`/api/v1/erp/exams/groups/${groupId}/grades/${gradeId}`),
};

export const examStudentsApi = {
  list: (groupId: number | string, params?: any) =>
    api.get(`/api/v1/erp/exams/groups/${groupId}/students`, params),
};

export const examSubjectsApi = {
  getByClass: (classId: number | string, params?: any) =>
    api.get(`/api/v1/erp/exams/subjects-by-class/${classId}`, params),
};

export const examSectionsApi = {
  list: (params?: any) => api.get('/api/v1/erp/exams/sections', params),
};

export const examAllItemsApi = {
  list: (params?: any) => api.get('/api/v1/erp/exams/all-items', params),
};

export const examsApi = {
  list: (params?: any) => api.get('/api/v1/erp/exams', params),
  get: (id: number | string) => api.get(`/api/v1/erp/exams/${id}`),
  create: (data: any) => api.post('/api/v1/erp/exams', data),
  update: (id: number | string, data: any) => api.put(`/api/v1/erp/exams/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/exams/${id}`),
};

export const examSchedulesApi = {
  list: (params?: any) => api.get('/api/v1/erp/exams/schedules', params),
  get: (id: number | string) => api.get(`/api/v1/erp/exams/schedules/${id}`),
  create: (data: any) => api.post('/api/v1/erp/exams/schedules', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/exams/schedules/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/exams/schedules/${id}`),
};

export const examMarksApi = {
  list: (params?: any) => api.get('/api/v1/erp/exams/marks/list', params),
  get: (id: number | string) => api.get(`/api/v1/erp/exams/marks/${id}`),
  create: (data: any) => api.post('/api/v1/erp/exams/marks', data),
  update: (id: number | string, data: any) => api.put(`/api/v1/erp/exams/marks/${id}`, data),
  bulkUpsert: (data: any) => api.post('/api/v1/erp/exams/marks/bulk', data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/exams/marks/${id}`),
};

export const examResultsApi = {
  list: (params?: any) => api.get('/api/v1/erp/exams/results', params),
  get: (id: number | string) => api.get(`/api/v1/erp/exams/results/${id}`),
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
};

// ============================================================
// LMS
// ============================================================

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
};

export const studentsLookupApi = {
  search: (params?: any) => api.get('/api/v1/erp/finance/students-lookup', params),
};

export const studentFeeAssignmentsApi = {
  list: (params?: any) => api.get('/api/v1/erp/finance/student-fee-assignments', params),
  get: (id: number | string) => api.get(`/api/v1/erp/finance/student-fee-assignments/${id}`),
  create: (data: any) => api.post('/api/v1/erp/finance/student-fee-assignments', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/finance/student-fee-assignments/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/finance/student-fee-assignments/${id}`),
};

export const feeTermSchedulesApi = {
  list: (params?: any) => api.get('/api/v1/erp/finance/term-schedules', params),
  get: (id: number | string) => api.get(`/api/v1/erp/finance/term-schedules/${id}`),
  create: (data: any) => api.post('/api/v1/erp/finance/term-schedules', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/finance/term-schedules/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/finance/term-schedules/${id}`),
};

export const demandBillApi = {
  list: (params?: any) => api.get('/api/v1/erp/finance/demand-bill', params),
  get: (id: number | string) => api.get(`/api/v1/erp/finance/demand-bill/${id}`),
  create: (data: any) => api.post('/api/v1/erp/finance/demand-bill', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/finance/demand-bill/${id}`, data),
};

export const feeNotificationsApi = {
  list: (params?: any) => api.get('/api/v1/erp/finance/notifications', params),
  create: (data: any) => api.post('/api/v1/erp/finance/notifications', data),
};

// ============================================================
// HR & Payroll
// ============================================================

export const staffProfilesApi = {
  list: (params?: any) => api.get('/api/v1/erp/hr/staff-profiles', params),
  get: (id: number | string) => api.get(`/api/v1/erp/hr/staff-profiles/${id}`),
  getSelf: () => api.get('/api/v1/erp/hr/staff-profiles/me'),
  create: (data: any) => api.post('/api/v1/erp/hr/staff-profiles', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/hr/staff-profiles/${id}`, data),
  updateSelf: (data: any) => api.put('/api/v1/erp/hr/staff-profiles/me', data),
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
  get: (id: number | string) => api.get(`/api/v1/erp/hr/leave-applications/${id}`),
  create: (data: any) => api.post('/api/v1/erp/hr/leave-applications', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/hr/leave-applications/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/hr/leave-applications/${id}`),
  approve: (id: number | string, data: { status: 'approved' | 'rejected'; remarks?: string }) =>
    api.post(`/api/v1/erp/hr/leave-applications/${id}/approve`, data),
};

export const payslipsApi = {
  list: (params?: any) => api.get('/api/v1/erp/hr/payslips', params),
  get: (id: number | string) => api.get(`/api/v1/erp/hr/payslips/${id}`),
  create: (data: any) => api.post('/api/v1/erp/hr/payslips', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/hr/payslips/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/hr/payslips/${id}`),
};

// ============================================================
// Library
// ============================================================

export const booksApi = {
  list: (params?: any) => api.get('/api/v1/erp/library/books', params),
  get: (id: number | string) => api.get(`/api/v1/erp/library/books/${id}`),
  create: (data: any) => api.post('/api/v1/erp/library/books', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/library/books/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/library/books/${id}`),
};

export const libraryTransactionsApi = {
  list: (params?: any) => api.get('/api/v1/erp/library/transactions', params),
  get: (id: number | string) => api.get(`/api/v1/erp/library/transactions/${id}`),
  create: (data: any) => api.post('/api/v1/erp/library/transactions', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/library/transactions/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/library/transactions/${id}`),
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
// Engagement
// ============================================================

export const studentCouncilsApi = {
  list: (params?: any) => api.get('/api/v1/erp/engagement/councils', params),
  get: (id: number | string) => api.get(`/api/v1/erp/engagement/councils/${id}`),
  create: (data: any) => api.post('/api/v1/erp/engagement/councils', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/engagement/councils/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/engagement/councils/${id}`),
};

export const councilMembersApi = {
  list: (params?: any) => api.get('/api/v1/erp/engagement/members', params),
  get: (id: number | string) => api.get(`/api/v1/erp/engagement/members/${id}`),
  create: (data: any) => api.post('/api/v1/erp/engagement/members', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/engagement/members/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/engagement/members/${id}`),
};

export const studentGrievancesApi = {
  list: (params?: any) => api.get('/api/v1/erp/engagement/grievances', params),
  get: (id: number | string) => api.get(`/api/v1/erp/engagement/grievances/${id}`),
  create: (data: any) => api.post('/api/v1/erp/engagement/grievances', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/engagement/grievances/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/engagement/grievances/${id}`),
};

export const eventsApi = {
  list: (params?: any) => api.get('/api/v1/erp/engagement/events', params),
  get: (id: number | string) => api.get(`/api/v1/erp/engagement/events/${id}`),
  create: (data: any) => api.post('/api/v1/erp/engagement/events', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/engagement/events/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/engagement/events/${id}`),
};

export const eventRegistrationsApi = {
  list: (params?: any) => api.get('/api/v1/erp/engagement/registrations', params),
  get: (id: number | string) =>
    api.get(`/api/v1/erp/engagement/registrations/${id}`),
  create: (data: any) => api.post('/api/v1/erp/engagement/registrations', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/engagement/registrations/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/engagement/registrations/${id}`),
};

export const galleryApi = {
  list: (params?: any) => api.get('/api/v1/erp/engagement/gallery', params),
  get: (id: number | string) => api.get(`/api/v1/erp/engagement/gallery/${id}`),
  create: (data: any) => api.post('/api/v1/erp/engagement/gallery', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/engagement/gallery/${id}`, data),
  softDelete: (id: number | string) =>
    api.del(`/api/v1/erp/engagement/gallery/${id}`),
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
  get: (id: number | string) => api.get(`/api/v1/erp/holidays/${id}`),
  create: (data: any) => api.post('/api/v1/erp/holidays', data),
  update: (id: number | string, data: any) =>
    api.put(`/api/v1/erp/holidays/${id}`, data),
  softDelete: (id: number | string) => api.del(`/api/v1/erp/holidays/${id}`),
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

