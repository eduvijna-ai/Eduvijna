const SENSITIVE_KEYS =
  /^(access_token|refresh_token|token|password|email|phone|full_name|first_name|last_name|name|username|student_id|user_id|created_by|school_id|school_name|address|bio|avatar|avatar_url|profile_image|profile_picture|birth_date|date_of_birth|dob|instructor|subject|classroom_name|topic|quiz_name|summary|questions|file_name|.*_token|.*password.*|id|role_id|board_id|grade_id)$/i;

const PII_VALUE_PATTERNS = [
  /^https?:\/\/.+\/(avatar|profile|users)\//i,
  /@.+\..+/,
];

const RESOURCE_REF_KEYS = new Set([
  'session_id',
  'sessionId',
  'classroom_id',
  'classroomId',
  'class_id',
  'classId',
  'classid',
  'quiz_id',
  'quizId',
]);

function isResourceRefKey(key) {
  return RESOURCE_REF_KEYS.has(key);
}

export function redactScalarValue(value) {
  if (value == null) return value;
  if (typeof value === 'string') {
    if (PII_VALUE_PATTERNS.some((re) => re.test(value))) {
      return '[redacted]';
    }
    return redactFreeText(value);
  }
  return value;
}

export function redactValue(key, value) {
  if (value == null) return value;
  if (SENSITIVE_KEYS.test(String(key))) {
    if (typeof value === 'string' && value.length <= 4) return '[redacted]';
    if (typeof value === 'number') return '[redacted-id]';
    return '[redacted]';
  }
  return redactScalarValue(value);
}

export function redactDeep(input, depth = 0) {
  if (depth > 12) return '[truncated-depth]';
  if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') {
    return redactScalarValue(input);
  }
  if (Array.isArray(input)) {
    return input.map((item) => redactDeep(item, depth + 1));
  }
  if (input && typeof input === 'object') {
    const out = {};
    for (const [key, value] of Object.entries(input)) {
      if (isResourceRefKey(key)) {
        out[key] =
          typeof value === 'string' || typeof value === 'number'
            ? `ref:${hashString(String(value))}`
            : '[redacted]';
        continue;
      }
      if (SENSITIVE_KEYS.test(key)) {
        out[key] = redactValue(key, value);
        continue;
      }
      if (typeof value === 'string' && value.length > 200) {
        out[key] = '[omitted-blob]';
        continue;
      }
      out[key] = redactDeep(value, depth + 1);
    }
    return out;
  }
  return input;
}

function redactFreeText(value) {
  if (typeof value !== 'string' || !value) return value;
  return value.replace(/demo_[a-z0-9_]+/gi, '[redacted-user]');
}

function hashString(value) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
