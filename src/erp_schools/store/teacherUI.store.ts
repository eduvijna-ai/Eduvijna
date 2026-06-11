/**
 * Teacher UI Store (Zustand)
 *
 * Cross-screen UI state for the Teacher module (continues the app's Zustand
 * pattern). This holds only ephemeral UI selections — never server data, which
 * (for now) comes from typed mock fixtures in ../data.
 */

import { create } from 'zustand';

interface TeacherUIState {
  /** Currently focused class across class-scoped screens. */
  activeClassId: string | null;
  /** Overview window on the dashboard ("This Week" / "This Month" / "Today"). */
  overviewRange: string;
  setActiveClassId: (id: string | null) => void;
  setOverviewRange: (range: string) => void;
  reset: () => void;
}

const initialState = {
  activeClassId: null as string | null,
  overviewRange: 'This Week',
};

export const useTeacherUIStore = create<TeacherUIState>((set) => ({
  ...initialState,
  setActiveClassId: (activeClassId) => set({ activeClassId }),
  setOverviewRange: (overviewRange) => set({ overviewRange }),
  reset: () => set(initialState),
}));
