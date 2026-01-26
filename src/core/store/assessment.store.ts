/**
 * Assessment Store (Zustand)
 * Manages assessment data globally
 * ONLY stores backend data - NO UI state
 */

import { create } from 'zustand';
import type { Assessment, StudentAssessment } from '../types';

interface AssessmentState {
  // State
  assessments: Assessment[];
  studentAssessments: StudentAssessment[];
  currentAssessment: Assessment | null;
  isLoading: boolean;
  
  // Actions
  setAssessments: (assessments: Assessment[]) => void;
  setStudentAssessments: (assessments: StudentAssessment[]) => void;
  setCurrentAssessment: (assessment: Assessment | null) => void;
  addAssessment: (assessment: Assessment) => void;
  updateAssessment: (id: string, data: Partial<Assessment>) => void;
  removeAssessment: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  reset: () => void;
}

const initialState = {
  assessments: [],
  studentAssessments: [],
  currentAssessment: null,
  isLoading: false,
};

/**
 * Assessment store
 */
export const useAssessmentStore = create<AssessmentState>((set) => ({
  ...initialState,
  
  setAssessments: (assessments) => set({ assessments }),
  
  setStudentAssessments: (studentAssessments) => set({ studentAssessments }),
  
  setCurrentAssessment: (currentAssessment) => set({ currentAssessment }),
  
  addAssessment: (assessment) => set((state) => ({
    assessments: [...state.assessments, assessment],
  })),
  
  updateAssessment: (id, data) => set((state) => ({
    assessments: state.assessments.map((assessment) =>
      assessment.id === id ? { ...assessment, ...data } : assessment
    ),
  })),
  
  removeAssessment: (id) => set((state) => ({
    assessments: state.assessments.filter((assessment) => assessment.id !== id),
  })),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  reset: () => set(initialState),
}));

/**
 * Selectors for accessing assessment state
 */
export const selectAssessments = (state: AssessmentState) => state.assessments;
export const selectStudentAssessments = (state: AssessmentState) => state.studentAssessments;
export const selectCurrentAssessment = (state: AssessmentState) => state.currentAssessment;
export const selectIsLoading = (state: AssessmentState) => state.isLoading;

/**
 * Selector to get assessment by ID
 */
export const selectAssessmentById = (id: string) => (state: AssessmentState) =>
  state.assessments.find((assessment) => assessment.id === id);
