/**
 * assessmentWorkspace.store.test.ts
 *
 * Unit tests for the Zustand assessment workspace store.
 * Tests all state mutations and verifies initial state matches requirements.
 */

import { act, renderHook } from '@testing-library/react-native';
import {
  useAssessmentWorkspaceStore,
  type WorkspaceMode,
  type WorkspaceAiSettings,
} from '../core/store/assessmentWorkspace.store';

// Reset store state before every test
beforeEach(() => {
  act(() => {
    useAssessmentWorkspaceStore.getState().resetWorkspace();
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('assessmentWorkspace.store – initial state', () => {
  it('starts in document mode', () => {
    const { result } = renderHook(() => useAssessmentWorkspaceStore());
    expect(result.current.mode).toBe('document');
  });

  it('starts on the preview / setup tab', () => {
    const { result } = renderHook(() => useAssessmentWorkspaceStore());
    expect(result.current.centerTab).toBe('preview');
  });

  it('starts with empty AI settings strings', () => {
    const { result } = renderHook(() => useAssessmentWorkspaceStore());
    const s = result.current.aiSettings;
    expect(s.classValue).toBe('');
    expect(s.subject).toBe('');
    expect(s.lesson).toBe('');
    expect(s.additionalInstructions).toBe('');
  });

  it('default difficulty is medium', () => {
    const { result } = renderHook(() => useAssessmentWorkspaceStore());
    expect(result.current.aiSettings.difficulty).toBe('medium');
  });

  it('default question count is 20', () => {
    const { result } = renderHook(() => useAssessmentWorkspaceStore());
    expect(result.current.aiSettings.questionCount).toBe(20);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('assessmentWorkspace.store – setMode', () => {
  it('switches to handwritten mode', () => {
    const { result } = renderHook(() => useAssessmentWorkspaceStore());
    act(() => { result.current.setMode('handwritten'); });
    expect(result.current.mode).toBe('handwritten');
  });

  it('switches back to document mode', () => {
    const { result } = renderHook(() => useAssessmentWorkspaceStore());
    act(() => {
      result.current.setMode('handwritten');
      result.current.setMode('document');
    });
    expect(result.current.mode).toBe('document');
  });

  it('only accepts WorkspaceMode values (document | handwritten)', () => {
    const { result } = renderHook(() => useAssessmentWorkspaceStore());
    const validModes: WorkspaceMode[] = ['document', 'handwritten'];
    validModes.forEach((m) => {
      act(() => { result.current.setMode(m); });
      expect(result.current.mode).toBe(m);
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('assessmentWorkspace.store – setCenterTab', () => {
  const TABS = ['preview', 'quiz', 'worksheet', 'history'] as const;

  TABS.forEach((tab) => {
    it(`can switch to ${tab} tab`, () => {
      const { result } = renderHook(() => useAssessmentWorkspaceStore());
      act(() => { result.current.setCenterTab(tab); });
      expect(result.current.centerTab).toBe(tab);
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('assessmentWorkspace.store – updateAiSettings', () => {
  it('merges a single field without losing others', () => {
    const { result } = renderHook(() => useAssessmentWorkspaceStore());
    act(() => { result.current.updateAiSettings({ subject: 'Physics' }); });
    expect(result.current.aiSettings.subject).toBe('Physics');
    // Other fields remain at default
    expect(result.current.aiSettings.classValue).toBe('');
  });

  it('merges multiple fields at once', () => {
    const { result } = renderHook(() => useAssessmentWorkspaceStore());
    act(() => {
      result.current.updateAiSettings({
        classValue: 'Class 10',
        subject: 'Chemistry',
        lesson: 'Atoms',
        difficulty: 'hard',
        questionCount: 15,
        additionalInstructions: 'Focus on numericals',
      });
    });
    const s = result.current.aiSettings;
    expect(s.classValue).toBe('Class 10');
    expect(s.subject).toBe('Chemistry');
    expect(s.lesson).toBe('Atoms');
    expect(s.difficulty).toBe('hard');
    expect(s.questionCount).toBe(15);
    expect(s.additionalInstructions).toBe('Focus on numericals');
  });

  it('accepts all three difficulty values', () => {
    const { result } = renderHook(() => useAssessmentWorkspaceStore());
    (['easy', 'medium', 'hard'] as const).forEach((d) => {
      act(() => { result.current.updateAiSettings({ difficulty: d }); });
      expect(result.current.aiSettings.difficulty).toBe(d);
    });
  });

  it('updates questionCount to any allowed option', () => {
    const { result } = renderHook(() => useAssessmentWorkspaceStore());
    [5, 10, 15, 20].forEach((n) => {
      act(() => { result.current.updateAiSettings({ questionCount: n }); });
      expect(result.current.aiSettings.questionCount).toBe(n);
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('assessmentWorkspace.store – resetWorkspace', () => {
  it('restores all fields to initial defaults', () => {
    const { result } = renderHook(() => useAssessmentWorkspaceStore());
    act(() => {
      result.current.setMode('handwritten');
      result.current.setCenterTab('history');
      result.current.updateAiSettings({ subject: 'Maths', questionCount: 5 });
    });

    // Verify mutations took effect
    expect(result.current.mode).toBe('handwritten');
    expect(result.current.centerTab).toBe('history');
    expect(result.current.aiSettings.subject).toBe('Maths');

    act(() => { result.current.resetWorkspace(); });

    expect(result.current.mode).toBe('document');
    expect(result.current.centerTab).toBe('preview');
    expect(result.current.aiSettings.subject).toBe('');
    expect(result.current.aiSettings.questionCount).toBe(20);
    expect(result.current.aiSettings.difficulty).toBe('medium');
  });
});
