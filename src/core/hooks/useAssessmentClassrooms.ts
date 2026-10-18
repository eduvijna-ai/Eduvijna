/**
 * Shared assessment classroom inventory hook.
 * Teacher/instructor: class_wise_students. Student: view_type=classes.
 *
 * Stable callbacks — callers must not put a freshly-allocated refresh wrapper
 * into effect dependency arrays (that caused Analytics reload loops).
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  buildAssessmentClassroomScopeFromUser,
  useAssessmentClassroomsStore,
} from '../store/assessmentClassrooms.store';
import {
  assessmentClassroomScopeKey,
  assessmentClassroomsToOptions,
} from '../services/assessmentClassrooms.service';
import { useUserStore } from '../store/user.store';

export function useAssessmentClassrooms(options?: { refreshOnMount?: boolean }) {
  const user = useUserStore((s) => s.user);
  const schoolId = useUserStore((s) => s.schoolId);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);

  const classrooms = useAssessmentClassroomsStore((s) => s.classrooms);
  const count = useAssessmentClassroomsStore((s) => s.count);
  const source = useAssessmentClassroomsStore((s) => s.source);
  const loading = useAssessmentClassroomsStore((s) => s.loading);
  const unavailable = useAssessmentClassroomsStore((s) => s.unavailable);
  const error = useAssessmentClassroomsStore((s) => s.error);
  const contractNote = useAssessmentClassroomsStore((s) => s.contractNote);
  const ensureLoaded = useAssessmentClassroomsStore((s) => s.ensureLoaded);
  const refreshStore = useAssessmentClassroomsStore((s) => s.refresh);

  const scope = useMemo(
    () => buildAssessmentClassroomScopeFromUser(user, schoolId),
    // Primitive fields only — full user object identity changes every auth enrich.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, user?.role, schoolId],
  );
  const scopeKey = scope ? assessmentClassroomScopeKey(scope) : null;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  const refreshOnMount = options?.refreshOnMount === true;

  useEffect(() => {
    if (!isAuthenticated || !scope) return;
    if (refreshOnMount) {
      void refreshStore(scope);
    } else {
      void ensureLoaded(scope);
    }
  }, [isAuthenticated, scopeKey, ensureLoaded, refreshStore, refreshOnMount, scope]);

  const refresh = useCallback(async () => {
    const current = scopeRef.current;
    if (!current) return;
    await refreshStore(current);
  }, [refreshStore]);

  const optionsList = useMemo(
    () => assessmentClassroomsToOptions(classrooms),
    [classrooms],
  );

  return {
    classrooms,
    count,
    options: optionsList,
    source,
    loading,
    unavailable,
    error,
    contractNote,
    refresh,
  };
}
