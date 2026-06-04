import { create } from 'zustand';

export type WorkspaceMode = 'document' | 'handwritten';

export interface WorkspaceAiSettings {
  classValue: string;
  subject: string;
  lesson: string;
  difficulty: 'easy' | 'medium' | 'hard' | '';
  questionCount: number;
  additionalInstructions: string;
}

interface AssessmentWorkspaceState {
  mode: WorkspaceMode;
  centerTab: 'preview' | 'quiz' | 'worksheet' | 'history';
  aiSettings: WorkspaceAiSettings;

  setMode: (mode: WorkspaceMode) => void;
  setCenterTab: (tab: AssessmentWorkspaceState['centerTab']) => void;
  updateAiSettings: (patch: Partial<WorkspaceAiSettings>) => void;
  resetWorkspace: () => void;
}

const defaultAiSettings: WorkspaceAiSettings = {
  classValue: '',
  subject: '',
  lesson: '',
  difficulty: 'medium',
  questionCount: 20,
  additionalInstructions: '',
};

const initialState = {
  mode: 'document' as WorkspaceMode,
  centerTab: 'preview' as const,
  aiSettings: defaultAiSettings,
};

export const useAssessmentWorkspaceStore = create<AssessmentWorkspaceState>((set) => ({
  ...initialState,

  setMode: (mode) => set({ mode }),

  setCenterTab: (centerTab) => set({ centerTab }),

  updateAiSettings: (patch) => set((state) => ({
    aiSettings: {
      ...state.aiSettings,
      ...patch,
    },
  })),

  resetWorkspace: () => set(initialState),
}));
