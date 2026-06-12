/**
 * Admin UI Store (Zustand)
 *
 * Cross-screen UI state for the Admin module (continues the app's Zustand
 * pattern, mirrors teacherUI / studentUI stores). Holds only ephemeral UI
 * selections — never server data, which (for now) comes from typed mock
 * fixtures in ../data/admin.
 */

import { create } from 'zustand';

interface AdminUIState {
  /** Selected reporting range shown in dashboard pickers. */
  dateRange: string;
  /** Academic year shown in headers. */
  academicYear: string;
  setDateRange: (range: string) => void;
  setAcademicYear: (year: string) => void;
  reset: () => void;
}

const initialState = {
  dateRange: 'This Week',
  academicYear: '2026-27',
};

export const useAdminUIStore = create<AdminUIState>((set) => ({
  ...initialState,
  setDateRange: (dateRange) => set({ dateRange }),
  setAcademicYear: (academicYear) => set({ academicYear }),
  reset: () => set(initialState),
}));
