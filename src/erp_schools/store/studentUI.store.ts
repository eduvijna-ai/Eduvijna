/**
 * Student UI Store (Zustand)
 *
 * Cross-screen UI state for the Student module (continues the app's Zustand
 * pattern, mirrors teacherUI.store). Holds only ephemeral UI selections — never
 * server data, which (for now) comes from typed mock fixtures in ../data/student.
 */

import { create } from 'zustand';

interface StudentUIState {
  /** Selected academic year shown in the identity header pickers. */
  academicYear: string;
  /** Persisted term window across analytics screens. */
  termRange: string;
  setAcademicYear: (year: string) => void;
  setTermRange: (range: string) => void;
  reset: () => void;
}

const initialState = {
  academicYear: '2024-25',
  termRange: 'This Term',
};

export const useStudentUIStore = create<StudentUIState>((set) => ({
  ...initialState,
  setAcademicYear: (academicYear) => set({ academicYear }),
  setTermRange: (termRange) => set({ termRange }),
  reset: () => set(initialState),
}));
