/**
 * Generation token for deep-link / open-quiz validation.
 * Cancel, Home, Dashboard, or a newer open must invalidate in-flight work so
 * stale API responses cannot navigate to QuizTakingScreen / QuizResultsScreen.
 */

let openQuizGeneration = 0;

/** Begin a new open-quiz validation; returns the generation id for this request. */
export function beginOpenQuizRequest(): number {
  openQuizGeneration += 1;
  return openQuizGeneration;
}

/** Invalidate any in-flight open-quiz validation (Cancel / leave loading). */
export function cancelPendingOpenQuizRequest(): void {
  openQuizGeneration += 1;
}

export function isOpenQuizRequestCurrent(generation: number): boolean {
  return generation === openQuizGeneration;
}

/** Test helper — reset between suites. */
export function __resetOpenQuizRequestGuardForTests(): void {
  openQuizGeneration = 0;
}
