const SENSITIVE_KEYS =
  /^(access_token|refresh_token|token|password|email|phone|full_name|username|student_id|user_id|created_by|.*_id)$/i;

export function redactValue(key, value) {
  if (value == null) return value;
  if (SENSITIVE_KEYS.test(String(key))) {
    if (typeof value === 'string' && value.length <= 4) return '[redacted]';
    if (typeof value === 'number') return '[redacted-id]';
    return '[redacted]';
  }
  return value;
}

export function redactDeep(input, depth = 0) {
  if (depth > 12) return '[truncated-depth]';
  if (Array.isArray(input)) {
    return input.map((item) => redactDeep(item, depth + 1));
  }
  if (input && typeof input === 'object') {
    const out = {};
    for (const [key, value] of Object.entries(input)) {
      if (key === 'session_id' || key === 'classroom_id' || key === 'class_id') {
        out[key] = typeof value === 'string' ? `hash:${hashString(value)}` : '[redacted]';
        continue;
      }
      if (SENSITIVE_KEYS.test(key)) {
        out[key] = redactValue(key, value);
        continue;
      }
      out[key] = redactDeep(value, depth + 1);
    }
    return out;
  }
  return input;
}

function hashString(value) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
