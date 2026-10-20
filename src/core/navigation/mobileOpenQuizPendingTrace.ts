/**
 * Development-only correlated trace for signed-out openquiz continuation (no secrets).
 */
const PREFIX = '[OPEN_QUIZ_PENDING]';

export type OpenQuizPendingTraceEvent =
  | 'uri_parsed'
  | 'pending_queued'
  | 'pending_hydrated'
  | 'pending_cleared'
  | 'pending_consume_start'
  | 'pending_consume_done'
  | 'pending_consume_failed'
  | 'auth_hydrated'
  | 'auth_nav_ready'
  | 'resume_dispatch'
  | 'handle_open_quiz_enter'
  | 'navigation_action';

export function traceOpenQuizPending(
  event: OpenQuizPendingTraceEvent,
  detail: Record<string, string | number | boolean | null | undefined>,
): void {
  if (!__DEV__) return;
  const safe = Object.fromEntries(
    Object.entries(detail).filter(([, v]) => v !== undefined),
  );
  console.log(PREFIX, event, JSON.stringify(safe));
}
