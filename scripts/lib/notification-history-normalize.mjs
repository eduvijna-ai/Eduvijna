export function normalizeNotificationHistoryPayload(data) {
  if (data == null || typeof data !== 'object' || Array.isArray(data) === false && data.parseError) {
    if (data?.parseError) {
      return { ok: false, responseShape: 'parse_error', error: String(data.parseError) };
    }
    return { ok: false, responseShape: 'invalid', error: 'not_object' };
  }
  if (Array.isArray(data)) {
    return {
      ok: true,
      notifications: data,
      total: data.length,
      responseShape: 'array_root',
    };
  }
  if (Array.isArray(data.notifications)) {
    return {
      ok: true,
      notifications: data.notifications,
      total: Number(data.total ?? data.notifications.length),
      responseShape: 'wrapped_notifications',
    };
  }
  if (Array.isArray(data.data)) {
    return {
      ok: true,
      notifications: data.data,
      total: Number(data.total ?? data.data.length),
      responseShape: 'wrapped_data',
    };
  }
  return { ok: false, responseShape: 'unknown', error: 'unrecognized_shape' };
}
