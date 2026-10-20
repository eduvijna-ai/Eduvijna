import { clearCacheEntry, clearCacheEntriesWithPrefix } from './cacheService';

/**
 * Invalidate cached student quiz list entries after a successful submission.
 * Does not assume a single limit/offset — clears by prefix.
 */
export async function invalidateStudentQuizCaches(options?: {
  classroomId?: string | null;
  sessionId?: string | null;
}): Promise<void> {
  await clearCacheEntriesWithPrefix('student_quizzes_');

  const { classroomId, sessionId } = options ?? {};
  if (classroomId) {
    await clearCacheEntry(`student_quizzes_${classroomId}_1000_0`).catch(() => undefined);
    await clearCacheEntry(`student_quizzes_${classroomId}_100_0`).catch(() => undefined);
  }
  if (sessionId) {
    await clearCacheEntry(`student_quizzes_${sessionId}_1000_0`).catch(() => undefined);
    await clearCacheEntry(`student_quizzes_${sessionId}_100_0`).catch(() => undefined);
  }
  await clearCacheEntry('student_quizzes_all_1000_0').catch(() => undefined);
  await clearCacheEntry('student_quizzes_all_100_0').catch(() => undefined);
}
