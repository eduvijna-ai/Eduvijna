const LMS_CLASS_ID = /^class_[0-9a-f]{8}$/i;

export function isOpaqueClassroomId(value: string): boolean {
  return LMS_CLASS_ID.test(value.trim());
}

/**
 * Never show raw LMS classroom ids as human-readable names.
 */
export function resolveClassroomDisplayName(
  classId: string,
  options?: {
    recordName?: string | null;
    lookup?: Map<string, string>;
  },
): string {
  const recordName = options?.recordName?.trim();
  if (recordName && recordName !== classId && !isOpaqueClassroomId(recordName)) {
    return recordName;
  }

  const fromLookup = options?.lookup?.get(classId)?.trim();
  if (fromLookup) {
    return fromLookup;
  }

  return 'Unknown Class';
}
