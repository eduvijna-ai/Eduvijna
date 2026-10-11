/** Score/time helpers shared by quiz + worksheet persisted result normalization. */

export function resolvePersistedScore(
  attendedScore: number | null | undefined,
  logData: Record<string, unknown> | null | undefined,
): number | null {
  if (attendedScore != null) {
    return Number(attendedScore);
  }
  return scoreFromUnknown(logData?.score);
}

export function resolvePersistedTimeSpentSeconds(
  attendedSeconds: number | null | undefined,
  logData: Record<string, unknown> | null | undefined,
): number | null {
  if (typeof attendedSeconds === 'number' && Number.isFinite(attendedSeconds)) {
    return attendedSeconds;
  }
  if (typeof logData?.time_spent_seconds === 'number' && Number.isFinite(logData.time_spent_seconds)) {
    return logData.time_spent_seconds;
  }
  if (typeof logData?.duration === 'number' && Number.isFinite(logData.duration)) {
    return logData.duration;
  }
  return null;
}

function scoreFromUnknown(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
