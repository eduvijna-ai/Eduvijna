/**
 * Shared assessment classroom inventory hook.
 * Teacher/instructor: class_wise_students. Student: view_type=classes.
 */

import { useEffect, useMemo } from 'react';
import {
  buildAssessmentClassroomScopeFromUser,
  useAssessmentClassroomsStore,
} from '../store/assessmentClassrooms.store';
import { assessmentClassroomsToOptions } from '../services/assessmentClassrooms.service';
import { useUserStore } from '../store/user.store';

export function useAssessmentClassrooms(options?: { refreshOnMount?: boolean }) {
  const user = useUserStore((s) => s.user);
  const schoolId = useUserStore((s) => s.schoolId);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);

  const {
    classrooms,
    count,
    source,
    loading,
    unavailable,
    error,
    contractNote,
    ensureLoaded,
    refresh,
  } = useAssessmentClassroomsStore();

  const scope = useMemo(
    () => buildAssessmentClassroomScopeFromUser(user, schoolId),
    [user, schoolId],
  );

  useEffect(() => {
    if (!isAuthenticated || !scope) return;
    if (options?.refreshOnMount) {
      void refresh(scope);
    } else {
      void ensureLoaded(scope);
    }
  }, [
    isAuthenticated,
    scope?.userId,
    scope?.role,
    scope?.schoolId,
    scope?.apiEnv,
    ensureLoaded,
    refresh,
    options?.refreshOnMount,
  ]);

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
    refresh: () => (scope ? refresh(scope) : Promise.resolve()),
  };
}
