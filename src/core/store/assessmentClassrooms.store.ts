/**
 * Assessment classroom inventory store — shared by Home KPI, ClassesList,
 * Assessments filters, Analytics selectors, and ShareQuizModal.
 */

import { create } from 'zustand';
import { API_BASE_URL } from '../api/config';
import {
  assessmentClassroomScopeKey,
  assessmentClassroomsToOptions,
  canApplyAssessmentClassroomsResult,
  invalidateAssessmentClassroomsLoads,
  loadAssessmentClassrooms,
  usesTeacherAssessmentClassroomPath,
  type AssessmentClassroom,
  type AssessmentClassroomScope,
} from '../services/assessmentClassrooms.service';
import { useUserStore } from './user.store';

function resolveApiEnv(): string {
  try {
    return String(API_BASE_URL || '').trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

export function buildAssessmentClassroomScopeFromUser(user: {
  id?: string | number;
  role?: string | null;
} | null | undefined, schoolId?: string | number | null): AssessmentClassroomScope | null {
  if (!user?.id) return null;
  return {
    apiEnv: resolveApiEnv(),
    userId: String(user.id),
    role: String(user.role || ''),
    schoolId: schoolId ?? null,
  };
}

interface AssessmentClassroomsState {
  scopeKey: string | null;
  classrooms: AssessmentClassroom[];
  count: number;
  source: 'class_wise_students' | 'classes' | null;
  loading: boolean;
  /** True when last fetch failed; prior classrooms/count preserved when available. */
  unavailable: boolean;
  error: string | null;
  lastFetched: number | null;
  contractNote: string | null;

  ensureLoaded: (scope: AssessmentClassroomScope) => Promise<void>;
  refresh: (scope: AssessmentClassroomScope) => Promise<void>;
  reset: () => void;
}

const initialState = {
  scopeKey: null as string | null,
  classrooms: [] as AssessmentClassroom[],
  count: 0,
  source: null as 'class_wise_students' | 'classes' | null,
  loading: false,
  unavailable: false,
  error: null as string | null,
  lastFetched: null as number | null,
  contractNote: null as string | null,
};

/** Monotonic id so superseded refreshes cannot write finally/failure into a newer scope. */
let refreshEpoch = 0;

export const useAssessmentClassroomsStore = create<AssessmentClassroomsState>((set, get) => ({
  ...initialState,

  ensureLoaded: async (scope) => {
    const scopeKey = assessmentClassroomScopeKey(scope);
    const state = get();
    // Already have a successful complete inventory for this scope — do not refetch.
    if (
      state.scopeKey === scopeKey &&
      state.lastFetched != null &&
      !state.unavailable &&
      state.source != null &&
      !state.loading
    ) {
      return;
    }
    // In-flight load for same scope — coalesce via service; avoid stacking store refreshes.
    if (state.loading && state.scopeKey === scopeKey) {
      return;
    }
    await get().refresh(scope);
  },

  refresh: async (scope) => {
    const scopeKey = assessmentClassroomScopeKey(scope);
    const teacherPath = usesTeacherAssessmentClassroomPath(scope.role);
    const contractNote = teacherPath
      ? null
      : 'Student inventory uses view_type=classes; class_wise_students is not authorized for students.';
    const prev = get();
    const sameScope = prev.scopeKey === scopeKey;
    const hadAuthoritative =
      sameScope && prev.source != null && prev.classrooms.length >= 0 && prev.lastFetched != null;
    const epoch = ++refreshEpoch;

    if (!sameScope) {
      // Never display previous-scope inventory under the new scopeKey.
      set({
        scopeKey,
        classrooms: [],
        count: 0,
        source: null,
        loading: true,
        unavailable: false,
        error: null,
        lastFetched: null,
        contractNote,
      });
    } else {
      set({
        // Soft loading when same-scope content already visible — consumers should not blank UI.
        loading: !hadAuthoritative,
        error: null,
        unavailable: false,
        scopeKey,
        contractNote,
      });
    }

    const result = await loadAssessmentClassrooms(scope, {
      getCurrentScope: () => {
        const user = useUserStore.getState().user;
        const schoolId = useUserStore.getState().schoolId;
        return buildAssessmentClassroomScopeFromUser(user, schoolId);
      },
    });

    // Superseded by a newer refresh (scope switch / force) — do not touch state.
    if (epoch !== refreshEpoch) {
      return;
    }

    if (!canApplyAssessmentClassroomsResult(result, () => {
      const user = useUserStore.getState().user;
      const schoolId = useUserStore.getState().schoolId;
      return buildAssessmentClassroomScopeFromUser(user, schoolId);
    })) {
      // Only clear loading if we still own this scope.
      if (get().scopeKey === scopeKey && epoch === refreshEpoch) {
        set({ loading: false });
      }
      return;
    }

    if (result.kind === 'ok') {
      set({
        scopeKey: result.scopeKey,
        classrooms: result.classrooms,
        count: result.count,
        source: result.source,
        loading: false,
        unavailable: false,
        error: null,
        lastFetched: Date.now(),
        contractNote,
      });
      return;
    }

    // Failure: preserve only same-scope prior from the service map — never prior-scope store rows.
    const prior = result.prior;
    set({
      scopeKey: result.scopeKey,
      classrooms: prior ?? [],
      count: prior ? prior.length : 0,
      source: prior
        ? get().source ?? (teacherPath ? 'class_wise_students' : 'classes')
        : null,
      loading: false,
      unavailable: true,
      error: result.error,
      lastFetched: prior ? get().lastFetched : null,
      contractNote,
    });
  },

  reset: () => {
    refreshEpoch += 1;
    invalidateAssessmentClassroomsLoads();
    set({ ...initialState });
  },
}));

export function getAssessmentClassroomOptions(): Array<{
  classroom_id: string;
  classroom_name: string;
}> {
  return assessmentClassroomsToOptions(useAssessmentClassroomsStore.getState().classrooms);
}

export { assessmentClassroomsToOptions };
