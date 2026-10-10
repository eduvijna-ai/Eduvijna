import { useEffect, useRef } from 'react';
import {
  AssignmentClockQuiz,
  collectAssignmentBoundaryTimes,
} from '../utils/reapplyStudentAssignmentClassification';

const FALLBACK_INTERVAL_MS = 30_000;

/**
 * Fires `onTick` when an assignment start/end boundary passes so UI can reclassify without pull-to-refresh.
 */
export function useStudentAssignmentBoundaryClock(
  quizzes: AssignmentClockQuiz[],
  onTick: () => void,
): void {
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    const fire = () => onTickRef.current();
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const nowMs = Date.now();
    for (const boundaryMs of collectAssignmentBoundaryTimes(quizzes, new Date()).slice(0, 8)) {
      timeouts.push(setTimeout(fire, Math.max(0, boundaryMs - nowMs) + 150));
    }
    const intervalId = setInterval(fire, FALLBACK_INTERVAL_MS);
    return () => {
      clearInterval(intervalId);
      timeouts.forEach(clearTimeout);
    };
  }, [quizzes]);
}
